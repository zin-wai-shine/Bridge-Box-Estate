package models

import "time"

// MediaType represents the type of media
type MediaType string

const (
	MediaImage MediaType = "Image"
	MediaVideo MediaType = "Video"
)

// EnhancementStatus tracks image AI processing
type EnhancementStatus string

const (
	EnhancePending    EnhancementStatus = "Pending"
	EnhanceProcessing EnhancementStatus = "Processing"
	EnhanceCompleted  EnhancementStatus = "Completed"
	EnhanceFailed     EnhancementStatus = "Failed"
)

// Media represents property images/videos
type Media struct {
	ID                uint              `gorm:"primaryKey" json:"id"`
	PropertyID        uint              `gorm:"not null;index" json:"property_id"`
	URL               string            `gorm:"size:1000" json:"url"`                // Enhanced image URL
	OriginalURL       string            `gorm:"size:1000" json:"original_url"`       // Scraped original
	MediaType         MediaType         `gorm:"type:varchar(20);default:'Image'" json:"media_type"`
	Resolution        string            `gorm:"size:50" json:"resolution"`
	EnhancementStatus EnhancementStatus `gorm:"type:varchar(20);default:'Pending'" json:"enhancement_status"`
	CreatedAt         time.Time         `json:"created_at"`
}
