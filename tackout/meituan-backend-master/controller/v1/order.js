import BaseClass from "../../prototype/baseClass"
import OrderModel from "../../models/v1/order"
import RestaurantModel from '../../models/v1/restaurant'
import AddressModel from '../../models/admin/address'
import FoodsModel from '../../models/v1/foods'
import AdminModel from '../../models/admin/admin'
import UserCoupon from '../../models/v1/user_coupon'
import CouponTemplate from '../../models/v1/coupon'
import { scheduleDelivery, orderTimers } from './pay'
import { writeTasteLog } from './taste'
import { subscribe, unsubscribe, broadcast } from '../../utils/orderSubscriptions'
import { PointsAccount } from '../../models/v1/points'
import { deductPoints } from './points'

class Order extends BaseClass {
  constructor() {
    super();
    this.makeOrder = this.makeOrder.bind(this);
    this.getOrder = this.getOrder.bind(this);
    this.getOrders = this.getOrders.bind(this);
    this.makeWXOrder = this.makeWXOrder.bind(this);
    this.getMyRestaurantOrder = this.getMyRestaurantOrder.bind(this);
    this.urgeOrder = this.urgeOrder.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
    this.subscribeOrder = this.subscribeOrder.bind(this);
    this.getOrderProgress = this.getOrderProgress.bind(this);
  }

  //下订单
  async makeOrder(req, res, next) {
    let {restaurant_id, foods, address_id, remark = '', coupon_id, use_points = false} = req.body;
    let user_id = req.session.admin_id || req.session.user_id;
    if (!restaurant_id && !foods && !address_id) {
      res.send({
        status: -1,
        message: '下订单失败，参数有误'
      })
      return
    }
    try {
      let promiseArr = [];
      let restaurant = await RestaurantModel.findOne({id: restaurant_id});     //找到该餐馆
      promiseArr.push(this._calcTotalPrice(restaurant.shipping_fee, foods));       //计算总价格
      promiseArr.push(AddressModel.findOne({id: address_id}));                       //地址信息
      promiseArr.push(AdminModel.findOne({id: user_id}));               //用户信息
      promiseArr.push(this.getId('order_id'));                                    //订单号
      Promise.all(promiseArr).then(async (values) => {
        let total_price = values[0].total_price
        let discount_amount = 0

        // 核验并应用优惠券
        if (coupon_id) {
          const uc = await UserCoupon.findOne({ id: Number(coupon_id), user_id, status: 'unused' })
          if (uc) {
            const now = new Date()
            if (uc.expire_at > now) {
              const tpl = await CouponTemplate.findOne({ id: uc.template_id })
              if (tpl && total_price >= tpl.threshold) {
                if (tpl.discount_type === 'fixed') {
                  discount_amount = tpl.value
                } else if (tpl.discount_type === 'percent') {
                  discount_amount = +(total_price * (1 - tpl.value)).toFixed(2)
                } else if (tpl.discount_type === 'shipping') {
                  discount_amount = restaurant.shipping_fee || 0
                }
                discount_amount = Math.min(discount_amount, total_price)
              }
            }
          }
        }

        // 积分抵扣计算
        let points_discount = 0
        let points_to_deduct = 0
        if (use_points) {
          try {
            const uid = Number(values[2].id)
            const pointsAcc = await PointsAccount.findOne({ user_id: uid }).lean()
            if (pointsAcc && pointsAcc.balance >= 100) {
              const basePrice = +(total_price - discount_amount).toFixed(2)
              const maxDeduct = Math.floor(basePrice * 0.2)   // 最多抵扣20%
              const usablePoints = Math.min(pointsAcc.balance, maxDeduct * 100)
              points_discount = Math.floor(usablePoints / 100)  // 100分=1元
              points_to_deduct = points_discount * 100
            }
          } catch (e) { /* 积分查询失败不影响下单 */ }
        }

        let order_data = {
          total_price: +(total_price - discount_amount - points_discount).toFixed(2),
          foods: values[0].order_foods,
          address: values[1]._id,
          user_id: values[2]._id,
          id: values[3],
          remark,
          restaurant_id,
          status: '未支付',
          code: 0,
          restaurant: restaurant._id,
          shipping_fee: restaurant.shipping_fee,
          create_time_timestamp: Math.floor(new Date().getTime() / 1000),
          coupon_id: coupon_id ? Number(coupon_id) : undefined,
          discount_amount,
          points_discount
        }
        let order = new OrderModel(order_data);
        await order.save();
        // 扣除积分
        if (points_to_deduct > 0) {
          const uid = Number(values[2].id)
          deductPoints(uid, points_to_deduct, values[3])
        }
        res.send({
          status: 200,
          message: '提交订单成功，请尽快支付',
          order_id: values[3],
          total_price: order_data.total_price,
          discount_amount,
          points_discount
        })
      });
    } catch (err) {
      console.log('提交订单失败', err);
      res.send({
        status: -1,
        message: '提交订单失败'
      })
    }
  }

