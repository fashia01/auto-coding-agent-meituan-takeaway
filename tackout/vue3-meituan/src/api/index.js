import axios from 'axios'
import { removeInfo } from '@/utils/auth'

const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const instance = axios.create({
  baseURL,
  timeout: 0,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  maxContentLength: 2000,
  transformResponse: [function (data) {
    try {
      return JSON.parse(data)
    } catch (e) {
      return {}
    }
  }]
})

// 401 拦截：跳转登录
instance.interceptors.response.use(
  res => res,
  err => {
    if (err.response && err.response.status === 401) {
      removeInfo()
      window.location.hash = '/login'
    }
    return Promise.reject(err)
  }
)

// get
export const _get = (req) => {
  const timestamp = { _t: Date.now() }
  const params = req.data ? { ...req.data, ...timestamp } : timestamp
  return instance.get(req.url, { params })
}

// post
export const _post = (req) => {
  return instance({ method: 'post', url: `/${req.url}`, data: req.data })
}

// put
export const _put = (req) => {
  return instance({ method: 'put', url: `/${req.url}`, data: req.data })
}

// delete
export const _delete = (req) => {
  return instance({ method: 'delete', url: `/${req.url}`, data: req.data })
}

// post without credentials
export const _postNoWithCredentials = (req) => {
  return instance({ method: 'post', url: `/${req.url}`, data: req.data, withCredentials: false })
}
