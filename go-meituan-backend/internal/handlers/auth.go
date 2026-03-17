package handlers

import (
	"context"
	"time"

	"github.com/auto-coding-agent/meituan-backend/internal/database"
	"github.com/auto-coding-agent/meituan-backend/internal/middleware"
	"github.com/auto-coding-agent/meituan-backend/internal/models"
	"github.com/auto-coding-agent/meituan-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// UserLogin 用户登录 (自动注册)
func UserLogin(c *gin.Context) {
	type LoginRequest struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 查找用户
	var user models.User
	err := coll.FindOne(ctx, bson.M{"username": req.Username, "status": models.StatusUser}).Decode(&user)

	if err == mongo.ErrNoDocuments {
		// 用户不存在，自动注册
		userID, err := utils.GetID("user_id")
		if err != nil {
			utils.ServerError(c, "注册失败")
			return
		}

		// 获取位置信息 (使用默认)
		city := "东莞市"
		_ = city // 预留位置信息

		// 尝试获取客户端 IP 位置
		_ = c.ClientIP()

		newUser := models.User{
			IDNum:       userID,
			Username:    req.Username,
			Password:    utils.DoubleMd5(req.Password),
			Status:      models.StatusUser,
			Avatar:      "http://i.waimai.meituan.com/static/img/default-avatar.png",
			City:        city,
			CreateTime:  time.Now(),
		}

		_, err = coll.InsertOne(ctx, newUser)
		if err != nil {
			utils.ServerError(c, "注册失败")
			return
		}

		// 设置 session
		middleware.SetSession(c, userID, 0)

		c.JSON(200, gin.H{
			"status":  200,
			"success": "注册用户并登录成功",
		})
		return
	}

	if err != nil {
		utils.ServerError(c, "登录失败")
		return
	}

	// 验证密码
	if user.Password != utils.DoubleMd5(req.Password) {
		utils.Fail(c, -1, "该用户已存在，密码输入错误")
		return
	}

	// 设置 session
	middleware.SetSession(c, user.IDNum, 0)

	c.JSON(200, gin.H{
		"status":  200,
		"success": "登录成功",
		"username": user.Username,
		"avatar":   user.Avatar,
	})
}

// AdminLogin 管理员登录 (自动注册)
func AdminLogin(c *gin.Context) {
	type LoginRequest struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 查找管理员
	var user models.User
	err := coll.FindOne(ctx, bson.M{"username": req.Username, "status": models.StatusAdmin}).Decode(&user)

	if err == mongo.ErrNoDocuments {
		// 管理员不存在，自动创建
		adminID, err := utils.GetID("admin_id")
		if err != nil {
			utils.ServerError(c, "创建失败")
			return
		}

		newUser := models.User{
			IDNum:      adminID,
			Username:   req.Username,
			Password:   utils.DoubleMd5(req.Password),
			Status:    models.StatusAdmin,
			Avatar:    "http://i.waimai.meituan.com/static/img/default-avatar.png",
			City:      "东莞市",
			CreateTime: time.Now(),
		}

		_, err = coll.InsertOne(ctx, newUser)
		if err != nil {
			utils.ServerError(c, "创建失败")
			return
		}

		// 设置 session
		middleware.SetSession(c, 0, adminID)

		c.JSON(200, gin.H{
			"status":  200,
			"success": "注册管理端并登录成功",
			"username": newUser.Username,
			"avatar":   newUser.Avatar,
		})
		return
	}

	if err != nil {
		utils.ServerError(c, "登录失败")
		return
	}

	// 验证密码
	if user.Password != utils.DoubleMd5(req.Password) {
		utils.Fail(c, -1, "该用户已存在，密码输入错误")
		return
	}

	// 设置 session
	middleware.SetSession(c, 0, user.IDNum)

	c.JSON(200, gin.H{
		"status":  200,
		"success": "登录成功",
		"username": user.Username,
		"avatar":   user.Avatar,
	})
}

// Logout 退出登录
func Logout(c *gin.Context) {
	middleware.ClearSession(c)
	c.JSON(200, gin.H{
		"status":  200,
		"success": "退出成功",
	})
}

// GetUserInfo 获取用户信息
func GetUserInfo(c *gin.Context) {
	userID := c.GetInt("user_id")
	adminID := c.GetInt("admin_id")

	if userID == 0 && adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	coll := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	var err error

	if userID != 0 {
		err = coll.FindOne(ctx, bson.M{"id": userID}).Decode(&user)
	} else {
		err = coll.FindOne(ctx, bson.M{"id": adminID}).Decode(&user)
	}

	if err != nil {
		utils.NotFound(c, "用户不存在")
		return
	}

	c.JSON(200, gin.H{
		"status": 200,
		"data": gin.H{
			"id":          user.IDNum,
			"username":    user.Username,
			"avatar":      user.Avatar,
			"status":      user.Status,
			"create_time": user.CreateTime,
		},
		"message": "获取用户信息成功",
	})
}

// SetUserInfo 设置用户信息
func SetUserInfo(c *gin.Context) {
	userID := c.GetInt("user_id")
	if userID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type UserInfoRequest struct {
		NickName string `json:"nickName"`
		Avatar   string `json:"avatarUrl"`
		City    string `json:"city"`
	}

	var req UserInfoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{}
	if req.Avatar != "" {
		update["avatar"] = req.Avatar
	}
	if req.NickName != "" {
		update["username"] = req.NickName
	}
	if req.City != "" {
		update["city"] = req.City
	}

	if len(update) == 0 {
		utils.Fail(c, -1, "没有需要更新的内容")
		return
	}

	_, err := coll.UpdateOne(ctx, bson.M{"id": userID}, bson.M{"$set": update})
	if err != nil {
		utils.ServerError(c, "更新失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "设置用户信息成功",
	})
}

// ChangeAvatar 更改头像
func ChangeAvatar(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type AvatarRequest struct {
		PicURL string `json:"pic_url" binding:"required"`
	}

	var req AvatarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := coll.UpdateOne(ctx, bson.M{"id": adminID}, bson.M{"$set": bson.M{"avatar": req.PicURL}})
	if err != nil {
		utils.ServerError(c, "更改头像失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "更改头像成功",
	})
}

// UserLoginTest 测试用 - 用户登录
func UserLoginTest(c *gin.Context) {
	username := c.Query("username")
	password := c.Query("password")

	if username == "" || password == "" {
		c.JSON(400, gin.H{"error": "missing params"})
		return
	}

	// 模拟登录，设置 session
	coll := database.GetCollection(database.CollectionUsers)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var user models.User
	err := coll.FindOne(ctx, bson.M{"username": username, "status": models.StatusUser}).Decode(&user)
	if err == mongo.ErrNoDocuments || user.Password != utils.DoubleMd5(password) {
		c.JSON(401, gin.H{"error": "invalid credentials"})
		return
	}

	middleware.SetSession(c, user.IDNum, 0)
	c.JSON(200, gin.H{"status": "ok", "user_id": user.IDNum})
}
