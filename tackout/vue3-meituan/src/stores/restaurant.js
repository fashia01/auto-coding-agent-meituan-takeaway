import { defineStore } from 'pinia'
import { getRestaurant } from '@/api/restaurant'

export const useRestaurantStore = defineStore('restaurant', {
  state: () => ({
    poi_info: {},
    restaurant_info: {},
  }),

  actions: {
    async fetchRestaurant(restaurant_id) {
      try {
        const response = await getRestaurant({ restaurant_id })
        this.poi_info = response.data.data || {}
      } catch (e) {
        console.error('获取餐馆信息失败', e)
      }
    },

    setPoi(poi_info) {
      this.poi_info = { ...poi_info }
    }
  }
})
