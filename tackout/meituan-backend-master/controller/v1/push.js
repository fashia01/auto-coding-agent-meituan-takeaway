/* eslint-disable no-console */
import { checkPushRules } from '../../utils/pushRules'

class Push {
  constructor() {
    this.getPendingPush = this.getPendingPush.bind(this)
  }

  /**
   * GET /v1/push/pending
   * 检查当前登录用户是否有待推送的 AI 建议
   * 返回 { has_push: true, message, push_context } 或 { has_push: false }
   */
  async getPendingPush(req, res) {
    const user_id = req.session && (req.session.admin_id || req.session.user_id)
    if (!user_id) {
      return res.send({ has_push: false })
    }

    try {
      const result = await checkPushRules(String(user_id))
      if (result) {
        return res.send({
          has_push: true,
          message: result.message,
          push_context: result.push_context
        })
      }
      return res.send({ has_push: false })
    } catch (err) {
      console.log('[Push] getPendingPush error:', err.message)
      return res.send({ has_push: false })
    }
  }
}

export default new Push()