  // 下微信订单
  async makeWXOrder(req, res, next) {
    let {restaurant_id, foods, address_id, remark = ''} = req.body;

    if (!restaurant_id && !foods && !address_id) {
      res.send({
        status: -1,
        message: '下订单失败，参数有误'
      });
      return
    }
    try {
      let promiseArr = [];
      foods = JSON.parse(foods);
      let restaurant = await RestaurantModel.findOne({id: restaurant_id});     //找到该餐馆
      promiseArr.push(this._calcWXTotalPrice(restaurant.shipping_fee, foods));       //计算总价格
      promiseArr.push(AddressModel.findOne({id: address_id}));                       //地址信息
      promiseArr.push(AdminModel.findOne({id: req.session.user_id}));               //用户信息
      promiseArr.push(this.getId('order_id'));                                    //订单号
      Promise.all(promiseArr).then(async (values) => {
        let order_data = {
          total_price: values[0].total_price.toFixed(2),
          foods: values[0].order_foods,
          address: values[1]._id,
          user_id: values[2]._id,
          id: values[3],
          remark,
          restaurant_id,
          status: '已支付',
          code: 200,
          restaurant: restaurant._id,
          shipping_fee: restaurant.shipping_fee,
          create_time_timestamp: Math.floor(new Date().getTime() / 1000)
        };
        let order = new OrderModel(order_data);
        await order.save();
        res.send({
          status: 200,
          order_id: values[3],
          total_price: values[0].total_price.toFixed(2),
        })
      });
    } catch (err) {
      console.log('提交订单失败', err);
      res.send({
        status: -1,
        message: '提交订单失败'
      })
    }
  }

  //获取订单列表
  async getOrders(req, res, next) {
    let {offset = 0, limit = 10} = req.query;
    let user_id = req.session.admin_id || req.session.user_id;
    try {
      let userInfo = await AdminModel.findOne({id: user_id});
      console.log(userInfo)
      let orders = await OrderModel.find({
        user_id: userInfo._id
      }, '-_id').populate([
        {path: 'restaurant'},
        {path: 'address'}
      ]).limit(Number(limit)).sort({create_time_timestamp: -1}).skip(Number(offset));
      res.send({
        status: 200,
        data: orders,
        message: '获取我的订单列表成功'
      })
    } catch (err) {
      console.log('获取订单列表失败', err);
      res.send({
        status: -1,
        message: '获取订单列表失败'
      })
    }
  }

  // 商家获取餐馆订单

