package handlers

import (
	"net/http"
	"strconv"

	"github.com/bribox/backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AdminHandler handles admin panel endpoints
type AdminHandler struct {
	DB *gorm.DB
}

// NewAdminHandler creates a new AdminHandler
func NewAdminHandler(db *gorm.DB) *AdminHandler {
	return &AdminHandler{DB: db}
}

// GetDraftListings returns all draft properties for the authenticated agent
func (h *AdminHandler) GetDraftListings(c *gin.Context) {
	userID, _ := c.Get("userID")

	var properties []models.Property
	h.DB.Where("user_id = ? AND status = ?", userID, models.StatusDraft).
		Preload("Media").
		Order("created_at desc").
		Find(&properties)

	c.JSON(http.StatusOK, gin.H{"listings": properties})
}

// GetActiveListings returns all active properties for the authenticated agent
func (h *AdminHandler) GetActiveListings(c *gin.Context) {
	userID, _ := c.Get("userID")

	var properties []models.Property
	h.DB.Where("user_id = ? AND status = ?", userID, models.StatusActive).
		Preload("Media").
		Order("created_at desc").
		Find(&properties)

	c.JSON(http.StatusOK, gin.H{"listings": properties})
}

// GetPermissions returns pending permission logs for the agent
func (h *AdminHandler) GetPermissions(c *gin.Context) {
	userID, _ := c.Get("userID")

	var permissions []models.PermissionLog
	h.DB.Where("agent_user_id = ?", userID).
		Preload("Owner").
		Preload("Property").
		Order("created_at desc").
		Find(&permissions)

	c.JSON(http.StatusOK, gin.H{"permissions": permissions})
}

// UpdateProperty updates property details after agent review
func (h *AdminHandler) UpdateProperty(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid property ID"})
		return
	}

	userID, _ := c.Get("userID")

	var property models.Property
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&property).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Property not found"})
		return
	}

	// Bind update fields
	var update struct {
		Address       string  `json:"address"`
		City          string  `json:"city"`
		State         string  `json:"state"`
		Zip           string  `json:"zip"`
		Price         float64 `json:"price"`
		Bedrooms      int     `json:"bedrooms"`
		Bathrooms     int     `json:"bathrooms"`
		SquareFootage int     `json:"square_footage"`
		Description   string  `json:"description"`
	}

	if err := c.ShouldBindJSON(&update); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	h.DB.Model(&property).Updates(models.Property{
		Address:       update.Address,
		City:          update.City,
		State:         update.State,
		Zip:           update.Zip,
		Price:         update.Price,
		Bedrooms:      update.Bedrooms,
		Bathrooms:     update.Bathrooms,
		SquareFootage: update.SquareFootage,
		Description:   update.Description,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Property updated", "property": property})
}

// ApproveProperty changes property status to Active
func (h *AdminHandler) ApproveProperty(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid property ID"})
		return
	}

	userID, _ := c.Get("userID")

	var property models.Property
	if err := h.DB.Where("id = ? AND user_id = ?", id, userID).First(&property).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Property not found"})
		return
	}

	h.DB.Model(&property).Update("status", models.StatusActive)

	c.JSON(http.StatusOK, gin.H{"message": "Property approved and set to Active", "property": property})
}

// DeleteProperty soft-deletes a property
func (h *AdminHandler) DeleteProperty(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid property ID"})
		return
	}

	userID, _ := c.Get("userID")

	result := h.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Property{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Property not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Property deleted"})
}

// ApprovePermission updates permission log status to Approved
func (h *AdminHandler) ApprovePermission(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permission ID"})
		return
	}

	userID, _ := c.Get("userID")

	var perm models.PermissionLog
	if err := h.DB.Where("id = ? AND agent_user_id = ?", id, userID).First(&perm).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permission not found"})
		return
	}

	h.DB.Model(&perm).Update("status", models.PermApproved)

	c.JSON(http.StatusOK, gin.H{"message": "Permission approved", "permission": perm})
}

// DenyPermission updates permission log status to Denied
func (h *AdminHandler) DenyPermission(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permission ID"})
		return
	}

	userID, _ := c.Get("userID")

	var perm models.PermissionLog
	if err := h.DB.Where("id = ? AND agent_user_id = ?", id, userID).First(&perm).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Permission not found"})
		return
	}

	h.DB.Model(&perm).Update("status", models.PermDenied)

	c.JSON(http.StatusOK, gin.H{"message": "Permission denied", "permission": perm})
}

// GetDashboardStats returns overview metrics for the agent
func (h *AdminHandler) GetDashboardStats(c *gin.Context) {
	userID, _ := c.Get("userID")

	var draftCount, activeCount, permPendingCount int64

	h.DB.Model(&models.Property{}).Where("user_id = ? AND status = ?", userID, models.StatusDraft).Count(&draftCount)
	h.DB.Model(&models.Property{}).Where("user_id = ? AND status = ?", userID, models.StatusActive).Count(&activeCount)
	h.DB.Model(&models.PermissionLog{}).Where("agent_user_id = ? AND status = ?", userID, models.PermPending).Count(&permPendingCount)

	c.JSON(http.StatusOK, gin.H{
		"draft_listings":      draftCount,
		"active_listings":     activeCount,
		"pending_permissions": permPendingCount,
	})
}
