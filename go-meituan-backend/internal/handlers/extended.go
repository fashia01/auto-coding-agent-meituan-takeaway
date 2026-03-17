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

// WechatLogin 微信登录
func WechatLogin(c *gin.Context) {
	type WechatLoginRequest struct {
		Code string `json:"code" binding:"required"`
	}

	var req WechatLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	// 微信登录逻辑可以使用 req.Code 获取 openid
	// 这里简化处理，类似于 userLogin
	UserLogin(c)
}

// UpdateCategory 更新分类
func UpdateCategory(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type CategoryRequest struct {
		ID          int    `json:"id" binding:"required"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionCategories)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{}
	if req.Name != "" {
		update["name"] = req.Name
	}
	if req.Description != "" {
		update["description"] = req.Description
	}

	if len(update) > 0 {
		_, err := coll.UpdateOne(ctx, bson.M{"id": req.ID}, bson.M{"$set": update})
		if err != nil {
			utils.ServerError(c, "更新分类失败")
			return
		}
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "更新分类成功",
	})
}

// DeleteCategory 删除分类
func DeleteCategory(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	categoryID := c.Query("id")
	if categoryID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionCategories)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := coll.DeleteOne(ctx, bson.M{"id": categoryID})
	if err != nil {
		utils.ServerError(c, "删除分类失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "删除分类成功",
	})
}

// GetMyCategory 获取我的分类
func GetMyCategory(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	coll := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var restaurant models.Restaurant
	err := coll.FindOne(ctx, bson.M{"user_id": adminID}).Decode(&restaurant)
	if err != nil {
		utils.NotFound(c, "没有餐馆")
		return
	}

	// 获取该餐馆的分类
	categoryColl := database.GetCollection(database.CollectionCategories)
	cursor, err := categoryColl.Find(ctx, bson.M{"restaurant_id": restaurant.IDNum})
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

// GetMyFoods 获取我的菜品
func GetMyFoods(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	coll := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var restaurant models.Restaurant
	err := coll.FindOne(ctx, bson.M{"user_id": adminID}).Decode(&restaurant)
	if err != nil {
		utils.NotFound(c, "没有餐馆")
		return
	}

	foodColl := database.GetCollection(database.CollectionFoods)
	cursor, err := foodColl.Find(ctx, bson.M{"restaurant_id": restaurant.IDNum})
	if err != nil {
		utils.ServerError(c, "获取菜品失败")
		return
	}
	defer cursor.Close(ctx)

	var foods []models.Food
	if err := cursor.All(ctx, &foods); err != nil {
		utils.ServerError(c, "获取菜品失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    foods,
		"message": "获取菜品成功",
	})
}

// UpdateFoods 更新菜品
func UpdateFoods(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type FoodUpdateRequest struct {
		ID          int     `json:"id" binding:"required"`
		Name        string  `json:"name"`
		Description string  `json:"description"`
		PicURL      string  `json:"pic_url"`
		Price       float64 `json:"price"`
		Status      int     `json:"status"`
	}

	var req FoodUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionFoods)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{}
	if req.Name != "" {
		update["name"] = req.Name
	}
	if req.Description != "" {
		update["description"] = req.Description
	}
	if req.PicURL != "" {
		update["pic_url"] = req.PicURL
	}
	if req.Price > 0 {
		update["price"] = req.Price
	}
	if req.Status > 0 {
		update["status"] = req.Status
	}

	if len(update) > 0 {
		_, err := coll.UpdateOne(ctx, bson.M{"id": req.ID}, bson.M{"$set": update})
		if err != nil {
			utils.ServerError(c, "更新菜品失败")
			return
		}
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "更新菜品成功",
	})
}

// MakeCommentAdmin 后台添加评论
func MakeCommentAdmin(c *gin.Context) {
	type CommentRequest struct {
		OrderID      int      `json:"order_id" binding:"required"`
		Content     string   `json:"comment_data" binding:"required"`
		FoodScore   float64  `json:"food_score"`
		DeliveryScore float64 `json:"delivery_score"`
		PicURLs     []string `json:"pic_url"`
		RestaurantID int      `json:"restaurant_id" binding:"required"`
		UserID      int      `json:"user_id"`
		Username    string   `json:"username"`
	}

	var req CommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionComments)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	commentID, _ := utils.GetID("comment_id")

	comment := models.Comment{
		IDNum:          commentID,
		UserID:         req.UserID,
		Username:       req.Username,
		RestaurantID:   req.RestaurantID,
		OrderID:        req.OrderID,
		Content:        req.Content,
		PicURLs:        req.PicURLs,
		FoodScore:      req.FoodScore,
		DeliveryScore:  req.DeliveryScore,
		CommentTime:    time.Now(),
	}

	_, err := coll.InsertOne(ctx, comment)
	if err != nil {
		utils.ServerError(c, "评论失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "评论成功",
	})
}

// GetMyComment 获取我的评论
func GetMyComment(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	id := userID + adminID

	coll := database.GetCollection(database.CollectionComments)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := coll.Find(ctx, bson.M{"user_id": id})
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
		"message": "获取评论成功",
	})
}

// GetCommentCount 获取评论数量
func GetCommentCount(c *gin.Context) {
	restaurantID := c.Query("restaurant_id")
	if restaurantID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionComments)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, err := coll.CountDocuments(ctx, bson.M{"restaurant_id": restaurantID})
	if err != nil {
		utils.ServerError(c, "获取评论数量失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    count,
		"message": "获取评论数量成功",
	})
}

// GetMyRestaurantComment 获取商家评论
func GetMyRestaurantComment(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	// 先获取商家的餐馆
	restaurantColl := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var restaurant models.Restaurant
	err := restaurantColl.FindOne(ctx, bson.M{"user_id": adminID}).Decode(&restaurant)
	if err != nil {
		utils.NotFound(c, "没有餐馆")
		return
	}

	// 获取餐馆评论
	commentColl := database.GetCollection(database.CollectionComments)
	cursor, err := commentColl.Find(ctx, bson.M{"restaurant_id": restaurant.IDNum})
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
		"message": "获取评论成功",
	})
}

// DeleteComment 删除评论
func DeleteComment(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	commentID := c.Query("id")
	if commentID == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionComments)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := coll.DeleteOne(ctx, bson.M{"id": commentID})
	if err != nil {
		utils.ServerError(c, "删除评论失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "删除评论成功",
	})
}

// ReplyComment 回复评论
func ReplyComment(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type ReplyRequest struct {
		CommentID int    `json:"comment_id" binding:"required"`
		Reply     string `json:"reply" binding:"required"`
	}

	var req ReplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionComments)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := coll.UpdateOne(ctx, bson.M{"id": req.CommentID}, bson.M{"$set": bson.M{"reply": req.Reply}})
	if err != nil {
		utils.ServerError(c, "回复评论失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "回复评论成功",
	})
}

// MakeWXOrder 创建微信订单
func MakeWXOrder(c *gin.Context) {
	// 微信订单逻辑类似于普通订单
	MakeOrder(c)
}

// GetMyRestaurantOrder 获取商家订单
func GetMyRestaurantOrder(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	// 先获取商家的餐馆
	restaurantColl := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var restaurant models.Restaurant
	err := restaurantColl.FindOne(ctx, bson.M{"user_id": adminID}).Decode(&restaurant)
	if err != nil {
		utils.NotFound(c, "没有餐馆")
		return
	}

	// 获取订单
	orderColl := database.GetCollection(database.CollectionOrders)
	cursor, err := orderColl.Find(ctx, bson.M{"restaurant_id": restaurant.IDNum})
	if err != nil {
		utils.ServerError(c, "获取订单失败")
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		utils.ServerError(c, "获取订单失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    orders,
		"message": "获取订单成功",
	})
}

// ConfirmOrder 确认订单
func ConfirmOrder(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type ConfirmRequest struct {
		OrderID int `json:"order_id" binding:"required"`
	}

	var req ConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionOrders)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := coll.UpdateOne(ctx, bson.M{"id": req.OrderID}, bson.M{"$set": bson.M{"status": 2}})
	if err != nil {
		utils.ServerError(c, "确认订单失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "确认订单成功",
	})
}

// UserStatistic 用户统计
func UserStatistic(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	userColl := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := userColl.CountDocuments(ctx, bson.M{})

	c.JSON(200, gin.H{
		"status": 200,
		"data": gin.H{
			"userCount": count,
		},
		"message": "获取统计成功",
	})
}

// AddUser 新增用户
func AddUser(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type AddUserRequest struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	var req AddUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	userID, _ := utils.GetID("user_id")

	user := models.User{
		IDNum:     userID,
		Username:  req.Username,
		Password:  req.Password,
		Status:    1,
		CreatedAt: time.Now(),
	}

	_, err := coll.InsertOne(ctx, user)
	if err != nil {
		utils.ServerError(c, "添加用户失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "添加用户成功",
	})
}

// UpdatePasswd 修改密码
func UpdatePasswd(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type PasswdRequest struct {
		UserID   int    `json:"user_id" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	var req PasswdRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := coll.UpdateOne(ctx, bson.M{"id": req.UserID}, bson.M{"$set": bson.M{"password": req.Password}})
	if err != nil {
		utils.ServerError(c, "修改密码失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "修改密码成功",
	})
}

// UserCount 获取当天新增用户数量
func UserCount(c *gin.Context) {
	userColl := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	today := time.Now().Truncate(24 * time.Hour)
	count, _ := userColl.CountDocuments(ctx, bson.M{"created_at": bson.M{"$gte": today}})

	c.JSON(200, gin.H{
		"status": 200,
		"data":    count,
	})
}

// OrderCount 获取当天新增订单数量
func OrderCount(c *gin.Context) {
	orderColl := database.GetCollection(database.CollectionOrders)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	today := time.Now().Truncate(24 * time.Hour)
	count, _ := orderColl.CountDocuments(ctx, bson.M{"created_at": bson.M{"$gte": today}})

	c.JSON(200, gin.H{
		"status": 200,
		"data":    count,
	})
}

// AllUserCount 获取所有用户数量
func AllUserCount(c *gin.Context) {
	userColl := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := userColl.CountDocuments(ctx, bson.M{})

	c.JSON(200, gin.H{
		"status": 200,
		"data":    count,
	})
}

// AllOrderCount 获取所有订单数量
func AllOrderCount(c *gin.Context) {
	orderColl := database.GetCollection(database.CollectionOrders)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := orderColl.CountDocuments(ctx, bson.M{})

	c.JSON(200, gin.H{
		"status": 200,
		"data":    count,
	})
}

// RestaurantCount 获取餐馆数量
func RestaurantCount(c *gin.Context) {
	restaurantColl := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := restaurantColl.CountDocuments(ctx, bson.M{})

	c.JSON(200, gin.H{
		"status": 200,
		"data":    count,
	})
}

// MyOrder 获取我的订单
func MyOrder(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	restaurantColl := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var restaurant models.Restaurant
	err := restaurantColl.FindOne(ctx, bson.M{"user_id": adminID}).Decode(&restaurant)
	if err != nil {
		utils.NotFound(c, "没有餐馆")
		return
	}

	orderColl := database.GetCollection(database.CollectionOrders)
	cursor, err := orderColl.Find(ctx, bson.M{"restaurant_id": restaurant.IDNum})
	if err != nil {
		utils.ServerError(c, "获取订单失败")
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		utils.ServerError(c, "获取订单失败")
		return
	}

	c.JSON(200, gin.H{
		"status": 200,
		"data":   orders,
	})
}

// MyOrderPrice 获取我的订单收入
func MyOrderPrice(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	restaurantColl := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var restaurant models.Restaurant
	err := restaurantColl.FindOne(ctx, bson.M{"user_id": adminID}).Decode(&restaurant)
	if err != nil {
		utils.NotFound(c, "没有餐馆")
		return
	}

	orderColl := database.GetCollection(database.CollectionOrders)
	cursor, err := orderColl.Find(ctx, bson.M{"restaurant_id": restaurant.IDNum, "status": 3})
	if err != nil {
		utils.ServerError(c, "获取订单失败")
		return
	}
	defer cursor.Close(ctx)

	var orders []models.Order
	if err := cursor.All(ctx, &orders); err != nil {
		utils.ServerError(c, "获取订单失败")
		return
	}

	var total float64
	for _, order := range orders {
		total += order.TotalPrice
	}

	c.JSON(200, gin.H{
		"status": 200,
		"data":    total,
	})
}

// UploadToken 获取上传Token
func UploadToken(c *gin.Context) {
	// 返回一个模拟的上传token
	c.JSON(200, gin.H{
		"status": 200,
		"data": gin.H{
			"token": "mock-upload-token",
			"key":   "mock-key",
		},
		"message": "获取上传token成功",
	})
}
