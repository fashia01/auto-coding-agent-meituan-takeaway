package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Footprint 足迹模型
type Footprint struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	IDNum        int              `bson:"id" json:"id"`                 // 自定义ID
	UserID       int              `bson:"user_id" json:"user_id"`      // 用户ID
	RestaurantID int              `bson:"restaurant_id" json:"restaurant_id"` // 餐馆ID
	Restaurant   *Restaurant     `bson:"restaurant" json:"restaurant"` // 餐馆信息
	ViewTime     time.Time       `bson:"view_time" json:"view_time"`  // 浏览时间
}
