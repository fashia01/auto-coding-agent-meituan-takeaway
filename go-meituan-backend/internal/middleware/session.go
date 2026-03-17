package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// SessionData Session 数据
type SessionData struct {
	UserID   int
	AdminID  int
	ExpireAt time.Time
}

var (
	sessions = make(map[string]*SessionData)
	mu       sync.RWMutex
	sessionTimeout = 24 * time.Hour // Session 过期时间
)

// Session 返回 Session 中间件
func Session() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从 cookie 获取 session ID
		sessionID, err := c.Cookie("session_id")
		if err != nil || sessionID == "" {
			// 生成新的 session ID
			sessionID = generateSessionID()
			c.SetCookie("session_id", sessionID, 86400, "/", "", false, true)
		}

		// 获取 session 数据
		mu.RLock()
		session, exists := sessions[sessionID]
		mu.RUnlock()

		if !exists || time.Now().After(session.ExpireAt) {
			// Session 不存在或已过期，创建新的
			session = &SessionData{
				ExpireAt: time.Now().Add(sessionTimeout),
			}
			mu.Lock()
			sessions[sessionID] = session
			mu.Unlock()
		}

		// 将 session 数据设置到上下文
		c.Set("user_id", session.UserID)
		c.Set("admin_id", session.AdminID)
		c.Set("session_id", sessionID)

		c.Next()

		// 请求结束后更新过期时间
		if session != nil {
			mu.Lock()
			session.ExpireAt = time.Now().Add(sessionTimeout)
			mu.Unlock()
		}
	}
}

// SetSession 设置 session
func SetSession(c *gin.Context, userID, adminID int) {
	sessionID, _ := c.Get("session_id")
	if sid, ok := sessionID.(string); ok {
		mu.Lock()
		if s, exists := sessions[sid]; exists {
			s.UserID = userID
			s.AdminID = adminID
		}
		mu.Unlock()
	}
}

// ClearSession 清除 session
func ClearSession(c *gin.Context) {
	sessionID, _ := c.Get("session_id")
	if sid, ok := sessionID.(string); ok {
		mu.Lock()
		delete(sessions, sid)
		mu.Unlock()
	}
	c.SetCookie("session_id", "", -1, "/", "", false, true)
}

// generateSessionID 生成随机 session ID
func generateSessionID() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

// SessionCheck 检查 session 是否存在 (用于测试)
func SessionCheck(w http.ResponseWriter, r *http.Request) (int, int) {
	cookie, err := r.Cookie("session_id")
	if err != nil || cookie.Value == "" {
		return 0, 0
	}

	mu.RLock()
	session, exists := sessions[cookie.Value]
	mu.RUnlock()

	if !exists || time.Now().After(session.ExpireAt) {
		return 0, 0
	}

	return session.UserID, session.AdminID
}

// InitSession 初始化 session (用于测试)
func InitSession(userID, adminID int) string {
	sessionID := generateSessionID()
	sessions[sessionID] = &SessionData{
		UserID:   userID,
		AdminID:  adminID,
		ExpireAt: time.Now().Add(sessionTimeout),
	}
	return sessionID
}

func init() {
	// 启动 goroutine 清理过期的 session
	go func() {
		for {
			time.Sleep(10 * time.Minute)
			mu.Lock()
			now := time.Now()
			for id, session := range sessions {
				if now.After(session.ExpireAt) {
					delete(sessions, id)
				}
			}
			mu.Unlock()
		}
	}()
}