  async getMyRestaurantOrder(req, res, next) {
    let {offset = 0, limit = 10} = req.query;
    try {
      let userInfo = await AdminModel.findOne({id: req.session.admin_id});
      let restaurantInfo = await RestaurantModel.findOne({user_id: userInfo.id});
      console.log('userInfo', userInfo);
      let orders = await OrderModel.find({
        code: 200,
        restaurant_id: restaurantInfo.id
      }, '-_id').populate([
        {path: 'restaurant'},
        {path: 'address'}
      ]).limit(Number(limit)).sort({create_time_timestamp: -1}).skip(Number(offset));
      res.send({
        status: 200,
        data: orders,
        message: '获取我的订单列表成功'
      })
    } catch (err) {
      console.log('获取订单列表失败', err);
      res.send({
        status: -1,
        message: '获取订单列表失败'
      })
    }
  }

  //获取指定订单信息
  async getOrder(req, res, next) {
    const order_id = req.params.order_id;
    if (!order_id) {
      res.send({
        status: -1,
        message: '获取指定订单失败，参数有误!'
      });
      return;
    }
    try {
      let order = await OrderModel.findOne({id: order_id}).populate(
        [{path: 'restaurant'}, {path: 'address'}]);
      if (!order) {
        res.send({
          status: -1,
          message: '该订单不存在'
        })
        return;
      }
      await this._calcRemainTime(order);  //计算剩余时间
      res.send({
        status: 200,
        data: order,
        message: '获取指定订单成功'
      })
    } catch (err) {
      console.log('获取指定订单失败', err);
      res.send({
        status: -1,
        message: '获取指定订单失败'
      })
    }
  }

  //计算总价格
  async _calcTotalPrice(shipping_fee, foods) {
    let total_price = 0, order_foods = [];
    for (let i = 0; i < foods.length; i++) {
      let food = await FoodsModel.findOne({'skus.id': foods[i]['skus_id']});  //根据sku_id找到food
      let sku = food.skus.filter(sku => {
        return sku.id == foods[i]['skus_id']
      });

      order_foods.push({
        name: food['name'],
        price: sku[0]['price'],
        num: foods[i]['num'],
        total_price: Number(sku[0].price) * Number(foods[i]['num']),
        spec: sku[0]['spec'] || '',
        pic_url: food['pic_url']
      })
      total_price += Number(sku[0].price) * Number(foods[i]['num']).toFixed(2);
    }
    return {total_price, order_foods};
  }

  // 计算总价格
  async _calcWXTotalPrice(shipping_fee, foods) {
    let total_price = 0, order_foods = [];
    for (let i = 0; i < foods.length; i++) {
      let food = await FoodsModel.findOne({'id': foods[i]['id']});  //根据sku_id找到food
      let sku = food.skus;
      console.log('sku', sku);
      order_foods.push({
        name: food['name'],
        price: sku[0]['price'],
        num: foods[i]['num'],
        total_price: Number(sku[0].price) * Number(foods[i]['num']),
        spec: sku[0]['spec'] || '',
        pic_url: food['pic_url']
      });
      total_price += Number(sku[0].price) * Number(foods[i]['num']);
    }
    return {total_price, order_foods};
  }

  //计算剩余支付时间
  async _calcRemainTime(order) {
    if (order.code !== 200) {
      let fifteen_minutes = 60 * 15;      //15分钟转为秒数
      let now = Math.floor(new Date().getTime() / 1000);      //现在时刻
      let order_time = order.create_time_timestamp;       //订单时刻
      if (now - order_time >= fifteen_minutes) {
        order.status = '超过支付期限';
        order.code = 400;
        order.pay_remain_time = 0;
      } else {
        order.pay_remain_time = fifteen_minutes - (now - order_time);
      }
      await order.save();
      return order;
    }
  }

  // 商家确认订单
  async confirmOrder (req, res, next) {
    try {
      let {order_id} = req.body;
      await OrderModel.update({id: order_id}, {confirm: true});
      res.send({
        status: 200,
        message: '确定订单成功'
      })
    }catch (err) {
      res.send({
        status: -1,
        message: '确定订单失败'
      })
    }
  }

