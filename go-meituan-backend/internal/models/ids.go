package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// IDs ID生成器模型
type IDs struct {
	ID      primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name    string           `bson:"name" json:"name"` // ID名称 (如: user_id, order_id)
	MaxID   int              `bson:"max_id" json:"max_id"` // 当前最大ID
}
