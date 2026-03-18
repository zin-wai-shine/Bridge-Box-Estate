package models

import "time"

// ChatRole represents who sent the message
type ChatRole string

const (
	ChatRoleUser ChatRole = "User"
	ChatRoleAI   ChatRole = "AI"
)

// ChatHistory stores conversation messages
type ChatHistory struct {
	ID             uint     `gorm:"primaryKey" json:"id"`
	UserID         uint     `gorm:"not null;index" json:"user_id"`
	Role           ChatRole `gorm:"type:varchar(10);not null" json:"role"`
	MessageContent string   `gorm:"type:text;not null" json:"message_content"`
	Timestamp      time.Time `gorm:"autoCreateTime" json:"timestamp"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"-"`
}
