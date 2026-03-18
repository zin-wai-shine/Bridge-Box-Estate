package models

import (
	"time"

	"gorm.io/gorm"
)

// PropertyStatus represents the listing status
type PropertyStatus string

const (
	StatusDraft  PropertyStatus = "Draft"
	StatusActive PropertyStatus = "Active"
	StatusSold   PropertyStatus = "Sold"
)

// Property represents a real estate listing
type Property struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	UserID        uint           `gorm:"not null;index" json:"user_id"`
	Address       string         `gorm:"size:500" json:"address"`
	City          string         `gorm:"size:100" json:"city"`
	State         string         `gorm:"size:100" json:"state"`
	Zip           string         `gorm:"size:20" json:"zip"`
	Price         float64        `json:"price"`
	Bedrooms      int            `json:"bedrooms"`
	Bathrooms     int            `json:"bathrooms"`
	SquareFootage int            `json:"square_footage"`
	Description   string         `gorm:"type:text" json:"description"`
	Status        PropertyStatus `gorm:"type:varchar(20);not null;default:'Draft'" json:"status"`
	SourceURL     string         `gorm:"size:1000" json:"source_url"` // AES-256 encrypted
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User  User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Media []Media `gorm:"foreignKey:PropertyID" json:"media,omitempty"`
}
