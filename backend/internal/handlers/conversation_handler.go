package handlers

import (
	"net/http"
	"strconv"

	"github.com/bribox/backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ConversationHandler handles chat session management
type ConversationHandler struct {
	DB *gorm.DB
}

// NewConversationHandler creates a new ConversationHandler
func NewConversationHandler(db *gorm.DB) *ConversationHandler {
	return &ConversationHandler{DB: db}
}

// ListSessions returns all chat sessions for the authenticated user
func (h *ConversationHandler) ListSessions(c *gin.Context) {
	userID, _ := c.Get("userID")
	uid := userID.(uint)

	var sessions []models.ChatSession
	h.DB.Where("user_id = ?", uid).Order("is_pinned desc, updated_at desc").Find(&sessions)

	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// CreateSession initializes a new chat session
func (h *ConversationHandler) CreateSession(c *gin.Context) {
	userID, _ := c.Get("userID")
	uid := userID.(uint)

	var req struct {
		Title string `json:"title"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Title == "" {
		req.Title = "New Chat"
	}

	session := models.ChatSession{
		UserID:   uid,
		Title:    req.Title,
		IsPinned: false,
		IsShared: false,
	}

	if err := h.DB.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	c.JSON(http.StatusCreated, session)
}

// UpdateSession updates session metadata (Rename, Pin, Share)
func (h *ConversationHandler) UpdateSession(c *gin.Context) {
	userID, _ := c.Get("userID")
	uid := userID.(uint)
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	var req struct {
		Title    *string `json:"title"`
		IsPinned *bool   `json:"is_pinned"`
		IsShared *bool   `json:"is_shared"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var session models.ChatSession
	if err := h.DB.Where("id = ? AND user_id = ?", id, uid).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	updates := make(map[string]interface{})
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.IsPinned != nil {
		updates["is_pinned"] = *req.IsPinned
	}
	if req.IsShared != nil {
		updates["is_shared"] = *req.IsShared
	}

	if err := h.DB.Model(&session).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update session"})
		return
	}

	c.JSON(http.StatusOK, session)
}

// DeleteSession removes a chat session and all its messages
func (h *ConversationHandler) DeleteSession(c *gin.Context) {
	userID, _ := c.Get("userID")
	uid := userID.(uint)
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	// Messaging cascading is handled by GORM constraint defined in model
	if err := h.DB.Where("id = ? AND user_id = ?", id, uid).Delete(&models.ChatSession{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Session deleted"})
}
