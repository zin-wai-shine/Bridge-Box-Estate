package main

import (
	"log"
	"net/http"
	"time"

	"github.com/bribox/backend/internal/auth"
	"github.com/bribox/backend/internal/config"
	"github.com/bribox/backend/internal/database"
	"github.com/bribox/backend/internal/handlers"
	"github.com/bribox/backend/internal/models"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()
	log.Println("🚀 Starting BriBox server...")

	// Connect to database
	db := database.Connect(cfg)

	// Initialize Gin
	r := gin.Default()

	// Hide default server header
	r.Use(func(c *gin.Context) {
		c.Header("Server", "BriBox")
		c.Next()
	})

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.AllowOrigins},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Rate limiting (simple in-memory, per IP)
	r.Use(rateLimitMiddleware())

	// Health check
	r.GET("/api/v1/health", func(c *gin.Context) {
		sqlDB, err := db.DB()
		dbStatus := "healthy"
		if err != nil || sqlDB.Ping() != nil {
			dbStatus = "unhealthy"
		}
		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"database": dbStatus,
			"time":     time.Now().UTC(),
		})
	})

	// Serve Frontend Static Files
	r.StaticFS("/assets", http.Dir("./dist/assets"))
	r.StaticFile("/vite.svg", "./dist/vite.svg")
	
	// Fallback to index.html for React Router
	r.NoRoute(func(c *gin.Context) {
		c.File("./dist/index.html")
	})

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg.JWTSecret)
	chatHandler := handlers.NewChatHandler(db, cfg.JWTSecret)
	adminHandler := handlers.NewAdminHandler(db)
	bridgeHandler := handlers.NewBridgeHandler(db, cfg.EncryptionKey)

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Public routes
		v1.POST("/register", authHandler.Register)
		v1.POST("/login", authHandler.Login)

		// Authenticated routes
		authenticated := v1.Group("")
		authenticated.Use(auth.AuthMiddleware(cfg.JWTSecret))
		{
			// Chat
			authenticated.POST("/chat", chatHandler.Chat)
			authenticated.GET("/chat/history", chatHandler.GetChatHistory)

			// Bridge (scraping) - Agent & Admin only
			bridge := authenticated.Group("/bridge")
			bridge.Use(auth.RoleMiddleware(models.RoleAgent, models.RoleAdmin))
			{
				bridge.POST("/scrape", bridgeHandler.Scrape)
			}

			// Admin panel - Agent & Admin only
			admin := authenticated.Group("/admin")
			admin.Use(auth.RoleMiddleware(models.RoleAgent, models.RoleAdmin))
			{
				admin.GET("/stats", adminHandler.GetDashboardStats)
				admin.GET("/listings/drafts", adminHandler.GetDraftListings)
				admin.GET("/listings/active", adminHandler.GetActiveListings)
				admin.GET("/permissions", adminHandler.GetPermissions)
				admin.PUT("/property/:id", adminHandler.UpdateProperty)
				admin.POST("/property/:id/approve", adminHandler.ApproveProperty)
				admin.DELETE("/property/:id", adminHandler.DeleteProperty)
				admin.POST("/permission/:id/approve", adminHandler.ApprovePermission)
				admin.POST("/permission/:id/deny", adminHandler.DenyPermission)
			}
		}
	}

	// Start server
	port := cfg.ServerPort
	log.Printf("✅ BriBox server running on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// rateLimitMiddleware provides basic rate limiting using a simple token bucket per IP
func rateLimitMiddleware() gin.HandlerFunc {
	type client struct {
		tokens    int
		lastReset time.Time
	}

	clients := make(map[string]*client)
	maxTokens := 100
	resetInterval := time.Minute

	return func(c *gin.Context) {
		ip := c.ClientIP()

		cl, exists := clients[ip]
		if !exists || time.Since(cl.lastReset) > resetInterval {
			clients[ip] = &client{tokens: maxTokens, lastReset: time.Now()}
			cl = clients[ip]
		}

		if cl.tokens <= 0 {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded. Try again later."})
			c.Abort()
			return
		}

		cl.tokens--
		c.Next()
	}
}
