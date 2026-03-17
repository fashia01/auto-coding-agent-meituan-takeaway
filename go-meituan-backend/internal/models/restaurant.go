package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Restaurant 餐馆模型
type Restaurant struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	IDNum            int              `bson:"id" json:"id"`                         // 自定义ID
	UserID           int              `bson:"user_id" json:"user_id"`              // 所属用户ID
	Name             string           `bson:"name" json:"name"`                   // 餐馆名称
	PicURL           string           `bson:"pic_url" json:"pic_url"`             // 餐馆图片
	MonthSales       int              `bson:"month_sales" json:"month_sales"`      // 月售
	MonthSalesTip    string           `bson:"month_sales_tip" json:"month_sales_tip"`
	WMPScore         float64          `bson:"wm_poi_score" json:"wm_poi_score"`    // 商家评分
	DeliveryScore    float64          `bson:"delivery_score" json:"delivery_score"` // 配送评分
	QualityScore     float64          `bson:"quality_score" json:"quality_score"`  // 质量评分
	FoodScore        float64          `bson:"food_score" json:"food_score"`        // 口味评分
	PackScore        float64          `bson:"pack_score" json:"pack_score"`        // 包装评分
	Distance         string           `bson:"distance" json:"distance"`           // 距离
	DeliveryTimeTip  string           `bson:"delivery_time_tip" json:"delivery_time_tip"`
	ShippingFeeTip   string           `bson:"shipping_fee_tip" json:"shipping_fee_tip"`
	MinPriceTip      string           `bson:"min_price_tip" json:"min_price_tip"`
	AveragePriceTip  string           `bson:"average_price_tip" json:"average_price_tip"`
	ThirdCategory    string           `bson:"third_category" json:"third_category"` // 分类
	Discounts        []Discount      `bson:"discounts2" json:"discounts2"`        // 优惠活动
	ShippingTime     string           `bson:"shipping_time" json:"shipping_time"`
	ShoppingTimeStart string          `bson:"shopping_time_start" json:"shopping_time_start"`
	ShoppingTimeEnd   string          `bson:"shopping_time_end" json:"shopping_time_end"`
	ShippingFee      float64          `bson:"shipping_fee" json:"shipping_fee"`      // 配送费
	MinPrice         float64          `bson:"min_price" json:"min_price"`          // 起送价
	Bulletin         string           `bson:"bulletin" json:"bulletin"`            // 公告
	Address          string           `bson:"address" json:"address"`              // 地址
	CallCenter       string           `bson:"call_center" json:"call_center"`      // 电话
	Lng              string           `bson:"lng" json:"lng"`                     // 经度
	Lat              string           `bson:"lat" json:"lat"`                     // 纬度
	CommentNumber    int              `bson:"comment_number" json:"comment_number"` // 评论数
	CreatedAt        time.Time        `bson:"created_at" json:"created_at"`
}

// Discount 优惠活动
type Discount struct {
	Info         string `bson:"info" json:"info"`
	IconURL      string `bson:"icon_url" json:"icon_url"`
	PromotionType int   `bson:"promotion_type" json:"promotion_type"`
}
