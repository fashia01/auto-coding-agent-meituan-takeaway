package main

import (
	"fmt"
	"log"

	"github.com/auto-coding-agent/meituan-backend/internal/config"
	"github.com/auto-coding-agent/meituan-backend/internal/database"
	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 连接数据库
	if err := database.Connect(cfg.Database.GetURI(), cfg.Database.Name); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Disconnect()

	// 初始化 Gin
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// 注册路由
	registerRoutes(r)

	// 启动服务器
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func registerRoutes(r *gin.Engine) {
	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API 路由组 (占位，后续 Task 实现)
	_ = r.Group("/v1")
	// {
	// 	位置服务
	// 	api.GET("/suggestion", handlers.Suggestion)
	// 	api.GET("/location", handlers.Location)
	// 	api.GET("/detailLocation", handlers.DetailLocation)
	// 	餐馆相关
	// 	api.GET("/restaurants", handlers.GetRestaurants)
	// 	api.GET("/restaurant/:id", handlers.GetRestaurant)
	// 	api.POST("/restaurant", middleware.AuthAdmin(), handlers.AddRestaurant)
	// 	订单相关
	// 	api.POST("/order", middleware.Auth(), handlers.MakeOrder)
	// 	api.GET("/orders", middleware.Auth(), handlers.GetOrders)
	// 	支付相关
	// 	api.POST("/pay", middleware.Auth(), handlers.InitPay)
	// 	api.POST("/notify_url", handlers.PayNotice)
	// 	api.GET("/listen_status", middleware.Auth(), handlers.ListenStatus)
	// }

	// 管理后台路由组 (占位，后续 Task 实现)
	_ = r.Group("/admin")
	// {
	// 	用户相关
	// 	admin.POST("/user_login", handlers.UserLogin)
	// 	admin.POST("/admin_login", handlers.AdminLogin)
	// 	admin.POST("/logout", handlers.Logout)
	// 	admin.GET("/user_info", middleware.Auth(), handlers.GetUserInfo)
	// 	地址相关
	// 	admin.POST("/address", middleware.Auth(), handlers.AddAddress)
	// 	admin.GET("/all_address", middleware.Auth(), handlers.GetAllAddress)
	// 	admin.DELETE("/address", middleware.Auth(), handlers.DeleteAddress)
	// }

	// 统计路由组 (占位，后续 Task 实现)
	// statistics := r.Group("/statistics")
	// {
	// 	statistics.GET("/order_count", middleware.AuthAdmin(), handlers.OrderCount)
	// 	statistics.GET("/user_count", middleware.AuthAdmin(), handlers.UserCount)
	// }
}
