package handlers

import (
	"context"
	"time"

	"github.com/auto-coding-agent/meituan-backend/internal/database"
	"github.com/auto-coding-agent/meituan-backend/internal/models"
	"github.com/auto-coding-agent/meituan-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Footprint 足迹相关

// AddFootprint 添加足迹
func AddFootprint(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type FootprintRequest struct {
		RestaurantID int             `json:"restaurant_id" binding:"required"`
		Restaurant  *models.Restaurant `json:"restaurant"`
	}

	var req FootprintRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionFootprints)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userIDVal := userID + adminID

	// 检查是否已有足迹，有则更新浏览时间
	var existing models.Footprint
	err := coll.FindOne(ctx, bson.M{"user_id": userIDVal, "restaurant_id": req.RestaurantID}).Decode(&existing)
	if err == nil {
		coll.UpdateOne(ctx, bson.M{"_id": existing.ID}, bson.M{"$set": bson.M{"view_time": time.Now()}})
		c.JSON(200, gin.H{
			"status":  200,
			"message": "更新足迹成功",
		})
		return
	}

	// 添加新足迹
	footprintID, err := utils.GetID("footprint_id")
	if err != nil {
		utils.ServerError(c, "添加足迹失败")
		return
	}

	footprint := models.Footprint{
		IDNum:         footprintID,
		UserID:        userIDVal,
		RestaurantID:  req.RestaurantID,
		Restaurant:    req.Restaurant,
		ViewTime:      time.Now(),
	}

	_, err = coll.InsertOne(ctx, footprint)
	if err != nil {
		utils.ServerError(c, "添加足迹失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "添加足迹成功",
	})
}

// GetFootprint 获取足迹列表
func GetFootprint(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	coll := database.GetCollection(database.CollectionFootprints)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userIDVal := userID + adminID

	opt := options.Find().SetSort(bson.D{{Key: "view_time", Value: -1}}).SetLimit(50)
	cursor, err := coll.Find(ctx, bson.M{"user_id": userIDVal}, opt)
	if err != nil {
		utils.ServerError(c, "获取足迹失败")
		return
	}
	defer cursor.Close(ctx)

	var footprints []models.Footprint
	if err := cursor.All(ctx, &footprints); err != nil {
		utils.ServerError(c, "获取足迹失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    footprints,
		"message": "获取足迹成功",
	})
}

// DeleteFootprint 删除足迹
func DeleteFootprint(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	id := c.Query("id")
	if id == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionFootprints)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userIDVal := userID + adminID

	result, err := coll.DeleteOne(ctx, bson.M{"id": id, "user_id": userIDVal})
	if err != nil {
		utils.ServerError(c, "删除足迹失败")
		return
	}

	if result.DeletedCount == 0 {
		utils.NotFound(c, "足迹不存在")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "删除足迹成功",
	})
}

// Collection 收藏相关

// AddCollection 添加收藏
func AddCollection(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type CollectionRequest struct {
		RestaurantID int              `json:"restaurant_id" binding:"required"`
		Restaurant  *models.Restaurant `json:"restaurant"`
	}

	var req CollectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionCollections)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userIDVal := userID + adminID

	// 检查是否已收藏
	var existing models.Collection
	err := coll.FindOne(ctx, bson.M{"user_id": userIDVal, "restaurant_id": req.RestaurantID}).Decode(&existing)
	if err == nil {
		c.JSON(200, gin.H{
			"status":  200,
			"message": "已收藏",
		})
		return
	}

	// 添加收藏
	collectionID, err := utils.GetID("collection_id")
	if err != nil {
		utils.ServerError(c, "添加收藏失败")
		return
	}

	collection := models.Collection{
		IDNum:          collectionID,
		UserID:         userIDVal,
		RestaurantID:  req.RestaurantID,
		Restaurant:    req.Restaurant,
		CreateTime:    time.Now(),
	}

	_, err = coll.InsertOne(ctx, collection)
	if err != nil {
		utils.ServerError(c, "添加收藏失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "添加收藏成功",
	})
}

// GetCollection 获取收藏列表
func GetCollection(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	coll := database.GetCollection(database.CollectionCollections)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userIDVal := userID + adminID

	opt := options.Find().SetSort(bson.D{{Key: "create_time", Value: -1}})
	cursor, err := coll.Find(ctx, bson.M{"user_id": userIDVal}, opt)
	if err != nil {
		utils.ServerError(c, "获取收藏列表失败")
		return
	}
	defer cursor.Close(ctx)

	var collections []models.Collection
	if err := cursor.All(ctx, &collections); err != nil {
		utils.ServerError(c, "获取收藏列表失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    collections,
		"message": "获取收藏列表成功",
	})
}

// DeleteCollection 删除收藏
func DeleteCollection(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	restaurantID := c.Query("restaurant_id")
	if restaurantID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionCollections)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userIDVal := userID + adminID

	result, err := coll.DeleteOne(ctx, bson.M{"restaurant_id": restaurantID, "user_id": userIDVal})
	if err != nil {
		utils.ServerError(c, "删除收藏失败")
		return
	}

	if result.DeletedCount == 0 {
		utils.NotFound(c, "收藏不存在")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "删除收藏成功",
	})
}
