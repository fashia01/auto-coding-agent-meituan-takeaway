package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// UserStatus 用户状态
type UserStatus int

const (
	StatusUser UserStatus = 1 // 普通用户
	StatusAdmin           = 2 // 商家管理员
	StatusSuperAdmin      = 3 // 超级管理员
)

// User 用户模型
type User struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username    string            `bson:"username" json:"username"`
	Password    string            `bson:"password" json:"-"`
	OpenID      string            `bson:"openid,omitempty" json:"openid,omitempty"`
	IDNum       int              `bson:"id" json:"id"` // 自定义ID
	Status      UserStatus       `bson:"status" json:"status"`
	Avatar      string           `bson:"avatar" json:"avatar"`
	City        string           `bson:"city" json:"city"`
	Phone       string           `bson:"phone" json:"phone,omitempty"`
	CreateTime  time.Time        `bson:"create_time" json:"create_time"`
	CreatedAt   time.Time        `bson:"created_at" json:"created_at"`
}
