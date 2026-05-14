import { _get, _post } from './index'

// 获取消息列表
export const getMessageList = (data) => {
  return _get({ data, url: 'v1/message/list' })
}

// 标记消息已读
export const readMessage = (data) => {
  return _post({ data, url: `v1/message/${data.id}/read` })
}

// 全部标记已读
export const readAllMessages = () => {
  return _post({ url: 'v1/message/read_all' })
}
