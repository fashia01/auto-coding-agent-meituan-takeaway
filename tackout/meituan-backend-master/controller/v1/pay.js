import md5 from 'blueimp-md5'
import BaseClass from '../../prototype/baseClass'
import OrderModel from '../../models/v1/order'
import RestaurantModel from '../../models/v1/restaurant'
import PayModel from '../../models/v1/pay'
import UserCoupon from '../../models/v1/user_coupon'
import config from '../../config'
import { writeTasteLog } from './taste'
import fetch from 'node-fetch';
import FormData from 'form-data';
import { broadcast } from '../../utils/orderSubscriptions'

class Pay extends BaseClass {
    constructor() {
        super();
        this.appkey = '55388a820c3644aa8eaef76f9f89ecdb'
        this.appSceret = '8254867c1af642a39f473a2341b91a70'
        this.initPay = this.initPay.bind(this)
        this.payNotice = this.payNotice.bind(this)
    }

    //准备支付
    async initPay(req, res, next) {
        //传入订单 和支付方式
        let {order_id, payType = '1', method = 'trpay.trade.create.scan'} = req.body;
        let user_id = req.session.admin_id || req.session.user_id;
        if (!order_id) {
            res.send({
                status: -1,
                message: '初始化支付失败参数有误'
            })
            return;
        }
        try {
            let pay = await PayModel.findOne({order_id});
            if (pay && pay.code === 200) {
                res.send({
                    status: 302,
                    message: '该订单已完成支付！'
                })
                return;
            }
            if (pay) {      //如果该订单已经提交 但是没有支付 重新初始化订单
                pay.remove();
            }
            let id = await this.getId('pay_id');

            // ==================== 模拟支付模式 ====================
            if (config.mockPayment === true) {
                // 模拟支付：直接标记为已支付
                await saveDB({method: 'mock', id, order_id, payType, code: 200, status: '支付成功'});
                // 同时更新订单状态
                await OrderModel.updateOne({id: order_id}, {status: '支付成功', code: 200});
                // 标记优惠券已使用
                await markCouponUsed(order_id);
                // 启动订单状态机链式推进
                scheduleDelivery(order_id);

                // 返回模拟的二维码数据（实际不会被使用）
                res.send({
                    status: 1,
                    data: {
                        qrcode: 'mock_qrcode',
                        code_url: 'mock://payment/success',
                        outTradeNo: id + '',  // 返回支付ID用于监听状态
                        order_id: order_id
                    },
                    message: '模拟支付，请确认'
                });
                return;
            }
            // ==================== 真实支付模式 ====================

            let payuserid = user_id
            let payData = {
                amount: '1',       //这里都是设置1分钱支付
                tradeName: '外卖订单支付',  //商户自定义订单标题
                outTradeNo: id + '',   //商户自主生成的订单号
                payType: payType,    //支付渠道
                payuserid,            //商家支付id
                notifyUrl: config.notifyUrl, //服务器异步通知
                appkey: this.appkey,          //appKey
                method,
                timestamp: new Date().getTime() + '',
                version: '1.0'
            }
            let sign = ''
            if (method === 'trpay.trade.create.scan') {     //扫码支付
                sign = this.sign(payData);
                payData['sign'] = sign;
                let result = await this.scanPay(res, payData);
                if (result.code !== '0000') {
                    res.send({
                        status: -1,
                        message: '支付接口出错，请更改支付方式'
                    })
                    return;
                }
                await saveDB({method: 'scan', id, order_id, payType})
                res.send({
                    status: 1,
                    data: {...result, ...payData, order_id},
                    message: '获取二维码成功，请扫码支付'
                })
            } else {                                                             //调用app支付
                payData.synNotifyUrl = `${config.synNotifyUrl}/#/order_detail?id=${order_id}`;            //客户端同步跳转
                sign = this.sign(payData);
                payData['sign'] = sign;
                await saveDB({method: 'wap', id, order_id, payType, code: 0});
                res.send({
                    status: 200,
                    data: payData,
                    message: '调用app支付初始化成功'
                })
            }

            async function saveDB(obj) {
                let payType = obj.payType === '1' ? '支付宝' : '微信'
                // 默认状态为未支付，但可以通过obj.status覆盖
                let defaultStatus = obj.status || '未支付';
                let
                    save_db = {     //存入数据库数据
                        amount: 1,       //这里都是设置1分钱支付
                        tradeName: '外卖订单支付',  //商户自定义订单标题
                        payType,    //支付渠道
                        status: defaultStatus,
                        ...obj
                    }
                let init_pay = new PayModel(save_db);
                await init_pay.save();
            }
        } catch (err) {
            console.log('初始化支付失败', err);
            res.send({
                status: -1,
                message: '初始化支付失败'
            })
        }
    }

