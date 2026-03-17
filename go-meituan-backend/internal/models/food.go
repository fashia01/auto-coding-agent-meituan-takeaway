package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// FoodStatus 菜品状态
type FoodStatus int

const (
	FoodStatusOn  FoodStatus = 1 // 上架
	FoodStatusOff           = 0 // 下架
)

// Food 菜品模型
type Food struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	IDNum        int              `bson:"id" json:"id"`                          // 自定义ID
	RestaurantID int              `bson:"restaurant_id" json:"restaurant_id"`    // 餐馆ID
	Name         string           `bson:"name" json:"name"`                      // 菜品名称
	Description  string           `bson:"description" json:"description"`        // 描述
	PicURL       string           `bson:"pic_url" json:"pic_url"`               // 图片
	Price        float64          `bson:"price" json:"price"`                   // 价格
	SKU          []FoodSKU       `bson:"skus" json:"skus"`                    // 规格
	MonthSales   int              `bson:"month_sales" json:"month_sales"`        // 月售
	Status       FoodStatus       `bson:"status" json:"status"`                 // 状态
	CategoryID   int              `bson:"category_id" json:"category_id"`       // 分类ID
}

// FoodSKU 菜品规格
type FoodSKU struct {
	ID     int     `bson:"id" json:"id"`       // 规格ID
	Price  float64 `bson:"price" json:"price"` // 价格
	Spec   string  `bson:"spec" json:"spec"`   // 规格名称
	Stock  int     `bson:"stock" json:"stock"` // 库存
}
