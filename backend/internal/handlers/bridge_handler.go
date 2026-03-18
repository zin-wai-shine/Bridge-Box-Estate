package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/bribox/backend/internal/models"
	"github.com/bribox/backend/internal/services/llm_parser"
	"github.com/bribox/backend/internal/services/scraper"
	"github.com/bribox/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// BridgeHandler handles scraping and AI processing endpoints
type BridgeHandler struct {
	DB            *gorm.DB
	EncryptionKey string
	Scraper       *scraper.Service
	LLMParser     *llm_parser.Service
}

// NewBridgeHandler creates a new BridgeHandler
func NewBridgeHandler(db *gorm.DB, encryptionKey string, scraperSvc *scraper.Service, llmParserSvc *llm_parser.Service) *BridgeHandler {
	return &BridgeHandler{
		DB:            db,
		EncryptionKey: encryptionKey,
		Scraper:       scraperSvc,
		LLMParser:     llmParserSvc,
	}
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

	// 1. Scrape the URL
	scrapedData, err := h.Scraper.ScrapeURL(context.Background(), req.SourceURL)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	// 2. Parse the HTML with LLM
	parsedData, err := h.LLMParser.ParseHTML(context.Background(), scrapedData.RawHTML)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI parsing failed: " + err.Error()})
		return
	}

	// Encrypt the source URL before storing
	encryptedURL, err := utils.Encrypt(req.SourceURL, h.EncryptionKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt URL"})
		return
	}

	// 3. Create property draft
	property := models.Property{
		UserID:        userID.(uint),
		Address:       parsedData.Address,
		City:          parsedData.City,
		State:         parsedData.State,
		Zip:           parsedData.Zip,
		Price:         parsedData.Price,
		Bedrooms:      parsedData.Bedrooms,
		Bathrooms:     parsedData.Bathrooms,
		SquareFootage: parsedData.SquareFootage,
		Description:   parsedData.Description,
		Status:        models.StatusDraft,
		SourceURL:     encryptedURL,
	}

	if err := h.DB.Create(&property).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create property"})
		return
	}

	// 4. Save media entries (using scraped image URLs)
	var mediaEntries []models.Media
	for _, imgURL := range scrapedData.ImageURLs {
		m := models.Media{
			PropertyID:        property.ID,
			URL:               imgURL, // In production, this would be the enhanced/stored URL
			OriginalURL:       imgURL,
			MediaType:         models.MediaImage,
			Resolution:        "Original",
			EnhancementStatus: models.EnhancePending,
		}
		h.DB.Create(&m)
		mediaEntries = append(mediaEntries, m)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Property bridged and saved as draft",
		"property": property,
		"media":    mediaEntries,
	})
}
// HybridBridge handles combined URL scraping and manual file uploads
func (h *BridgeHandler) HybridBridge(c *gin.Context) {
	err := c.Request.ParseMultipartForm(32 << 20) // 32MB max
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Multipart form error: " + err.Error()})
		return
	}

	sourceURL := c.PostForm("source_url")
	userID, _ := c.Get("userID")

	var property models.Property
	var mediaEntries []models.Media

	// 1. Process URL if provided
	if sourceURL != "" {
		scrapedData, err := h.Scraper.ScrapeURL(context.Background(), sourceURL)
		if err == nil {
			parsedData, err := h.LLMParser.ParseHTML(context.Background(), scrapedData.RawHTML)
			if err == nil {
				encryptedURL, _ := utils.Encrypt(sourceURL, h.EncryptionKey)
				property = models.Property{
					UserID:        userID.(uint),
					Address:       parsedData.Address,
					City:          parsedData.City,
					State:         parsedData.State,
					Zip:           parsedData.Zip,
					Price:         parsedData.Price,
					Bedrooms:      parsedData.Bedrooms,
					Bathrooms:     parsedData.Bathrooms,
					SquareFootage: parsedData.SquareFootage,
					Description:   parsedData.Description,
					Status:        models.StatusDraft,
					SourceURL:     encryptedURL,
				}
				h.DB.Create(&property)

				for _, u := range scrapedData.ImageURLs {
					m := models.Media{
						PropertyID:        property.ID,
						URL:               u,
						OriginalURL:       u,
						MediaType:         models.MediaImage,
						EnhancementStatus: models.EnhancePending,
					}
					h.DB.Create(&m)
					mediaEntries = append(mediaEntries, m)
				}
			}
		}
	}

	// 2. If no property created (e.g. upload only), create an empty shell
	if property.ID == 0 {
		property = models.Property{
			UserID:  userID.(uint),
			Address: "New Media Draft",
			Status:  models.StatusDraft,
		}
		h.DB.Create(&property)
	}

	// 3. Process Manual Uploads
	form, _ := c.MultipartForm()
	files := form.File["images"]

	for _, file := range files {
		// Create upload dir if not exists
		uploadDir := "uploads/bridge"
		os.MkdirAll(uploadDir, os.ModePerm)

		dst := filepath.Join(uploadDir, fmt.Sprintf("%d_%s", property.ID, file.Filename))
		if err := c.SaveUploadedFile(file, dst); err == nil {
			m := models.Media{
				PropertyID:        property.ID,
				URL:               "/" + dst, // Serve via static
				OriginalURL:       "/" + dst,
				MediaType:         models.MediaImage,
				EnhancementStatus: models.EnhanceProcessing, // Start auto-res
			}
			h.DB.Create(&m)
			mediaEntries = append(mediaEntries, m)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Hybrid bridge created successfully",
		"property": property,
		"media":    mediaEntries,
	})
}

// RefineRequest represents a request to update a draft description
type RefineRequest struct {
	Instruction string `json:"instruction" binding:"required"`
}

// Refine updates a property draft's description based on natural language instructions
func (h *BridgeHandler) Refine(c *gin.Context) {
	propertyID := c.Param("id")
	var req RefineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var property models.Property
	if err := h.DB.First(&property, propertyID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Property not found"})
		return
	}

	// Call AI to refine the description
	newDesc, err := h.LLMParser.RefineDescription(context.Background(), property.Description, req.Instruction)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Refinement failed: " + err.Error()})
		return
	}

	// Update the property in DB
	property.Description = newDesc
	if err := h.DB.Save(&property).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update property"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Description refined successfully",
		"property":    property,
		"instruction": req.Instruction,
	})
}

// PublishRequest represents a request to publish a property
type PublishRequest struct {
	Platform string `json:"platform" binding:"required"`
}

// Publish simulates executing a post on an external platform
func (h *BridgeHandler) Publish(c *gin.Context) {
	propertyID := c.Param("id")
	var req PublishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var property models.Property
	if err := h.DB.First(&property, propertyID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Property not found"})
		return
	}

	// In a real implementation, this would call the Facebook/Instagram Graph API
	log.Printf("📢 PUBLISHING: Property %d to %s", property.ID, req.Platform)

	c.JSON(http.StatusOK, gin.H{
		"message":  fmt.Sprintf("Successfully published to %s", req.Platform),
		"platform": req.Platform,
		"status":   "success",
	})
}
