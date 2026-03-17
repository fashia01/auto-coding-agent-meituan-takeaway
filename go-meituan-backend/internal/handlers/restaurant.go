package handlers

import (
	"context"
	"math"
	"sort"
	"strconv"
	"time"

	"github.com/auto-coding-agent/meituan-backend/internal/database"
	"github.com/auto-coding-agent/meituan-backend/internal/models"
	"github.com/auto-coding-agent/meituan-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// GetRestaurants 获取餐馆列表
func GetRestaurants(c *gin.Context) {
	lat := c.Query("lat")
	lng := c.Query("lng")
	sortType := c.DefaultQuery("sort", "1") // 1: 智能排序, 2: 销量最高, 3: 距离最近
	offset := c.DefaultQuery("offset", "0")
	limit := c.DefaultQuery("limit", "20")

	coll := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 构建查询条件
	filter := bson.M{}
	if userID := c.GetInt("user_id"); userID != 0 {
		filter["user_id"] = bson.M{"$ne": userID}
	}

	// 查询餐馆
	cursor, err := coll.Find(ctx, filter)
	if err != nil {
		utils.ServerError(c, "获取餐馆列表失败")
		return
	}
	defer cursor.Close(ctx)

	var restaurants []models.Restaurant
	if err := cursor.All(ctx, &restaurants); err != nil {
		utils.ServerError(c, "获取餐馆列表失败")
		return
	}

	// 如果提供了位置，计算距离
	if lat != "" && lng != "" {
		userLat, _ := strconv.ParseFloat(lat, 64)
		userLng, _ := strconv.ParseFloat(lng, 64)

		for i := range restaurants {
			if restaurants[i].Lat != "" && restaurants[i].Lng != "" {
				rLat, _ := strconv.ParseFloat(restaurants[i].Lat, 64)
				rLng, _ := strconv.ParseFloat(restaurants[i].Lng, 64)
				restaurants[i].Distance = calculateDistance(userLat, userLng, rLat, rLng)
			}
		}
	}

	// 排序
	switch sortType {
	case "2": // 销量最高
		sort.Slice(restaurants, func(i, j int) bool {
			return restaurants[i].MonthSales > restaurants[j].MonthSales
		})
	case "3": // 距离最近
		sort.Slice(restaurants, func(i, j int) bool {
			if restaurants[i].Distance == "" || restaurants[j].Distance == "" {
				return false
			}
			di, _ := strconv.ParseFloat(restaurants[i].Distance, 64)
			dj, _ := strconv.ParseFloat(restaurants[j].Distance, 64)
			return di < dj
		})
	default: // 智能排序 (评分优先)
		sort.Slice(restaurants, func(i, j int) bool {
			return restaurants[i].WMPScore > restaurants[j].WMPScore
		})
	}

	// 分页
	offsetInt, _ := strconv.Atoi(offset)
	limitInt, _ := strconv.Atoi(limit)
	if offsetInt > len(restaurants) {
		restaurants = []models.Restaurant{}
	} else {
		if offsetInt+limitInt > len(restaurants) {
			restaurants = restaurants[offsetInt:]
		} else {
			restaurants = restaurants[offsetInt : offsetInt+limitInt]
		}
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    restaurants,
		"message": "获取餐馆列表成功",
	})
}

// GetRestaurant 获取指定餐馆
func GetRestaurant(c *gin.Context) {
	id := c.Param("id")

	coll := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var restaurant models.Restaurant
	err := coll.FindOne(ctx, bson.M{"id": id}).Decode(&restaurant)
	if err == mongo.ErrNoDocuments {
		utils.NotFound(c, "餐馆不存在")
		return
	}
	if err != nil {
		utils.ServerError(c, "获取餐馆详情失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    restaurant,
		"message": "获取餐馆详情成功",
	})
}

