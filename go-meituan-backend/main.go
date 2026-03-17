package main

import (
	"fmt"
	"log"

	"github.com/auto-coding-agent/meituan-backend/internal/config"
	"github.com/auto-coding-agent/meituan-backend/internal/database"
	"github.com/auto-coding-agent/meituan-backend/internal/handlers"
	"github.com/auto-coding-agent/meituan-backend/internal/middleware"
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

	// Session 中间件
	r.Use(middleware.Session())

	// API 路由组
	v1 := r.Group("/v1")
	{
		// 位置服务
		v1.GET("/suggestion", handlers.Suggestion)
		v1.GET("/location", handlers.Location)
		v1.GET("/detailLocation", handlers.DetailLocation)

		// 餐馆相关
		v1.GET("/restaurants", handlers.GetRestaurants)
		v1.GET("/all_restaurant", handlers.GetAllRestaurant)
		v1.GET("/restaurant/:id", handlers.GetRestaurant)
		v1.POST("/restaurant", middleware.AuthAdmin(), handlers.AddRestaurant)
		v1.GET("/search/restaurant", handlers.SearchRestaurant)

		// 分类相关
		v1.POST("/category", middleware.AuthAdmin(), handlers.AddCategory)
		v1.GET("/category/:restaurant_id", handlers.GetCategory)

		// 菜品相关
		v1.POST("/food", middleware.AuthAdmin(), handlers.AddFood)
		v1.GET("/food/:restaurant_id", handlers.GetFood)
		v1.DELETE("/food/:food_id", middleware.AuthAdmin(), handlers.DeleteFood)

		// 评论相关
		v1.GET("/comment", handlers.GetComment)
		v1.POST("/comment", middleware.Auth(), handlers.MakeComment)

		// 订单相关
		v1.POST("/order", middleware.Auth(), handlers.MakeOrder)
		v1.GET("/orders", middleware.Auth(), handlers.GetOrders)
		v1.GET("/order/:order_id", handlers.GetOrder)

		// 支付相关
		v1.POST("/pay", middleware.Auth(), handlers.InitPay)
		v1.POST("/notify_url", handlers.PayNotice)
		v1.GET("/listen_status", middleware.Auth(), handlers.ListenStatus)

		// 足迹相关
		v1.POST("/footprint", middleware.Auth(), handlers.AddFootprint)
		v1.GET("/footprint", middleware.Auth(), handlers.GetFootprint)
		v1.DELETE("/footprint", middleware.Auth(), handlers.DeleteFootprint)

		// 收藏相关
		v1.POST("/collection", middleware.Auth(), handlers.AddCollection)
		v1.GET("/collection", middleware.Auth(), handlers.GetCollection)
		v1.DELETE("/collection", middleware.Auth(), handlers.DeleteCollection)
	}

	// 管理后台路由组
	admin := r.Group("/admin")
	{
		// 用户相关
		admin.POST("/user_login", handlers.UserLogin)
		admin.POST("/admin_login", handlers.AdminLogin)
		admin.POST("/logout", handlers.Logout)
		admin.GET("/user_info", middleware.Auth(), handlers.GetUserInfo)
		admin.POST("/user_info", middleware.AuthUser(), handlers.SetUserInfo)
		admin.POST("/change_avatar", middleware.AuthAdmin(), handlers.ChangeAvatar)

		// 地址相关
		admin.POST("/address", middleware.Auth(), handlers.AddAddress)
		admin.GET("/all_address", middleware.Auth(), handlers.GetAllAddress)
		admin.GET("/address", middleware.AuthAdmin(), handlers.GetAddress)
		admin.POST("/update_address", middleware.Auth(), handlers.UpdateAddress)
		admin.DELETE("/address", middleware.Auth(), handlers.DeleteAddress)

		// 统计相关
		admin.GET("/my_restaurant", middleware.AuthAdmin(), handlers.GetMyRestaurant)
	}

	// 统计路由组 (占位)
	// statistics := r.Group("/statistics")
	// {
	// 	statistics.GET("/order_count", middleware.AuthAdmin(), handlers.OrderCount)
	// 	statistics.GET("/user_count", middleware.AuthAdmin(), handlers.UserCount)
	// }
}
