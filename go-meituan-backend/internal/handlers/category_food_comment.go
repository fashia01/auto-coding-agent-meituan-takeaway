package handlers

import (
	"context"
	"strconv"
	"time"

	"github.com/auto-coding-agent/meituan-backend/internal/database"
	"github.com/auto-coding-agent/meituan-backend/internal/models"
	"github.com/auto-coding-agent/meituan-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Category 分类相关

// AddCategory 添加分类
func AddCategory(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type CategoryRequest struct {
		Name           string `json:"name" binding:"required"`
		Description    string `json:"description"`
		RestaurantID  int    `json:"restaurant_id" binding:"required"`
	}

	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionCategories)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	categoryID, err := utils.GetID("category_id")
	if err != nil {
		utils.ServerError(c, "添加分类失败")
		return
	}

	category := models.Category{
		IDNum:          categoryID,
		Name:           req.Name,
		Description:    req.Description,
		RestaurantID:  req.RestaurantID,
	}

	_, err = coll.InsertOne(ctx, category)
	if err != nil {
		utils.ServerError(c, "添加分类失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "添加分类成功",
	})
}

// GetCategory 获取餐馆分类
func GetCategory(c *gin.Context) {
	restaurantID := c.Param("restaurant_id")
	if restaurantID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionCategories)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := coll.Find(ctx, bson.M{"restaurant_id": restaurantID})
	if err != nil {
		utils.ServerError(c, "获取分类失败")
		return
	}
	defer cursor.Close(ctx)

	var categories []models.Category
	if err := cursor.All(ctx, &categories); err != nil {
		utils.ServerError(c, "获取分类失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    categories,
		"message": "获取分类成功",
	})
}

// Food 菜品相关

// AddFood 添加菜品
func AddFood(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type FoodRequest struct {
		Name        string   `json:"name" binding:"required"`
		Description string   `json:"description"`
		PicURL      string   `json:"pic_url"`
		Price       float64  `json:"price" binding:"required"`
		RestaurantID int    `json:"restaurant_id" binding:"required"`
		CategoryID  int    `json:"category_id"`
	}

	var req FoodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionFoods)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	foodID, err := utils.GetID("food_id")
	if err != nil {
		utils.ServerError(c, "添加菜品失败")
		return
	}

	food := models.Food{
		IDNum:         foodID,
		RestaurantID:  req.RestaurantID,
		Name:          req.Name,
		Description:   req.Description,
		PicURL:        req.PicURL,
		Price:         req.Price,
		CategoryID:    req.CategoryID,
		MonthSales:    0,
		Status:        models.FoodStatusOn,
	}

	_, err = coll.InsertOne(ctx, food)
	if err != nil {
		utils.ServerError(c, "添加菜品失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "添加菜品成功",
	})
}

// GetFood 获取餐馆菜品列表
func GetFood(c *gin.Context) {
	restaurantID := c.Param("restaurant_id")
	if restaurantID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionFoods)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := coll.Find(ctx, bson.M{"restaurant_id": restaurantID})
	if err != nil {
		utils.ServerError(c, "获取菜品列表失败")
		return
	}
	defer cursor.Close(ctx)

	var foods []models.Food
	if err := cursor.All(ctx, &foods); err != nil {
		utils.ServerError(c, "获取菜品列表失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    foods,
		"message": "获取菜品列表成功",
	})
}

// DeleteFood 删除菜品
func DeleteFood(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	foodID := c.Param("food_id")
	if foodID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionFoods)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := coll.DeleteOne(ctx, bson.M{"id": foodID})
	if err != nil {
		utils.ServerError(c, "删除菜品失败")
		return
	}

	if result.DeletedCount == 0 {
		utils.NotFound(c, "菜品不存在")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "删除菜品成功",
	})
}

// Comment 评论相关

// MakeComment 发表评论
func MakeComment(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type CommentRequest struct {
		OrderID      int      `json:"order_id" binding:"required"`
		Content     string   `json:"comment_data" binding:"required"`
		FoodScore   float64  `json:"food_score"`
		DeliveryScore float64 `json:"delivery_score"`
		PicURLs     []string `json:"pic_url"`
		RestaurantID int      `json:"restaurant_id" binding:"required"`
	}

	var req CommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionComments)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	commentID, err := utils.GetID("comment_id")
	if err != nil {
		utils.ServerError(c, "评论失败")
		return
	}

	// 获取用户信息
	userColl := database.GetCollection(database.CollectionUsers)
	var user models.User
	userIDVal := userID + adminID
	userColl.FindOne(ctx, bson.M{"id": userIDVal}).Decode(&user)

	comment := models.Comment{
		IDNum:          commentID,
		UserID:         userIDVal,
		Username:       user.Username,
		Avatar:         user.Avatar,
		RestaurantID:   req.RestaurantID,
		OrderID:        req.OrderID,
		Content:        req.Content,
		PicURLs:        req.PicURLs,
		FoodScore:      req.FoodScore,
		DeliveryScore:  req.DeliveryScore,
		CommentTime:    time.Now(),
	}

	_, err = coll.InsertOne(ctx, comment)
	if err != nil {
		utils.ServerError(c, "评论失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "评论成功",
	})
}

// GetComment 获取餐馆评论
func GetComment(c *gin.Context) {
	restaurantID := c.Query("restaurant_id")
	if restaurantID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	offset := c.DefaultQuery("offset", "0")
	limit := c.DefaultQuery("limit", "5")

	coll := database.GetCollection(database.CollectionComments)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	offsetInt, _ := strconv.Atoi(offset)
	limitInt, _ := strconv.Atoi(limit)

	opt := options.Find().SetSkip(int64(offsetInt)).SetLimit(int64(limitInt))
	cursor, err := coll.Find(ctx, bson.M{"restaurant_id": restaurantID}, opt)
	if err != nil {
		utils.ServerError(c, "获取评论失败")
		return
	}
	defer cursor.Close(ctx)

	var comments []models.Comment
	if err := cursor.All(ctx, &comments); err != nil {
		utils.ServerError(c, "获取评论失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    comments,
		"message": "获取餐馆评论成功",
	})
}