// AddRestaurant 添加餐馆
func AddRestaurant(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	type RestaurantRequest struct {
		Name             string  `json:"name" binding:"required"`
		PicURL           string  `json:"pic_url"`
		Address          string  `json:"address"`
		CallCenter       string  `json:"call_center"`
		Lng              string  `json:"lng"`
		Lat              string  `json:"lat"`
		ShippingFee      float64 `json:"shipping_fee"`
		MinPrice        float64 `json:"min_price"`
		DeliveryTimeTip  string  `json:"delivery_time_tip"`
		ShippingTimeTip  string  `json:"shipping_time_tip"`
		ShippingTime     string  `json:"shipping_time"`
		ThirdCategory   string  `json:"third_category"`
		Bulletin        string  `json:"bulletin"`
	}

	var req RestaurantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	restaurantID, err := utils.GetID("restaurant_id")
	if err != nil {
		utils.ServerError(c, "添加餐馆失败")
		return
	}

	restaurant := models.Restaurant{
		IDNum:             restaurantID,
		UserID:            adminID,
		Name:              req.Name,
		PicURL:            req.PicURL,
		Address:           req.Address,
		CallCenter:       req.CallCenter,
		Lng:               req.Lng,
		Lat:               req.Lat,
		ShippingFee:       req.ShippingFee,
		MinPrice:         req.MinPrice,
		DeliveryTimeTip:   req.DeliveryTimeTip,
		ShippingFeeTip:    "配送费" + strconv.FormatFloat(req.ShippingFee, 'f', 2, 64) + "元",
		MinPriceTip:      "起送" + strconv.FormatFloat(req.MinPrice, 'f', 2, 64) + "元",
		ShippingTime:     req.ShippingTime,
		ThirdCategory:    req.ThirdCategory,
		Bulletin:         req.Bulletin,
		WMPScore:         5.0,
		DeliveryScore:    5.0,
		QualityScore:    5.0,
		FoodScore:        5.0,
		PackScore:        5.0,
		CommentNumber:    0,
		MonthSales:       0,
		CreatedAt:        time.Now(),
	}

	_, err = coll.InsertOne(ctx, restaurant)
	if err != nil {
		utils.ServerError(c, "添加餐馆失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"message": "添加餐馆成功",
	})
}

// SearchRestaurant 搜索餐馆
func SearchRestaurant(c *gin.Context) {
	keyword := c.Query("keyword")

	if keyword == "" {
		utils.ParamError(c, "参数错误")
		return
	}

	coll := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := coll.Find(ctx, bson.M{"name": bson.M{"$regex": keyword}})
	if err != nil {
		utils.ServerError(c, "搜索餐馆失败")
		return
	}
	defer cursor.Close(ctx)

	var restaurants []models.Restaurant
	if err := cursor.All(ctx, &restaurants); err != nil {
		utils.ServerError(c, "搜索餐馆失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    restaurants,
		"message": "搜索餐馆成功",
	})
}

// GetAllRestaurant 获取全部餐馆 (管理员)
func GetAllRestaurant(c *gin.Context) {
	adminID := c.GetInt("admin_id")
	if adminID == 0 {
		utils.Unauthorized(c, "")
		return
	}

	coll := database.GetCollection(database.CollectionRestaurants)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cursor, err := coll.Find(ctx, bson.M{})
	if err != nil {
		utils.ServerError(c, "获取餐馆列表失败")
		return
	}
	defer cursor.Close(ctx)

	var restaurants []models.Restaurant
	if err := cursor.All(ctx, &restaurants); err != nil {
		utils.ServerError(c, "获取餐馆列表失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    restaurants,
		"message": "获取餐馆列表成功",
	})
}

// GetMyRestaurant 获取我的餐馆
func GetMyRestaurant(c *gin.Context) {
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
	if err == mongo.ErrNoDocuments {
		utils.NotFound(c, "没有餐馆")
		return
	}
	if err != nil {
		utils.ServerError(c, "获取餐馆失败")
		return
	}

	c.JSON(200, gin.H{
		"status":  200,
		"data":    restaurant,
		"message": "获取餐馆成功",
	})
}

// calculateDistance 计算两点之间的距离 (km)
func calculateDistance(lat1, lng1, lat2, lng2 float64) string {
	const R = 6371 // 地球半径 (km)

	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLng/2)*math.Sin(dLng/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	d := R * c

	if d < 1 {
		return strconv.FormatFloat(d*1000, 'f', 0, 64) + "m"
	}
	return strconv.FormatFloat(d, 'f', 1, 64) + "km"
}