  // 3.2 催单：仅允许催一次，重置当前阶段的剩余计时器（加速20%）
  async urgeOrder(req, res, next) {
    const { order_id } = req.body
    if (!order_id) {
      return res.send({ status: -1, message: '参数有误' })
    }
    try {
      const order = await OrderModel.findOne({ id: order_id })
      if (!order) {
        return res.send({ status: -1, message: '订单不存在' })
      }
      if (order.urge_count >= 1) {
        return res.send({ status: -1, message: '每单只能催一次哦' })
      }
      const terminalStatuses = ['delivered', 'cancelled', 'DONE']
      if (terminalStatuses.includes(order.status)) {
        return res.send({ status: -1, message: '订单已完成或已取消，无法催单' })
      }
      // 更新催单次数
      await OrderModel.updateOne({ id: order_id }, { $inc: { urge_count: 1 } })
      // 重置状态机（加速：延迟缩短为原来的 50%）
      const {
        ORDER_ACCEPT_DELAY   = 2000,
        ORDER_PREPARE_DELAY  = 30000,
        ORDER_DELIVER_DELAY  = 60000,
        ORDER_DONE_DELAY     = 120000
      } = require('../../config')
      const speedFactor = 0.5
      const fakeConfig = {
        ORDER_ACCEPT_DELAY:  Math.round(ORDER_ACCEPT_DELAY  * speedFactor),
        ORDER_PREPARE_DELAY: Math.round(ORDER_PREPARE_DELAY * speedFactor),
        ORDER_DELIVER_DELAY: Math.round(ORDER_DELIVER_DELAY * speedFactor),
        ORDER_DONE_DELAY:    Math.round(ORDER_DONE_DELAY    * speedFactor),
      }
      // 清除旧计时器再以加速版重新调度
      if (orderTimers.has(order_id)) {
        orderTimers.get(order_id).forEach(t => clearTimeout(t))
        orderTimers.delete(order_id)
      }
      // 用加速参数重新调度（临时覆盖 config）
      const origConfig = Object.assign({}, require('../../config'))
      Object.assign(require('../../config'), fakeConfig)
      scheduleDelivery(order_id)
      Object.assign(require('../../config'), origConfig)

      res.send({ status: 200, message: '已催单，骑手加速配送中 🚀' })
    } catch (err) {
      console.log('urgeOrder error', err)
      res.send({ status: -1, message: '催单失败' })
    }
  }

