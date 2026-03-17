package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Category 分类模型
type Category struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	IDNum          int              `bson:"id" json:"id"`                       // 自定义ID
	Name           string           `bson:"name" json:"name"`                   // 分类名称
	Description    string           `bson:"description" json:"description"`     // 描述
	RestaurantID   int              `bson:"restaurant_id" json:"restaurant_id"` // 餐馆ID
	RestaurantIDNum int             `bson:"-" json:"restaurant_id_num"`         // 餐馆自定义ID
	Foods          []primitive.ObjectID `bson:"spus" json:"spus"`              // 菜品ID列表
}
