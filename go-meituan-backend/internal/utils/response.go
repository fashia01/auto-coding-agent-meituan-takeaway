package utils

import (
	"github.com/gin-gonic/gin"
)

// Response 统一响应结构
type Response struct {
	Status  int         `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(200, gin.H{
		"status":  200,
		"message": "成功",
		"data":    data,
	})
}

// SuccessWithMsg 成功响应带消息
func SuccessWithMsg(c *gin.Context, message string, data interface{}) {
	c.JSON(200, gin.H{
		"status":  200,
		"message": message,
		"data":    data,
	})
}

// Fail 失败响应
func Fail(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{
		"status":  status,
		"message": message,
	})
}

// FailWithData 失败响应带数据
func FailWithData(c *gin.Context, status int, message string, data interface{}) {
	c.JSON(status, gin.H{
		"status":  status,
		"message": message,
		"data":    data,
	})
}

// ParamError 参数错误
func ParamError(c *gin.Context, message string) {
	Fail(c, 400, message)
}

// Unauthorized 未授权
func Unauthorized(c *gin.Context, message string) {
	if message == "" {
		message = "未登录"
	}
	Fail(c, 401, message)
}

// Forbidden 禁止访问
func Forbidden(c *gin.Context, message string) {
	if message == "" {
		message = "权限不足"
	}
	Fail(c, 403, message)
}

// NotFound 资源不存在
func NotFound(c *gin.Context, message string) {
	if message == "" {
		message = "资源不存在"
	}
	Fail(c, 404, message)
}

// ServerError 服务器错误
func ServerError(c *gin.Context, message string) {
	if message == "" {
		message = "服务器内部错误"
	}
	Fail(c, 500, message)
}
