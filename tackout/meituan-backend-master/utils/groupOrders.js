/* eslint-disable no-console */
/**
 * utils/groupOrders.js — 内存 Map 拼单房间管理
 * 房间自动 30 分钟过期，每 5 分钟清理一次
 */

const rooms = new Map()

function genRoomId() {
  return 'GRP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase()
}

/**
 * 创建拼单房间
 */
function createRoom(creator_id, restaurant_id) {
  const room_id = genRoomId()
  rooms.set(room_id, {
    room_id,
    creator_id: Number(creator_id),
    restaurant_id: Number(restaurant_id),
    members: {
      [creator_id]: { user_id: Number(creator_id), items: {} }
    },
    status: 'open',       // open → checked_out
    created_at: Date.now()
  })
  console.log(`[拼单] 房间创建: ${room_id}, 餐馆: ${restaurant_id}`)
  return room_id
}

/**
 * 加入房间
 */
function joinRoom(room_id, user_id) {
  const room = rooms.get(room_id)
  if (!room || room.status !== 'open') return { ok: false, error: room ? 'ROOM_CLOSED' : 'NOT_FOUND' }
  if (!room.members[user_id]) {
    room.members[user_id] = { user_id: Number(user_id), items: {} }
  }
  return { ok: true, room: sanitizeRoom(room) }
}

/**
 * 更新成员菜品
 */
function updateItem(room_id, user_id, food_id, qty, name, price) {
  const room = rooms.get(room_id)
  if (!room || room.status !== 'open') return { ok: false, error: 'ROOM_NOT_OPEN' }
  if (!room.members[user_id]) return { ok: false, error: 'NOT_IN_ROOM' }

  const items = room.members[user_id].items
  if (qty <= 0) {
    delete items[food_id]
  } else {
    items[food_id] = { food_id, qty: Number(qty), name, price: Number(price) }
  }
  return { ok: true, room: sanitizeRoom(room) }
}

/**
 * 获取房间状态
 */
function getRoom(room_id) {
  const room = rooms.get(room_id)
  if (!room) return null
  return sanitizeRoom(room)
}

/**
 * 结算房间：合并所有成员菜品，返回合并后的 foods 数组
 */
function checkoutRoom(room_id, creator_id) {
  const room = rooms.get(room_id)
  if (!room) return { ok: false, error: 'NOT_FOUND' }
  if (room.creator_id !== Number(creator_id)) return { ok: false, error: 'NOT_CREATOR' }
  if (room.status !== 'open') return { ok: false, error: 'ALREADY_CLOSED' }

  // 合并所有人的菜品
  const merged = {}
  for (const member of Object.values(room.members)) {
    for (const [food_id, item] of Object.entries(member.items)) {
      if (merged[food_id]) {
        merged[food_id].qty += item.qty
      } else {
        merged[food_id] = { ...item }
      }
    }
  }

  room.status = 'checked_out'
  return {
    ok: true,
    restaurant_id: room.restaurant_id,
    foods: Object.values(merged)
  }
}

function sanitizeRoom(room) {
  return {
    room_id: room.room_id,
    creator_id: room.creator_id,
    restaurant_id: room.restaurant_id,
    status: room.status,
    members: Object.values(room.members).map(m => ({
      user_id: m.user_id,
      items: Object.values(m.items)
    })),
    created_at: room.created_at
  }
}

// 每 5 分钟清理 30 分钟过期的房间
setInterval(() => {
  const now = Date.now()
  let cleaned = 0
  for (const [id, room] of rooms.entries()) {
    if (now - room.created_at > 30 * 60 * 1000) {
      rooms.delete(id)
      cleaned++
    }
  }
  if (cleaned) console.log(`[拼单] 清理 ${cleaned} 个过期房间`)
}, 5 * 60 * 1000)

export { createRoom, joinRoom, updateItem, getRoom, checkoutRoom }
