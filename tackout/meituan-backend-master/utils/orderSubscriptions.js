/* eslint-disable no-console */
/**
 * orderSubscriptions.js
 * 订单 SSE 连接池管理
 * Map<order_id, Set<res>> 管理所有活跃的 SSE 长连接
 */

// Map<order_id(Number), Set<res>>
const subscriptions = new Map()

/**
 * 注册一个 SSE 连接
 * @param {number} order_id
 * @param {object} res - Express response 对象
 */
function subscribe(order_id, res) {
  const key = Number(order_id)
  if (!subscriptions.has(key)) {
    subscriptions.set(key, new Set())
  }
  subscriptions.get(key).add(res)
  console.log(`[SSE] 订单 ${key} 新增订阅，当前连接数: ${subscriptions.get(key).size}`)
}

/**
 * 移除一个 SSE 连接
 * @param {number} order_id
 * @param {object} res - Express response 对象
 */
function unsubscribe(order_id, res) {
  const key = Number(order_id)
  const set = subscriptions.get(key)
  if (set) {
    set.delete(res)
    if (set.size === 0) {
      subscriptions.delete(key)
    }
    console.log(`[SSE] 订单 ${key} 移除订阅，剩余连接数: ${set.size}`)
  }
}

/**
 * 向订阅该订单的所有连接广播事件
 * @param {number} order_id
 * @param {object} eventData - 事件数据对象，会被 JSON.stringify
 */
function broadcast(order_id, eventData) {
  const key = Number(order_id)
  const set = subscriptions.get(key)
  if (!set || set.size === 0) return

  const payload = `data: ${JSON.stringify(eventData)}\n\n`
  const toRemove = []

  set.forEach(res => {
    try {
      res.write(payload)
    } catch (err) {
      console.log(`[SSE] 广播失败，移除失效连接: ${err.message}`)
      toRemove.push(res)
    }
  })

  // 清理失效连接
  toRemove.forEach(res => set.delete(res))
  if (set.size === 0) subscriptions.delete(key)
}

export { subscribe, unsubscribe, broadcast }
