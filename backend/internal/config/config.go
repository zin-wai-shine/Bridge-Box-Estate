package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	DBHost        string
	DBPort        string
	DBUser        string
	DBPassword    string
	DBName        string
	DBSSLMode     string
	JWTSecret     string
	EncryptionKey string
	ServerPort    string
	OpenAIKey     string
	GeminiKey     string
	ImageAIKey    string
	AllowOrigins  string
}

// Load reads configuration from environment variables
func Load() *Config {
	// Load .env file if it exists (ignore error in production)
	_ = godotenv.Load()

	cfg := &Config{
		DBHost:        getEnv("DB_HOST", "localhost"),
		DBPort:        getEnv("DB_PORT", "5432"),
		DBUser:        getEnv("DB_USER", "bribox"),
		DBPassword:    getEnv("DB_PASSWORD", "bribox_secret"),
		DBName:        getEnv("DB_NAME", "bribox_db"),
		DBSSLMode:     getEnv("DB_SSLMODE", "disable"),
		JWTSecret:     getEnv("JWT_SECRET", "change-me-in-production-32chars!"),
		EncryptionKey: strings.TrimSpace(getEnv("ENCRYPTION_KEY", "change-me-32-byte-key-for-aes!!")),
		ServerPort:    getEnv("SERVER_PORT", "8080"),
		OpenAIKey:     getEnv("OPENAI_API_KEY", ""),
		GeminiKey:     getEnv("GEMINI_API_KEY", ""),
		ImageAIKey:    getEnv("IMAGE_AI_API_KEY", ""),
		AllowOrigins:  getEnv("ALLOW_ORIGINS", "http://localhost:5173"),
	}

	if len(cfg.EncryptionKey) != 32 {
		log.Fatalf("ENCRYPTION_KEY must be exactly 32 bytes for AES-256 (current length: %d)", len(cfg.EncryptionKey))
	}

	return cfg
}

// DSN returns the PostgreSQL connection string
func (c *Config) DSN() string {
	if url := os.Getenv("DATABASE_URL"); url != "" {
		return url
	}
	return "host=" + c.DBHost +
		" user=" + c.DBUser +
		" password=" + c.DBPassword +
		" dbname=" + c.DBName +
		" port=" + c.DBPort +
		" sslmode=" + c.DBSSLMode +
		" TimeZone=UTC"
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