    //扫码支付
    async scanPay(res, payData) {
        let formData = new FormData();
        for (let key in payData) {
            formData.append(key, payData[key]);
        }
        let result = await fetch('http://pay.trsoft.xin/order/trpayGetWay', {
            method: 'POST',
            body: formData
        })
        return result = await result.json();
    }

    //生成签名
    sign(payData) {
        let keys = Object.keys(payData);
        keys = keys.sort();
        let string = '';
        for (let i = 0; i < keys.length; i++) {
            string = string + keys[i] + '=' + payData[keys[i]] + '&'
        }
        string = string + "appSceret=" + this.appSceret;
        return md5(string).toUpperCase();
    }

    //支付异步通知
    async payNotice(req, res, next) {
        let noticeData = req.body;
        console.log('noticeData', noticeData)
        try {
            let sign = noticeData.sign;
            delete noticeData.sign;
            let verifySign = this.sign(noticeData)
            console.log('verifySign === sign', verifySign === sign)
            if (verifySign === sign && noticeData.status === '2') {
                let pay = await PayModel.findOne({id: noticeData.outTradeNo});
                pay.status = '支付成功';
                pay.code = 200;
                let Order = await OrderModel.findOne({id: pay.order_id});
                Order.status = '支付成功';
                Order.code = 200;
                await pay.save();
                await Order.save();
                // 标记优惠券已使用
                await markCouponUsed(pay.order_id);
                res.send(200);
            }
        } catch (err) {
            console.log('支付失败', err);
        }
    }

    //扫码支付实时监听
    async listenStatus(req, res, next) {
        let outTradeNo = req.query.outTradeNo;
        try {
            let pay = await PayModel.findOne({id: outTradeNo});
            console.log('pay', pay)
            if (pay.code === 200) {
                res.send({
                    status: 200,
                    message: '支付完成'
                })
            } else {
                res.send({
                    status: -1,
                    message: '未支付'
                })
            }
        } catch (err) {
            console.log('监听扫码状态失败', err);
            res.send({
                status: -1,
                message: '监听状态失败'
            })
        }
    }

}

// 支付成功后标记优惠券为已使用
async function markCouponUsed(order_id) {
    try {
        const order = await OrderModel.findOne({ id: order_id })
        if (order && order.coupon_id) {
            await UserCoupon.updateOne(
                { id: order.coupon_id, status: 'unused' },
                { $set: { status: 'used', used_order_id: order_id } }
            )
        }
    } catch (err) {
        console.log('markCouponUsed error', err)
    }
}

// 订单状态机：链式 setTimeout 推进 paid→accepted→preparing→delivering→delivered
// 用 Map 存储各订单的 timer，供催单时重置
const orderTimers = new Map()

