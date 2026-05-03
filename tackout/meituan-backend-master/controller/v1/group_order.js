/* eslint-disable no-console */
import BaseClass from '../../prototype/baseClass'
import { createRoom, joinRoom, updateItem, getRoom, checkoutRoom } from '../../utils/groupOrders'
import OrderModel from '../../models/v1/order'
import RestaurantModel from '../../models/v1/restaurant'
import AddressModel from '../../models/admin/address'
import FoodsModel from '../../models/v1/foods'
import AdminModel from '../../models/admin/admin'

class GroupOrderController extends BaseClass {
  constructor() {
    super()
    this.create = this.create.bind(this)
    this.join = this.join.bind(this)
    this.updateItem = this.updateItem.bind(this)
    this.get = this.get.bind(this)
    this.checkout = this.checkout.bind(this)
  }

  // POST /v1/group_order — 创建拼单房间
  async create(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })
    const { restaurant_id } = req.body
    if (!restaurant_id) return res.send({ status: -1, message: '缺少 restaurant_id' })

    const room_id = createRoom(user_id, restaurant_id)
    res.send({
      status: 200,
      data: { room_id, share_link: `#/group_order?room=${room_id}` }
    })
  }

  // POST /v1/group_order/:id/join — 加入房间
  async join(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })
    const { id } = req.params
    const result = joinRoom(id, user_id)
    if (!result.ok) return res.send({ status: -1, message: result.error })
    res.send({ status: 200, data: result.room })
  }

  // PUT /v1/group_order/:id/item — 更新菜品
  async updateItem(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })
    const { id } = req.params
    const { food_id, qty, name, price } = req.body
    if (!food_id) return res.send({ status: -1, message: '缺少 food_id' })
    const result = updateItem(id, user_id, food_id, qty, name, price)
    if (!result.ok) return res.send({ status: -1, message: result.error })
    res.send({ status: 200, data: result.room })
  }

  // GET /v1/group_order/:id — 查看房间状态
  async get(req, res) {
    const room = getRoom(req.params.id)
    if (!room) return res.send({ status: -1, message: '房间不存在或已过期' })
    res.send({ status: 200, data: room })
  }

  // POST /v1/group_order/:id/checkout — 发起人确认下单
  async checkout(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) return res.send({ status: -1, message: '未登录' })
    const { id } = req.params
    const { address_id, remark = '' } = req.body

    const result = checkoutRoom(id, user_id)
    if (!result.ok) return res.send({ status: -1, message: result.error })

    if (!result.foods.length) return res.send({ status: -1, message: '还没有人选菜' })

    try {
      // 查询必要信息并生成合并订单
      const [restaurant, address, adminUser, order_id] = await Promise.all([
        RestaurantModel.findOne({ id: Number(result.restaurant_id) }).lean(),
        AddressModel.findById(address_id).lean(),
        AdminModel.findOne({ id: Number(user_id) }).lean(),
        this.getId('order_id')
      ])

      if (!restaurant) return res.send({ status: -1, message: '餐馆不存在' })
      if (!address) return res.send({ status: -1, message: '收货地址不存在' })

      // 批量查菜品价格（按 food_id）
      const foodIds = result.foods.map(f => Number(f.food_id))
      const foodDocs = await FoodsModel.find({ id: { $in: foodIds } }).lean()
      const foodMap = {}
      foodDocs.forEach(f => { foodMap[f.id] = f })

      // 构建 order_foods 并计算总价
      const order_foods = result.foods.map(f => {
        const doc = foodMap[Number(f.food_id)] || {}
        return {
          food_id: f.food_id,
          num: f.qty,
          name: doc.name || f.name,
          price: doc.price || f.price,
          pic_url: doc.pic_url || ''
        }
      })
      const total_price = order_foods.reduce((s, f) => s + f.price * f.num, 0)

      const orderData = {
        id: order_id,
        user_id: adminUser ? adminUser._id : null,
        restaurant_id: result.restaurant_id,
        restaurant: restaurant._id,
        address: address._id,
        foods: order_foods,
        total_price: +total_price.toFixed(2),
        shipping_fee: restaurant.shipping_fee || 0,
        remark: remark || '【拼单】' + remark,
        status: '未支付',
        code: 0,
        is_group_order: true,
        create_time_timestamp: Math.floor(Date.now() / 1000)
      }

      const order = new OrderModel(orderData)
      await order.save()

      res.send({
        status: 200,
        message: '拼单成功！',
        data: { order_id, total_price: orderData.total_price, member_count: Object.keys(result.foods).length }
      })
    } catch (err) {
      console.log('group_order checkout error', err.message)
      res.send({ status: -1, message: '拼单结算失败' })
    }
  }
}

export default new GroupOrderController()
