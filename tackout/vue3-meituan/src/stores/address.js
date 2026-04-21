import { defineStore } from 'pinia'
import { location } from '@/api/location'

export const useAddressStore = defineStore('address', {
  state: () => ({
    address: {
      address: '定位中...',
      lat: '',
      lng: '',
    },
    locationReady: false,
    deliveryAddress: {}
  }),

  actions: {
    clearAddress() {
      this.address = { address: '定位中...', lat: '', lng: '' }
    },

    async fetchLocation() {
      try {
        const response = await location()
        if (response.data.status === 200) {
          const data = response.data.data
          this.address = { address: data.address, ...data.location }
          this.locationReady = true
        }
      } catch (e) {
        this.address = { address: '定位失败...', lat: '', lng: '' }
      }
    },

    recordAddress(address) {
      this.address = { ...address }
      this.locationReady = true
    },

    setLocationReady(val) {
      this.locationReady = val
    },

    setDeliveryAddress(address) {
      this.deliveryAddress = { ...address }
    },

    failLocation() {
      this.address = { address: '定位失败...', lat: '', lng: '' }
    }
  }
})
