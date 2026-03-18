package handlers

import (
	"net/http"
	"time"

	"github.com/bribox/backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ChatHandler handles chat endpoints
type ChatHandler struct {
	DB        *gorm.DB
	JWTSecret string
}

// NewChatHandler creates a new ChatHandler
func NewChatHandler(db *gorm.DB, jwtSecret string) *ChatHandler {
	return &ChatHandler{DB: db, JWTSecret: jwtSecret}
}

// ChatRequest represents a chat message from the user
type ChatRequest struct {
	Message string `json:"message" binding:"required"`
}

// Chat processes a chat message (echo for Phase 1, enhanced in Phase 5)
func (h *ChatHandler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(uint)

	// Save user message
	userMsg := models.ChatHistory{
		UserID:         uid,
		Role:           models.ChatRoleUser,
		MessageContent: req.Message,
		Timestamp:      time.Now(),
	}
	h.DB.Create(&userMsg)

	// Phase 1: Echo response (will be replaced with AI in Phase 5)
	aiResponse := "Thanks for your message! I received: \"" + req.Message + "\". I'm being set up to help you find properties, manage listings, and more. Stay tuned!"

	// Save AI response
	aiMsg := models.ChatHistory{
		UserID:         uid,
		Role:           models.ChatRoleAI,
		MessageContent: aiResponse,
		Timestamp:      time.Now(),
	}
	h.DB.Create(&aiMsg)

	c.JSON(http.StatusOK, gin.H{
		"response": aiResponse,
		"user_message": gin.H{
			"id":        userMsg.ID,
			"content":   userMsg.MessageContent,
			"role":      userMsg.Role,
			"timestamp": userMsg.Timestamp,
		},
		"ai_message": gin.H{
			"id":        aiMsg.ID,
			"content":   aiMsg.MessageContent,
			"role":      aiMsg.Role,
			"timestamp": aiMsg.Timestamp,
		},
	})
}

// GetChatHistory returns the chat history for the authenticated user
func (h *ChatHandler) GetChatHistory(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var messages []models.ChatHistory
	h.DB.Where("user_id = ?", userID).Order("timestamp asc").Find(&messages)

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}
