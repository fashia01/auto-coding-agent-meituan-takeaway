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
	// CORS 中间件
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		} else {
			c.Header("Access-Control-Allow-Origin", "*")
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Type")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

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
		v1.GET("/all_restaurant", middleware.AuthAdmin(), handlers.GetAllRestaurant)
		v1.GET("/restaurant/:restaurant_id", handlers.GetRestaurant)
		v1.POST("/restaurant", middleware.AuthAdmin(), handlers.AddRestaurant)
		v1.GET("/search/restaurant", handlers.SearchRestaurant)
		v1.GET("/my_restaurant", middleware.AuthAdmin(), handlers.GetMyRestaurant)

		// 分类相关
		v1.POST("/category", middleware.AuthAdmin(), handlers.AddCategory)
		v1.GET("/category/:restaurant_id", handlers.GetCategory)
		v1.POST("/update_category", middleware.AuthAdmin(), handlers.UpdateCategory)
		v1.DELETE("/category", middleware.AuthAdmin(), handlers.DeleteCategory)
		v1.GET("/my_category", middleware.AuthAdmin(), handlers.GetMyCategory)

		// 菜品相关
		v1.POST("/food", middleware.AuthAdmin(), handlers.AddFood)
		v1.GET("/food/:restaurant_id", handlers.GetFood)
		v1.DELETE("/food/:food_id", middleware.AuthAdmin(), handlers.DeleteFood)
		v1.GET("/my_foods", middleware.AuthAdmin(), handlers.GetMyFoods)
		v1.POST("/update_foods", middleware.AuthAdmin(), handlers.UpdateFoods)

		// 评论相关
		v1.GET("/comment", handlers.GetComment)
		v1.POST("/comment", middleware.Auth(), handlers.MakeComment)
		v1.POST("/_comment", handlers.MakeCommentAdmin)
		v1.GET("/my_comment", middleware.Auth(), handlers.GetMyComment)
		v1.GET("/comment_count", handlers.GetCommentCount)
		v1.GET("/my_restaurant_comment", middleware.AuthAdmin(), handlers.GetMyRestaurantComment)
		v1.DELETE("/comment", middleware.Auth(), handlers.DeleteComment)
		v1.POST("/reply_comment", middleware.AuthAdmin(), handlers.ReplyComment)

		// 订单相关
		v1.POST("/order", middleware.Auth(), handlers.MakeOrder)
		v1.POST("/wxorder", middleware.Auth(), handlers.MakeWXOrder)
		v1.GET("/orders", middleware.Auth(), handlers.GetOrders)
		v1.GET("/my_restaurant_order", middleware.AuthAdmin(), handlers.GetMyRestaurantOrder)
		v1.GET("/order/:order_id", middleware.Auth(), handlers.GetOrder)
		v1.POST("/order_confirm", middleware.AuthAdmin(), handlers.ConfirmOrder)

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
		admin.POST("/login", handlers.UserLogin) // 兼容前端
		admin.POST("/user_login", handlers.UserLogin)
		admin.POST("/admin_login", handlers.AdminLogin)
		admin.POST("/wechat_login", handlers.WechatLogin)
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
		admin.GET("/user_statistic", middleware.AuthAdmin(), handlers.UserStatistic)
		admin.POST("/add_user", middleware.AuthAdmin(), handlers.AddUser)
		admin.POST("/update_passwd", middleware.AuthAdmin(), handlers.UpdatePasswd)
	}

	// 统计路由组
	statistics := r.Group("/statistics")
	{
		statistics.GET("/count/user", middleware.AuthAdmin(), handlers.UserCount)
		statistics.GET("/count/order", middleware.AuthAdmin(), handlers.OrderCount)
		statistics.GET("/all/user", middleware.AuthAdmin(), handlers.AllUserCount)
		statistics.GET("/all/order", middleware.AuthAdmin(), handlers.AllOrderCount)
		statistics.GET("/count/restaurant", middleware.AuthAdmin(), handlers.RestaurantCount)
		statistics.GET("/my_order", middleware.AuthAdmin(), handlers.MyOrder)
		statistics.GET("/my_order_price", middleware.AuthAdmin(), handlers.MyOrderPrice)
	}

	// 服务路由组
	service := r.Group("/service")
	{
		service.GET("/uploadtoken", middleware.Auth(), handlers.UploadToken)
	}
}
