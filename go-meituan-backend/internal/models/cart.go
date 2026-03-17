package models

import "time"

// CartItem 购物车项
type CartItem struct {
	IDNum         int       `bson:"id" json:"id"`                     // 购物车项ID
	UserID        int       `bson:"user_id" json:"user_id"`           // 用户ID
	RestaurantID  int       `bson:"restaurant_id" json:"restaurant_id"` // 餐馆ID
	FoodID        int       `bson:"food_id" json:"food_id"`           // 菜品ID
	Name          string    `bson:"name" json:"name"`                 // 菜品名称
	Price         float64   `bson:"price" json:"price"`              // 价格
	Num           int       `bson:"num" json:"num"`                   // 数量
	FoodsPic      string    `bson:"foods_pic" json:"foods_pic"`      // 菜品图片
	RestaurantName string   `bson:"restaurant_name" json:"restaurant_name"` // 餐馆名称
	PicURL        string    `bson:"pic_url" json:"pic_url"`           // 餐馆图片
	CreatedAt     time.Time `bson:"created_at" json:"created_at"`
}

// Cart 购物车
type Cart struct {
	UserID      int         `bson:"user_id" json:"user_id"`
	RestaurantID int        `bson:"restaurant_id" json:"restaurant_id"`
	TotalPrice  float64     `bson:"total_price" json:"total_price"`
	TotalNum    int         `bson:"total_num" json:"total_num"`
	Items       []CartItem  `bson:"items" json:"items"`
	UpdatedAt   time.Time   `bson:"updated_at" json:"updated_at"`
}
