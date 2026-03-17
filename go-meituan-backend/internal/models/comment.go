package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Comment 评论模型
type Comment struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	IDNum          int              `bson:"id" json:"id"`                       // 自定义ID
	UserID         int              `bson:"user_id" json:"user_id"`             // 用户ID
	Username       string           `bson:"user_name" json:"user_name"`         // 用户名
	Avatar         string           `bson:"avatar" json:"avatar"`               // 头像
	RestaurantID   int              `bson:"restaurant_id" json:"restaurant_id"`   // 餐馆ID
	OrderID        int              `bson:"order_id" json:"order_id"`           // 订单ID
	Content        string           `bson:"comment_data" json:"comment_data"`    // 评论内容
	PicURLs        []string         `bson:"pic_url" json:"pic_url"`            // 图片
	FoodScore      float64          `bson:"food_score" json:"food_score"`       // 口味评分
	DeliveryScore  float64          `bson:"delivery_score" json:"delivery_score"` // 配送评分
	QualityScore   float64          `bson:"quality_score" json:"quality_score"` // 质量评分
	CommentTime    time.Time        `bson:"comment_time" json:"comment_time"`   // 评论时间
	Reply          string           `bson:"reply" json:"reply"`                 // 回复内容
	ReplyContent   string           `bson:"reply_content" json:"reply_content"` // 回复内容
	ReplyTime      time.Time        `bson:"reply_time" json:"reply_time"`       // 回复时间
}
