import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    cartList: {},    // { [restaurant_id]: { totalPrice, totalNum, restaurant_name, pic_url, [food_id]: {...} } }
    ballInCart: false
  }),

  getters: {
    // 获取指定餐馆的购物车总数
    totalNumByRestaurant: (state) => (restaurant_id) => {
      return state.cartList[restaurant_id]?.totalNum || 0
    }
  },

  actions: {
    addCart({ restaurant_id, restaurant_name, pic_url, food_id, price, name, foods_pic, spec = '' }) {
      const cart = { ...this.cartList }

      // 跨店保护：检测是否存在其他餐馆的购物车数据
      const existingIds = Object.keys(cart)
      if (existingIds.length > 0 && !cart[restaurant_id]) {
        const existingRestaurantName = cart[existingIds[0]]?.restaurant_name || '其他餐馆'
        const err = new Error('CROSS_STORE')
        err.oldRestaurantId = existingIds[0]
        err.oldRestaurantName = existingRestaurantName
        err.newRestaurantName = restaurant_name
        throw err
      }

      let restaurant = cart[restaurant_id]

      if (!restaurant) {
        restaurant = cart[restaurant_id] = {
          totalPrice: 0,
          totalNum: 0,
          restaurant_name,
          pic_url,
        }
      }

      restaurant.totalPrice = (Number(restaurant.totalPrice) + Number(price)).toFixed(2)
      restaurant.totalNum++

      if (restaurant[food_id]) {
        restaurant[food_id].num++
      } else {
        restaurant[food_id] = { name, price, foods_pic, num: 1, id: food_id, spec }
      }

      this.cartList = { ...cart }
    },

    reduceCart({ restaurant_id, food_id }) {
      const cart = { ...this.cartList }
      const restaurant = cart[restaurant_id]
      if (!restaurant) return

      restaurant.totalPrice = Number((restaurant.totalPrice - restaurant[food_id].price).toFixed(2))
      restaurant.totalNum--

      if (restaurant.totalNum === 0) {
        delete cart[restaurant_id]
      } else if (restaurant[food_id].num === 1) {
        delete restaurant[food_id]
      } else {
        restaurant[food_id].num--
      }

      this.cartList = { ...cart }
    },

    deleteFood({ restaurant_id, food_id }) {
      const cart = { ...this.cartList }
      const restaurant = cart[restaurant_id]
      if (!restaurant || !restaurant[food_id]) return

      const num = restaurant[food_id].num
      const price = restaurant[food_id].price
      restaurant.totalNum -= num
      delete restaurant[food_id]

      if (restaurant.totalNum === 0) {
        delete cart[restaurant_id]
      } else {
        restaurant.totalPrice = Number((restaurant.totalPrice - price * num).toFixed(2))
      }

      this.cartList = { ...cart }
    },

    emptyCart({ restaurant_id }) {
      const cart = { ...this.cartList }
      delete cart[restaurant_id]
      this.cartList = { ...cart }
    },

    updateCart({ cartList }) {
      this.cartList = { ...cartList }
    },

    setBallInCart(val) {
      this.ballInCart = val
    }
  },

  persist: {
    key: 'cartList',
    paths: ['cartList'],
  }
})
