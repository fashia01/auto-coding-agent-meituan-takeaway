package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PayStatus 支付状态
type PayStatus string

const (
	PayStatusUnpaid  PayStatus = "未支付"   // 未支付
	PayStatusSuccess PayStatus = "支付成功" // 支付成功
)

// Pay 支付模型
type Pay struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	IDNum        int              `bson:"id" json:"id"`                  // 自定义ID
	OrderID      int              `bson:"order_id" json:"order_id"`        // 订单ID
	Amount       float64          `bson:"amount" json:"amount"`          // 金额
	TradeName    string           `bson:"trade_name" json:"trade_name"`  // 交易名称
	PayType      string           `bson:"pay_type" json:"pay_type"`       // 支付方式: 支付宝/微信
	Status       PayStatus        `bson:"status" json:"status"`          // 状态
	Method       string           `bson:"method" json:"method"`           // 支付方法: scan/wap/mock
	Code         int              `bson:"code" json:"code"`              // 支付结果码
	OutTradeNo   string           `bson:"out_trade_no" json:"out_trade_no"` // 外部订单号
	CreateTime   time.Time       `bson:"create_time" json:"create_time"` // 创建时间
}
