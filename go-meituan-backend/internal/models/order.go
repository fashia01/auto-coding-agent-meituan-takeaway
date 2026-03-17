package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OrderStatus 订单状态
type OrderStatus string

const (
	OrderStatusUnpaid    OrderStatus = "未支付"      // 未支付
	OrderStatusPaid      OrderStatus = "已支付"      // 已支付
	OrderStatusConfirmed OrderStatus = "已确认"      // 已确认
	OrderStatusCompleted OrderStatus = "已完成"      // 已完成
	OrderStatusCancelled OrderStatus = "已取消"      // 已取消
	OrderStatusExpired   OrderStatus = "超过支付期限" // 过期
)

// Order 订单模型
type Order struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	IDNum             int              `bson:"id" json:"id"`                            // 自定义ID
	UserID            int              `bson:"user_id" json:"user_id"`                  // 用户ID
	RestaurantID      int              `bson:"restaurant_id" json:"restaurant_id"`      // 餐馆ID
	TotalPrice        float64          `bson:"total_price" json:"total_price"`          // 总价
	Foods            []OrderFood     `bson:"foods" json:"foods"`                    // 菜品列表
	Address          primitive.ObjectID `bson:"address" json:"address"`                // 地址ID
	AddressInfo      *Address        `bson:"-" json:"address_info,omitempty"`        // 地址信息
	RestaurantInfo   *Restaurant     `bson:"-" json:"restaurant_info,omitempty"`     // 餐馆信息
	Remark           string           `bson:"remark" json:"remark"`                   // 备注
	Status            OrderStatus     `bson:"status" json:"status"`                  // 状态
	Code             int              `bson:"code" json:"code"`                      // 支付码
	ShippingFee      float64          `bson:"shipping_fee" json:"shipping_fee"`       // 配送费
	Confirm           bool             `bson:"confirm" json:"confirm"`                // 是否已确认
	HasComment        bool             `bson:"has_comment" json:"has_comment"`        // 是否已评价
	CreateTime        time.Time       `bson:"create_time" json:"create_time"`         // 创建时间
	CreateTimeTimestamp int           `bson:"create_time_timestamp" json:"create_time_timestamp"`
	PayRemainTime     int             `bson:"pay_remain_time" json:"pay_remain_time"` // 支付剩余时间(秒)
}

// OrderFood 订单中的菜品
type OrderFood struct {
	Name       string  `bson:"name" json:"name"`          // 菜品名称
	Price      float64 `bson:"price" json:"price"`        // 单价
	Num        int     `bson:"num" json:"num"`            // 数量
	TotalPrice float64 `bson:"total_price" json:"total_price"` // 小计
	Spec       string  `bson:"spec" json:"spec"`           // 规格
	PicURL     string  `bson:"pic_url" json:"pic_url"`     // 图片
}
