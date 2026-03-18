package models

import "time"

// ChatSession represents a single conversation session
type ChatSession struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Title     string    `gorm:"type:varchar(255);not null" json:"title"`
	IsPinned  bool      `gorm:"default:false" json:"is_pinned"`
	IsShared  bool      `gorm:"default:false" json:"is_shared"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relations
	User     User          `gorm:"foreignKey:UserID" json:"-"`
	Messages []ChatHistory `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"messages,omitempty"`
}
