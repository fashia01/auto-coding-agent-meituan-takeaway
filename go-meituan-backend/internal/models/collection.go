package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Collection 收藏模型
type Collection struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	IDNum        int              `bson:"id" json:"id"`                 // 自定义ID
	UserID       int              `bson:"user_id" json:"user_id"`       // 用户ID
	RestaurantID int              `bson:"restaurant_id" json:"restaurant_id"` // 餐馆ID
	Restaurant   *Restaurant     `bson:"restaurant" json:"restaurant"` // 餐馆信息
	CreateTime   time.Time       `bson:"create_time" json:"create_time"` // 收藏时间
}