  // 3.3 取消订单：非终态时允许取消，同时恢复优惠券
  async cancelOrder(req, res, next) {
    const { order_id } = req.body
    const user_id = req.session.admin_id || req.session.user_id
    if (!order_id) {
      return res.send({ status: -1, message: '参数有误' })
    }
    try {
      const order = await OrderModel.findOne({ id: order_id })
      if (!order) {
        return res.send({ status: -1, message: '订单不存在' })
      }
      const terminalStatuses = ['delivered', 'cancelled', 'DONE']
      if (terminalStatuses.includes(order.status)) {
        return res.send({ status: -1, message: '订单已完成或已取消，无法退款' })
      }
      const now = new Date()
      await OrderModel.updateOne(
        { id: order_id },
        {
          $set: { status: 'cancelled' },
          $push: { status_history: { status: 'cancelled', time: now } }
        }
      )
      // 清除状态机计时器
      if (orderTimers.has(order_id)) {
        orderTimers.get(order_id).forEach(t => clearTimeout(t))
        orderTimers.delete(order_id)
      }
      // 广播取消状态给 SSE 订阅者
      broadcast(order_id, { type: 'status_update', status: 'cancelled', status_text: '订单已取消', eta_ms: null })
      broadcast(order_id, { type: 'done' })
      // 若订单使用了优惠券，恢复为 unused
      if (order.coupon_id) {
        await UserCoupon.updateOne(
          { user_id, template_id: order.coupon_id, status: 'used', used_order_id: order_id },
          { $set: { status: 'unused', used_order_id: null } }
        )
      }
      // 取消订单写入负面口味信号
      try {
        const tagSet = new Set()
        ;(order.foods || []).forEach(f => {
          if (f.tag_list) f.tag_list.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tagSet.add(t))
        })
        const tags = [...tagSet]
        if (tags.length) writeTasteLog(String(user_id), tags, null, order.restaurant_id, 'order_cancelled')
      } catch (e) { /* 口味记录失败不影响主流程 */ }
      res.send({ status: 200, message: '订单已取消，退款将在1-3个工作日内到账' })
    } catch (err) {
      console.log('cancelOrder error', err)
      res.send({ status: -1, message: '取消订单失败' })
    }
  }

  // SSE 实时订阅订单状态
  async subscribeOrder(req, res, next) {
    const order_id = Number(req.params.order_id)
    if (!order_id) {
      return res.status(400).json({ status: -1, message: '参数有误' })
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const sendEvent = (data) => {
      try { res.write(`data: ${JSON.stringify(data)}\n\n`) } catch (e) { /* 连接已断开 */ }
    }

    // 注册连接
    subscribe(order_id, res)

    // 立即发送当前状态
    try {
      const order = await OrderModel.findOne({ id: order_id }).lean()
      if (order) {
        const statusTextMap = {
          '未支付': '等待支付', '支付成功': '等待接单', 'accepted': '已接单，备餐中',
          'preparing': '骑手取餐中', 'delivering': '骑手配送中', 'delivered': '已送达',
          'cancelled': '订单已取消'
        }
        sendEvent({
          type: 'status_update',
          status: order.status,
          status_text: statusTextMap[order.status] || order.status,
          eta_ms: order.estimated_delivery_time ? order.estimated_delivery_time.getTime() : null
        })
        // 终态不需要维持连接
        const terminalStatuses = ['delivered', 'cancelled', 'DONE']
        if (terminalStatuses.includes(order.status)) {
          sendEvent({ type: 'done' })
          res.end()
          return
        }
      }
    } catch (err) {
      console.log('[SSE] 获取初始状态失败:', err.message)
    }

    // 每 30 秒发送心跳
    const heartbeat = setInterval(() => {
      try { res.write('data: {"type":"heartbeat"}\n\n') } catch (e) { clearInterval(heartbeat) }
    }, 30000)

    // 5 分钟超时自动断开
    const timeout = setTimeout(() => {
      clearInterval(heartbeat)
      unsubscribe(order_id, res)
      try { sendEvent({ type: 'done' }); res.end() } catch (e) { /* ignore */ }
    }, 5 * 60 * 1000)

    // 客户端断开时清理
    req.on('close', () => {
      clearInterval(heartbeat)
      clearTimeout(timeout)
      unsubscribe(order_id, res)
    })
  }

  // 获取订单当前进度（供断线重连后快速同步）
  async getOrderProgress(req, res, next) {
    const order_id = Number(req.params.order_id)
    if (!order_id) {
      return res.send({ status: -1, message: '参数有误' })
    }
    try {
      const order = await OrderModel.findOne({ id: order_id }).lean()
      if (!order) {
        return res.send({ status: -1, message: '订单不存在' })
      }
      const statusTextMap = {
        '未支付': '等待支付', '支付成功': '等待接单', 'accepted': '已接单，备餐中',
        'preparing': '骑手取餐中', 'delivering': '骑手配送中', 'delivered': '已送达',
        'cancelled': '订单已取消'
      }
      res.send({
        status: 200,
        data: {
          status: order.status,
          status_text: statusTextMap[order.status] || order.status,
          estimated_delivery_time: order.estimated_delivery_time || null,
          status_history: order.status_history || []
        }
      })
    } catch (err) {
      console.log('getOrderProgress error', err)
      res.send({ status: -1, message: '获取进度失败' })
    }
  }
}

export default new Order();