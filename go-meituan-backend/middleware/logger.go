package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	logger *log.Logger
	errorLogger *log.Logger
)

func init() {
	// 创建日志文件
	logFile, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Fatal("Failed to create log file:", err)
	}

	logger = log.New(logFile, "[INFO] ", log.Ldate|log.Ltime|log.Lshortfile)
	errorLogger = log.New(logFile, "[ERROR] ", log.Ldate|log.Ltime|log.Lshortfile)
}

// Logger 日志中间件
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		c.Next()

		endTime := time.Now()
		latency := endTime.Sub(startTime)

		logger.Printf("| %3d | %13v | %15s | %-7s %s",
			c.Writer.Status(),
			latency,
			c.ClientIP(),
			c.Request.Method,
			c.Request.URL.Path,
		)
	}
}

// ErrorLogger 错误日志中间件
func ErrorLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) > 0 {
			for _, e := range c.Errors {
				errorLogger.Printf("%s - %s", e.Err.Error(), c.Request.URL.Path)
			}
		}
	}
}
