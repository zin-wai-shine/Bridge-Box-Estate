package models

import (
	"time"

	"gorm.io/gorm"
)

// Role type for user roles
type Role string

const (
	RoleAgent  Role = "Agent"
	RoleOwner  Role = "Owner"
	RoleClient Role = "Client"
	RoleAdmin  Role = "Admin"
)

// User represents a platform user
type User struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	Email        string         `gorm:"uniqueIndex;not null;size:255" json:"email"`
	PasswordHash string         `gorm:"not null" json:"-"`
	Role         Role           `gorm:"type:varchar(20);not null;default:'Client'" json:"role"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	Properties     []Property     `gorm:"foreignKey:UserID" json:"properties,omitempty"`
	ChatHistories  []ChatHistory  `gorm:"foreignKey:UserID" json:"-"`
}
