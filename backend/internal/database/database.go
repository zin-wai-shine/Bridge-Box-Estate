package database

import (
	"log"

	"github.com/bribox/backend/internal/config"
	"github.com/bribox/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// Connect establishes the PostgreSQL connection and runs migrations
func Connect(cfg *config.Config) *gorm.DB {
	var err error
	DB, err = gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("✅ Database connected successfully")

	// Auto-migrate all models
	err = DB.AutoMigrate(
		&models.User{},
		&models.Property{},
		&models.Media{},
		&models.PermissionLog{},
		&models.ChatSession{},
		&models.ChatHistory{},
	)
	if err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	log.Println("✅ Database migrations completed")
	return DB
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
