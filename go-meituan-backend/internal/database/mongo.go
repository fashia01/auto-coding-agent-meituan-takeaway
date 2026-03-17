package database

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	client *mongo.Client
	db     *mongo.Database
	mu     sync.RWMutex
)

func Connect(uri, dbName string) error {
	mu.Lock()
	defer mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(uri)
	c, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Ping the database
	if err := c.Ping(ctx, nil); err != nil {
		return fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	client = c
	db = c.Database(dbName)
	log.Printf("Connected to MongoDB: %s", dbName)
	return nil
}

func Disconnect() error {
	mu.Lock()
	defer mu.Unlock()

	if client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := client.Disconnect(ctx); err != nil {
			return fmt.Errorf("failed to disconnect from MongoDB: %w", err)
		}
		log.Println("Disconnected from MongoDB")
	}
	return nil
}

func GetDB() *mongo.Database {
	mu.RLock()
	defer mu.RUnlock()
	return db
}

func GetClient() *mongo.Client {
	mu.RLock()
	defer mu.RUnlock()
	return client
}
