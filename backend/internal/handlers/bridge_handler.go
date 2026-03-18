package handlers

import (
	"net/http"

	"github.com/bribox/backend/internal/models"
	"github.com/bribox/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// BridgeHandler handles scraping and AI processing endpoints
type BridgeHandler struct {
	DB            *gorm.DB
	EncryptionKey string
}

// NewBridgeHandler creates a new BridgeHandler
func NewBridgeHandler(db *gorm.DB, encryptionKey string) *BridgeHandler {
	return &BridgeHandler{DB: db, EncryptionKey: encryptionKey}
}

// ScrapeRequest represents a scraping request
type ScrapeRequest struct {
	SourceURL string `json:"source_url" binding:"required,url"`
}

// Scrape triggers property scraping, parsing, and image enhancement
func (h *BridgeHandler) Scrape(c *gin.Context) {
	var req ScrapeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")

	// Encrypt the source URL before storing
	encryptedURL, err := utils.Encrypt(req.SourceURL, h.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt URL"})
		return
	}

	// Phase 4: This will integrate with actual scraper + AI services
	// For now, create a mock draft property from the URL
	property := models.Property{
		UserID:      userID.(uint),
		Address:     "123 Sample Street",
		City:        "Sample City",
		State:       "CA",
		Zip:         "90210",
		Price:       450000,
		Bedrooms:    3,
		Bathrooms:   2,
		SquareFootage: 1800,
		Description: "Beautiful 3-bedroom home scraped from " + req.SourceURL + ". This is a placeholder description that will be replaced with AI-parsed content.",
		Status:      models.StatusDraft,
		SourceURL:   encryptedURL,
	}

	if err := h.DB.Create(&property).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create property"})
		return
	}

	// Create mock media entries
	media := models.Media{
		PropertyID:        property.ID,
		URL:               "https://placeholder.co/800x600/png?text=Enhanced+Property",
		OriginalURL:       req.SourceURL + "/image1.jpg",
		MediaType:         models.MediaImage,
		Resolution:        "1920x1080",
		EnhancementStatus: models.EnhanceCompleted,
	}
	h.DB.Create(&media)

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Property scraped and saved as draft",
		"property": property,
		"media":    []models.Media{media},
	})
}
