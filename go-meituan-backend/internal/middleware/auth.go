package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Auth 验证用户是否登录 (用户或管理员)
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt("user_id")
		adminID := c.GetInt("admin_id")

		if userID == 0 && adminID == 0 {
			c.JSON(http.StatusForbidden, gin.H{
				"status":  403,
				"message": "未登录",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AuthUser 验证普通用户是否登录
func AuthUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt("user_id")

		if userID == 0 {
			c.JSON(http.StatusForbidden, gin.H{
				"status":  403,
				"message": "未登录",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AuthAdmin 验证管理员是否登录
func AuthAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		adminID := c.GetInt("admin_id")

		if adminID == 0 {
			c.JSON(http.StatusForbidden, gin.H{
				"status":  403,
				"message": "未登录",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
