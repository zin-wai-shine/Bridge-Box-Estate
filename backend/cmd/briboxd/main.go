package main

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/bribox/backend/internal/auth"
	"github.com/bribox/backend/internal/config"
	"github.com/bribox/backend/internal/database"
	"github.com/bribox/backend/internal/handlers"
	"github.com/bribox/backend/internal/models"
	"github.com/bribox/backend/internal/services/llm_parser"
	"github.com/bribox/backend/internal/services/scraper"
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

	// CORS middleware – supports web, Capacitor (mobile), and Tauri (desktop)
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			// Always allow configured origin(s)
			for _, allowed := range strings.Split(cfg.AllowOrigins, ",") {
				if strings.TrimSpace(allowed) == "*" || strings.TrimSpace(allowed) == origin {
					return true
				}
			}
			// Allow Capacitor native origins
			if origin == "capacitor://localhost" || origin == "https://localhost" {
				return true
			}
			// Allow Tauri native origins
			if origin == "tauri://localhost" || origin == "https://tauri.localhost" {
				return true
			}
			// Allow local development
			if strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "http://127.0.0.1") {
				return true
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
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
	chatHandler := handlers.NewChatHandler(db, cfg.JWTSecret, cfg.OpenAIKey, cfg.GeminiKey)
	convHandler := handlers.NewConversationHandler(db)
	adminHandler := handlers.NewAdminHandler(db)
	
	scraperSvc := scraper.NewService()
	llmParserSvc := llm_parser.NewService(cfg.OpenAIKey, cfg.GeminiKey)
	bridgeHandler := handlers.NewBridgeHandler(db, cfg.EncryptionKey, scraperSvc, llmParserSvc)

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
			// AI Chat
			authenticated.POST("/chat", chatHandler.Chat)

			// Conversations (Sessions)
			chats := authenticated.Group("/chats")
			{
				chats.GET("", convHandler.ListSessions)
				chats.POST("", convHandler.CreateSession)
				chats.PATCH("/:id", convHandler.UpdateSession)
				chats.DELETE("/:id", convHandler.DeleteSession)
				chats.GET("/:id/history", chatHandler.GetChatHistory)
			}

			// Bridge (scraping) - Agent & Admin only
			bridge := authenticated.Group("/bridge")
			bridge.Use(auth.RoleMiddleware(models.RoleAgent, models.RoleAdmin))
			{
				bridge.POST("/scrape", bridgeHandler.Scrape)
				bridge.POST("/hybrid", bridgeHandler.HybridBridge)
				bridge.POST("/refine/:id", bridgeHandler.Refine)
				bridge.POST("/publish/:id", bridgeHandler.Publish)
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
