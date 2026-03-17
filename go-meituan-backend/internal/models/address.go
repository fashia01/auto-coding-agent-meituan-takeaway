package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Address 收货地址模型
type Address struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name       string           `bson:"name" json:"name"`             // 收货人姓名
	Phone      string           `bson:"phone" json:"phone"`          // 收货人电话
	Address    string           `bson:"address" json:"address"`       // 详细地址
	Gender     int             `bson:"gender" json:"gender"`        // 性别: 1男 2女
	Lng        string           `bson:"lng" json:"lng"`              // 经度
	Lat        string           `bson:"lat" json:"lat"`              // 纬度
	UserID     int              `bson:"user_id" json:"user_id"`      // 用户ID
	IDNum      int              `bson:"id" json:"id"`                // 自定义ID
}