function scheduleDelivery(order_id) {
    const {
        ORDER_ACCEPT_DELAY   = 2000,
        ORDER_PREPARE_DELAY  = 30000,
        ORDER_DELIVER_DELAY  = 60000,
        ORDER_DONE_DELAY     = 120000
    } = config

    async function pushStatus(status) {
        const statusTextMap = {
            'accepted': '已接单，备餐中',
            'preparing': '骑手取餐中',
            'delivering': '骑手配送中',
            'delivered': '已送达'
        }
        try {
            const now = new Date()
            await OrderModel.updateOne(
                { id: order_id },
                {
                    $set: { status },
                    $push: { status_history: { status, time: now } }
                }
            )
            console.log(`[状态机] 订单 ${order_id} → ${status}`)
            // 状态变更后广播给所有订阅者
            const order = await OrderModel.findOne({ id: order_id }).lean()
            const eta_ms = order && order.estimated_delivery_time ? order.estimated_delivery_time.getTime() : null
            broadcast(order_id, {
                type: 'status_update',
                status,
                status_text: statusTextMap[status] || status,
                eta_ms
            })
            // 终态时发送 done 事件
            if (status === 'delivered' || status === 'cancelled') {
                broadcast(order_id, { type: 'done' })
            }
        } catch (err) {
            console.log(`[状态机] 更新状态失败: ${order_id} → ${status}`, err)
        }
    }

    // 清除旧计时器（催单重置时用）
    if (orderTimers.has(order_id)) {
        orderTimers.get(order_id).forEach(t => clearTimeout(t))
    }

    // 预计送达时间：从餐馆 delivery_time_tip 解析配送分钟数（默认30分钟）
    async function calcEstimatedDelivery() {
        try {
            const order = await OrderModel.findOne({ id: order_id })
            let deliveryMinutes = 30  // 默认30分钟
            if (order && order.restaurant_id) {
                const restaurant = await RestaurantModel.findOne({ id: order.restaurant_id })
                if (restaurant && restaurant.delivery_time_tip) {
                    const match = restaurant.delivery_time_tip.match(/(\d+)/)
                    if (match) deliveryMinutes = parseInt(match[1], 10)
                }
            }
            const estimatedDelivery = new Date(Date.now() + deliveryMinutes * 60 * 1000)
            await OrderModel.updateOne({ id: order_id }, { $set: { estimated_delivery_time: estimatedDelivery } })
        } catch (err) {
            console.log('[状态机] 计算预计送达时间失败', err.message)
        }
    }
    calcEstimatedDelivery()

    const t1 = setTimeout(() => pushStatus('accepted'),   ORDER_ACCEPT_DELAY)
    const t2 = setTimeout(() => pushStatus('preparing'),  ORDER_ACCEPT_DELAY + ORDER_PREPARE_DELAY)
    const t3 = setTimeout(() => pushStatus('delivering'), ORDER_ACCEPT_DELAY + ORDER_PREPARE_DELAY + ORDER_DELIVER_DELAY)
    const t4 = setTimeout(async () => {
        await pushStatus('delivered')
        orderTimers.delete(order_id)
        // 订单完成后记录用户口味日志
        try {
            const order = await OrderModel.findOne({ id: order_id })
            if (order) {
                // 从所有菜品的 tag_list 合并标签（逗号分隔字符串 → 去重数组）
                const tagSet = new Set()
                const prices = []
                ;(order.foods || []).forEach(f => {
                    if (f.tag_list) {
                        f.tag_list.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t))
                    }
                    if (f.price) prices.push(Number(f.price))
                })
                const tags = [...tagSet]
                const priceRange = prices.length ? {
                    min: Math.min(...prices),
                    max: Math.max(...prices),
                    avg: +(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)
                } : null
                // user_id 存的是 ObjectId，需用数字 id；从 session 无法取得，用 order 的 restaurant_id 作为关联
                const userId = order.user_id ? order.user_id.toString() : null
                await writeTasteLog(userId, tags, priceRange, order.restaurant_id, 'order_delivered')
            }
        } catch (err) {
            console.log('[状态机] writeTasteLog on delivered failed:', err.message)
        }
    }, ORDER_ACCEPT_DELAY + ORDER_PREPARE_DELAY + ORDER_DELIVER_DELAY + ORDER_DONE_DELAY)

    orderTimers.set(order_id, [t1, t2, t3, t4])
}

// 导出 scheduleDelivery 和 orderTimers 供 order controller 调用（催单/取消）
export { scheduleDelivery, orderTimers }

export default new Pay();