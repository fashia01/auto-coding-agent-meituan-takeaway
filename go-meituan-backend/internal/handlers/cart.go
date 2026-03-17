package handlers

import (
	"context"
	"time"

	"github.com/auto-coding-agent/meituan-backend/internal/database"
	"github.com/auto-coding-agent/meituan-backend/internal/models"
	"github.com/auto-coding-agent/meituan-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

// Cart 购物车相关

// AddCart 添加购物车
func AddCart(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type CartRequest struct {
		RestaurantID  int     `json:"restaurant_id" binding:"required"`
		FoodID        int     `json:"food_id" binding:"required"`
		Name          string  `json:"name" binding:"required"`
		Price         float64 `json:"price" binding:"required"`
		Num           int     `json:"num"`
		FoodsPic      string  `json:"foods_pic"`
		RestaurantName string `json:"restaurant_name"`
		PicURL        string  `json:"pic_url"`
	}

	var req CartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	if req.Num == 0 {
		req.Num = 1
	}

	coll := database.GetCollection(database.CollectionCart)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 检查是否已存在相同商品
	var existing models.CartItem
	err := coll.FindOne(ctx, bson.M{
		"user_id":      userID,
		"restaurant_id": req.RestaurantID,
		"food_id":      req.FoodID,
	}).Decode(&existing)

	if err == nil {
		// 已存在，更新数量
		update := bson.M{
			"$inc": bson.M{"num": req.Num},
		}
		coll.UpdateOne(ctx, bson.M{
			"user_id":      userID,
			"restaurant_id": req.RestaurantID,
			"food_id":      req.FoodID,
		}, update)
	} else {
		// 不存在，插入新记录
		cartID, _ := utils.GetID("cart_id")
		item := models.CartItem{
			IDNum:          cartID,
			UserID:         userID,
			RestaurantID:  req.RestaurantID,
			FoodID:        req.FoodID,
			Name:          req.Name,
			Price:         req.Price,
			Num:           req.Num,
			FoodsPic:      req.FoodsPic,
			RestaurantName: req.RestaurantName,
			PicURL:        req.PicURL,
			CreatedAt:     time.Now(),
		}
		coll.InsertOne(ctx, item)
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "添加购物车成功",
	})
}

// ReduceCart 从购物车减少
func ReduceCart(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type CartRequest struct {
		RestaurantID int `json:"restaurant_id" binding:"required"`
		FoodID       int `json:"food_id" binding:"required"`
	}

	var req CartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionCart)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 查找当前数量
	var item models.CartItem
	err := coll.FindOne(ctx, bson.M{
		"user_id":      userID,
		"restaurant_id": req.RestaurantID,
		"food_id":      req.FoodID,
	}).Decode(&item)

	if err != nil {
		utils.NotFound(c, "购物车中不存在该商品")
		return
	}

	if item.Num <= 1 {
		// 数量为1或0，删除该商品
		coll.DeleteOne(ctx, bson.M{
			"user_id":      userID,
			"restaurant_id": req.RestaurantID,
			"food_id":      req.FoodID,
		})
	} else {
		// 数量减1
		coll.UpdateOne(ctx, bson.M{
			"user_id":      userID,
			"restaurant_id": req.RestaurantID,
			"food_id":      req.FoodID,
		}, bson.M{"$inc": bson.M{"num": -1}})
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "从购物车减少成功",
	})
}

// GetCart 获取购物车
func GetCart(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	restaurantID := c.Query("restaurant_id")

	coll := database.GetCollection(database.CollectionCart)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var filter bson.M = bson.M{"user_id": userID}
	if restaurantID != "" {
		filter["restaurant_id"] = restaurantID
	}

	cursor, err := coll.Find(ctx, filter)
	if err != nil {
		utils.ServerError(c, "获取购物车失败")
		return
	}
	defer cursor.Close(ctx)

	var items []models.CartItem
	if err := cursor.All(ctx, &items); err != nil {
		utils.ServerError(c, "获取购物车失败")
		return
	}

	// 计算总价和总数
	var totalPrice float64
	var totalNum int
	for _, item := range items {
		totalPrice += item.Price * float64(item.Num)
		totalNum += item.Num
	}

	c.JSON(200, gin.H{
		"status": 200,
		"data": gin.H{
			"items":      items,
			"totalPrice": totalPrice,
			"totalNum":   totalNum,
		},
		"message": "获取购物车成功",
	})
}

// ClearCart 清空购物车
func ClearCart(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	restaurantID := c.Query("restaurant_id")

	coll := database.GetCollection(database.CollectionCart)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var filter bson.M = bson.M{"user_id": userID}
	if restaurantID != "" {
		filter["restaurant_id"] = restaurantID
	}

	_, err := coll.DeleteMany(ctx, filter)
	if err != nil {
		utils.ServerError(c, "清空购物车失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "清空购物车成功",
	})
}
