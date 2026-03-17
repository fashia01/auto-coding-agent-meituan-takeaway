package utils

import (
	"context"
	"fmt"
	"time"

	"github.com/auto-coding-agent/meituan-backend/internal/database"
	"github.com/auto-coding-agent/meituan-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
)

// IDGenerator ID生成器
type IDGenerator struct {
	CollectionName string
}

// NewIDGenerator 创建新的 ID 生成器
func NewIDGenerator(name string) *IDGenerator {
	return &IDGenerator{CollectionName: name}
}

// GetID 获取下一个 ID
func (g *IDGenerator) GetID() (int, error) {
	coll := database.GetCollection(database.CollectionIDs)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 查找当前 ID
	var ids models.IDs
	err := coll.FindOne(ctx, bson.M{"name": g.CollectionName}).Decode(&ids)
	if err != nil {
		// 不存在，创建新的
		ids = models.IDs{
			Name:  g.CollectionName,
			MaxID: 1,
		}
		_, err = coll.InsertOne(ctx, ids)
		if err != nil {
			return 0, fmt.Errorf("failed to insert ID: %w", err)
		}
		return 1, nil
	}

	// 更新 ID
	newID := ids.MaxID + 1
	_, err = coll.UpdateOne(ctx, bson.M{"name": g.CollectionName}, bson.M{"$set": bson.M{"max_id": newID}})
	if err != nil {
		return 0, fmt.Errorf("failed to update ID: %w", err)
	}

	return newID, nil
}

// GetIDWithCtx 带上下文的 ID 生成器
func GetID(name string) (int, error) {
	gen := NewIDGenerator(name)
	return gen.GetID()
}
