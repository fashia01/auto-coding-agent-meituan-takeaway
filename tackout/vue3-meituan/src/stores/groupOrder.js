import { defineStore } from 'pinia'
import { ref } from 'vue'

// 拼单房间共享状态 store
// 用于菜单页加菜后，通知拼单页立即刷新（无需等待5秒轮询）
export const useGroupOrderStore = defineStore('groupOrder', () => {
  const lastUpdateTs = ref(0)
  const currentRoomId = ref('')

  function notifyUpdate(room_id) {
    currentRoomId.value = room_id
    lastUpdateTs.value = Date.now()
  }

  return { lastUpdateTs, currentRoomId, notifyUpdate }
})
