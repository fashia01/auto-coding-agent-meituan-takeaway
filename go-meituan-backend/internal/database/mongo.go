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

// Collection names
const (
	CollectionUsers      = "users"
	CollectionAddresses = "addresses"
	CollectionRestaurants = "restaurants"
	CollectionCategories = "categories"
	CollectionFoods     = "foods"
	CollectionOrders    = "orders"
	CollectionComments  = "comments"
	CollectionPayments = "payments"
	CollectionFootprints = "footprints"
	CollectionCollections = "collections"
	CollectionIDs       = "ids"
)

func Connect(uri, dbName string) error {
	mu.Lock()
	defer mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Configure connection pool
	clientOptions := options.Client().
		ApplyURI(uri).
		SetMaxPoolSize(100).
		SetMinPoolSize(10).
		SetMaxConnIdleTime(30 * time.Second).
		SetConnectTimeout(10 * time.Second).
		SetServerSelectionTimeout(10 * time.Second)

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

	// Initialize collections
	if err := initCollections(); err != nil {
		log.Printf("Warning: Failed to initialize collections: %v", err)
	}

	return nil
}

func initCollections() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	collections := []string{
		CollectionUsers,
		CollectionAddresses,
		CollectionRestaurants,
		CollectionCategories,
		CollectionFoods,
		CollectionOrders,
		CollectionComments,
		CollectionPayments,
		CollectionFootprints,
		CollectionCollections,
		CollectionIDs,
	}

	for _, name := range collections {
		err := db.CreateCollection(ctx, name)
		if err != nil {
			// Check if collection already exists
			if mongo.IsDuplicateKeyError(err) {
				continue
			}
			log.Printf("Creating collection %s: %v", name, err)
		} else {
			log.Printf("Created collection: %s", name)
		}
	}

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

// GetCollection returns a collection by name
func GetCollection(name string) *mongo.Collection {
	mu.RLock()
	defer mu.RUnlock()
	return db.Collection(name)
}
