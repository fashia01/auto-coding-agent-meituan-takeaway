const CART_META_KEYS = new Set(['totalPrice', 'totalNum', 'restaurant_name', 'pic_url'])

export function isCartFoodKey(key) {
  return !CART_META_KEYS.has(String(key))
}
