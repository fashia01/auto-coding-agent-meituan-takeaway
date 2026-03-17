package handlers

import (
	"context"
	"strconv"
	"time"

	"github.com/auto-coding-agent/meituan-backend/internal/config"
	"github.com/auto-coding-agent/meituan-backend/internal/database"
	"github.com/auto-coding-agent/meituan-backend/internal/models"
	"github.com/auto-coding-agent/meituan-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// Order 订单相关

// MakeOrder 创建订单
func MakeOrder(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type OrderRequest struct {
		RestaurantID   int              `json:"restaurant_id" binding:"required"`
		AddressID       int              `json:"address_id" binding:"required"`
		Foods          []models.OrderFood `json:"foods" binding:"required"`
		Remark         string            `json:"remark"`
	}

	var req OrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	// 获取地址信息
	addrColl := database.GetCollection(database.CollectionAddresses)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var address models.Address
	err := addrColl.FindOne(ctx, bson.M{"Id": req.AddressID, "user_id": userID}).Decode(&address)
	if err == mongo.ErrNoDocuments {
		utils.NotFound(c, "地址不存在")
		return
	}

	// 获取餐馆信息
	restColl := database.GetCollection(database.CollectionRestaurants)
	var restaurant models.Restaurant
	restColl.FindOne(ctx, bson.M{"Id": req.RestaurantID}).Decode(&restaurant)

	// 计算总价
	var totalPrice float64
	for _, food := range req.Foods {
		totalPrice += food.Price * float64(food.Num)
	}
	totalPrice += restaurant.ShippingFee

	// 生成订单
	orderColl := database.GetCollection(database.CollectionOrders)
	orderID, err := utils.GetID("order_id")
	if err != nil {
		utils.ServerError(c, "创建订单失败")
		return
	}

	order := models.Order{
		IDNum:              orderID,
		UserID:             userID,
		RestaurantID:       req.RestaurantID,
		TotalPrice:         totalPrice,
		Foods:             req.Foods,
		Remark:             req.Remark,
		Status:             models.OrderStatusUnpaid,
		Code:               200,
		ShippingFee:        restaurant.ShippingFee,
		CreateTime:         time.Now(),
		CreateTimeTimestamp: int(time.Now().Unix()),
		PayRemainTime:      1800, // 30分钟
	}

	_, err = orderColl.InsertOne(ctx, order)
	if err != nil {
		utils.ServerError(c, "创建订单失败")
		return
	}

	c.JSON(200, gin.H{
		"status":   200,
		"data":     order,
		"message":  "创建订单成功",
	})
}

// GetOrders 获取订单列表
func GetOrders(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	coll := database.GetCollection(database.CollectionOrders)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := coll.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		utils.ServerError(c, "获取订单列表失败")
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		utils.ServerError(c, "获取订单列表失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    orders,
		"message": "获取订单列表成功",
	})
}

// GetOrder 获取订单详情
func GetOrder(c *gin.Context) {
	orderID := c.Param("order_id")

	coll := database.GetCollection(database.CollectionOrders)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var order models.Order
	err := coll.FindOne(ctx, bson.M{"Id": orderID}).Decode(&order)
	if err == mongo.ErrNoDocuments {
		utils.NotFound(c, "订单不存在")
		return
	}
	if err != nil {
		utils.ServerError(c, "获取订单详情失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    order,
		"message": "获取订单详情成功",
	})
}

// Pay 支付相关

// InitPay 初始化支付
func InitPay(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type PayRequest struct {
		OrderID int `json:"order_id" binding:"required"`
		PayType string `json:"pay_type" binding:"required"` // alipay/wechat
		Method  string `json:"method"` // scan/wap/mock
	}

	var req PayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	// 获取订单
	orderColl := database.GetCollection(database.CollectionOrders)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var order models.Order
	err := orderColl.FindOne(ctx, bson.M{"Id": req.OrderID, "user_id": userID}).Decode(&order)
	if err == mongo.ErrNoDocuments {
		utils.NotFound(c, "订单不存在")
		return
	}

	// 如果是模拟支付
	if config.App != nil && config.App.MockPayment || req.Method == "mock" {
		payColl := database.GetCollection(database.CollectionPayments)
		payID, _ := utils.GetID("pay_id")

		payment := models.Pay{
			IDNum:       payID,
			OrderID:     req.OrderID,
			Amount:      order.TotalPrice,
			TradeName:   "美团外卖订单",
			PayType:     req.PayType,
			Status:      models.PayStatusUnpaid,
			Method:      "mock",
			Code:        200,
			CreateTime:  time.Now(),
		}

		payColl.InsertOne(ctx, payment)

		c.JSON(200, gin.H{
			"status":   200,
			"data":     gin.H{"pay_id": payID, "qrcode": "mock://" + strconv.Itoa(payID)},
			"message":  "创建支付成功",
		})
		return
	}

	// TODO: 集成真实支付宝/微信支付
	c.JSON(200, gin.H{
		"status":  200,
		"message": "支付功能开发中",
	})
}

// PayNotice 支付异步通知
func PayNotice(c *gin.Context) {
	// TODO: 处理支付宝/微信支付回调
	c.JSON(200, gin.H{
		"status":  200,
	})
}

// ListenStatus 监听扫码支付状态
func ListenStatus(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	payID := c.Query("pay_id")
	if payID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	// 模拟支付成功
	orderColl := database.GetCollection(database.CollectionOrders)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	orderID, _ := strconv.Atoi(payID)
	orderColl.UpdateOne(ctx, bson.M{"Id": orderID}, bson.M{"$set": bson.M{"status": models.OrderStatusPaid}})

	c.JSON(200, gin.H{
		"status":  200,
		"data":    gin.H{"status": "success"},
		"message": "支付成功",
	})
}
