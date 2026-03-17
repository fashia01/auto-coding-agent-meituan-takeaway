package handlers

import (
	"context"
	"time"

	"github.com/auto-coding-agent/meituan-backend/internal/database"
	"github.com/auto-coding-agent/meituan-backend/internal/models"
	"github.com/auto-coding-agent/meituan-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// AddAddress 添加收货地址
func AddAddress(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type AddressRequest struct {
		Name     string `json:"name" binding:"required"`
		Phone    string `json:"phone" binding:"required"`
		Address  string `json:"address" binding:"required"`
		Gender   int    `json:"gender" binding:"required"`
		Lng      string `json:"lng" binding:"required"`
		Lat      string `json:"lat" binding:"required"`
	}

	var req AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionAddresses)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	addressID, err := utils.GetID("address_id")
	if err != nil {
		utils.ServerError(c, "添加地址失败")
		return
	}

	address := models.Address{
		IDNum:     addressID,
		Name:      req.Name,
		Phone:     req.Phone,
		Address:   req.Address,
		Gender:    req.Gender,
		Lng:       req.Lng,
		Lat:       req.Lat,
		UserID:    userID + adminID,
	}

	_, err = coll.InsertOne(ctx, address)
	if err != nil {
		utils.ServerError(c, "添加地址失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"success": "添加收货地址成功",
	})
}

// GetAllAddress 获取所有收货地址
func GetAllAddress(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	coll := database.GetCollection(database.CollectionAddresses)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := coll.Find(ctx, bson.M{"user_id": userID + adminID})
	if err != nil {
		utils.ServerError(c, "获取地址失败")
		return
	}
	defer cursor.Close(ctx)

	var addresses []models.Address
	if err := cursor.All(ctx, &addresses); err != nil {
		utils.ServerError(c, "获取地址失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"address": addresses,
		"message": "获取地址成功",
	})
}

// GetAddress 获取指定收货地址
func GetAddress(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	addressID := c.Query("address_id")
	if addressID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionAddresses)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var address models.Address
	err := coll.FindOne(ctx, bson.M{"id": addressID, "user_id": adminID}).Decode(&address)
	if err == mongo.ErrNoDocuments {
		utils.NotFound(c, "地址不存在")
		return
	}
	if err != nil {
		utils.ServerError(c, "获取地址失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"address": address,
		"message": "获取地址成功",
	})
}

// UpdateAddress 更新收货地址
func UpdateAddress(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type AddressRequest struct {
		ID       int    `json:"id" binding:"required"`
		Name     string `json:"name"`
		Phone    string `json:"phone"`
		Address  string `json:"address"`
		Gender   int    `json:"gender"`
		Lng      string `json:"lng"`
		Lat      string `json:"lat"`
	}

	var req AddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionAddresses)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{}
	if req.Name != "" {
		update["name"] = req.Name
	}
	if req.Phone != "" {
		update["phone"] = req.Phone
	}
	if req.Address != "" {
		update["address"] = req.Address
	}
	if req.Gender != 0 {
		update["gender"] = req.Gender
	}
	if req.Lng != "" {
		update["lng"] = req.Lng
	}
	if req.Lat != "" {
		update["lat"] = req.Lat
	}

	if len(update) == 0 {
		utils.Fail(c, -1, "没有需要更新的内容")
		return
	}

	result, err := coll.UpdateOne(ctx, bson.M{"id": req.ID, "user_id": userID + adminID}, bson.M{"$set": update})
	if err != nil {
		utils.ServerError(c, "更新地址失败")
		return
	}

	if result.MatchedCount == 0 {
		utils.NotFound(c, "地址不存在")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"success": "更新地址成功",
	})
}

// DeleteAddress 删除收货地址
func DeleteAddress(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	addressID := c.Query("address_id")
	if addressID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionAddresses)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := coll.DeleteOne(ctx, bson.M{"user_id": userID + adminID, "id": addressID})
	if err != nil {
		utils.ServerError(c, "删除地址失败")
		return
	}

	if result.DeletedCount == 0 {
		utils.NotFound(c, "地址不存在")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "删除收获地址成功",
	})
}
