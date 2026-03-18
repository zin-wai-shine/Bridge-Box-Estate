package models

import "time"

// PermissionStatus for approval workflow
type PermissionStatus string

const (
	PermPending  PermissionStatus = "Pending"
	PermApproved PermissionStatus = "Approved"
	PermDenied   PermissionStatus = "Denied"
)

// PermissionLog tracks owner-agent permission requests
type PermissionLog struct {
	ID             uint             `gorm:"primaryKey" json:"id"`
	OwnerUserID    uint             `gorm:"not null;index" json:"owner_user_id"`
	AgentUserID    uint             `gorm:"not null;index" json:"agent_user_id"`
	PropertyID     uint             `gorm:"not null;index" json:"property_id"`
	Status         PermissionStatus `gorm:"type:varchar(20);not null;default:'Pending'" json:"status"`
	ChatLogSnippet string           `gorm:"type:text" json:"chat_log_snippet"`
	CreatedAt      time.Time        `json:"created_at"`

	// Relations
	Owner    User     `gorm:"foreignKey:OwnerUserID" json:"owner,omitempty"`
	Agent    User     `gorm:"foreignKey:AgentUserID" json:"agent,omitempty"`
	Property Property `gorm:"foreignKey:PropertyID" json:"property,omitempty"`
}
