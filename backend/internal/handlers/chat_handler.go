package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/bribox/backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ChatHandler handles chat endpoints
type ChatHandler struct {
	DB        *gorm.DB
	JWTSecret string
	OpenAIKey string
	GeminiKey string
}

// NewChatHandler creates a new ChatHandler
func NewChatHandler(db *gorm.DB, jwtSecret string, openAIKey string, geminiKey string) *ChatHandler {
	return &ChatHandler{DB: db, JWTSecret: jwtSecret, OpenAIKey: openAIKey, GeminiKey: geminiKey}
}

// ChatRequest represents a chat message from the user
type ChatRequest struct {
	SessionID uint   `json:"session_id"`
	Message   string `json:"message" binding:"required"`
}

// briboxSystemPrompt is the action-first persona
const briboxSystemPrompt = `You are the bribox AI. Your primary goal is to take action based on user input.

If a user provides search criteria (location, budget, size), immediately search the provided context and return matching properties.
DO NOT repeat the welcome menu or instructions if the user has already started a search.
If no properties match, suggest the closest alternatives or ask for one specific missing detail.
Be conversational but minimalist. If the user says "show me all near Bangna," do not explain how to search—just show the listings.

When displaying property results, format each property as a JSON block wrapped in ~~~property markers so the frontend can render cards:

~~~property
{"id":1,"address":"123 Main St","city":"Bangkok","price":500000,"bedrooms":3,"bathrooms":2,"square_footage":1500,"status":"Active","description":"Modern home"}
~~~

Always include the ~~~property markers around each property JSON block.

Additional rules:
- Stay in character. You are bribox, never mention being an AI or chatbot.
- Use bold markdown for key features.
- Keep responses structured and mobile-friendly.
- If the user greets you or asks what you can do, give a brief 2-3 line response and ask what they need. Do NOT show long menus.`

// Chat processes a chat message with context awareness
func (h *ChatHandler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(uint)

	// Determine or create session
	var session models.ChatSession
	if req.SessionID != 0 {
		if err := h.DB.Where("id = ? AND user_id = ?", req.SessionID, uid).First(&session).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
			return
		}
	} else {
		// Auto-generate a title from the first message
		title := req.Message
		if len(title) > 30 {
			title = title[:27] + "..."
		}
		session = models.ChatSession{
			UserID: uid,
			Title:  title,
		}
		h.DB.Create(&session)
	}

	// Save user message
	userMsg := models.ChatHistory{
		SessionID:      session.ID,
		UserID:         uid,
		Role:           models.ChatRoleUser,
		MessageContent: req.Message,
		Timestamp:      time.Now(),
	}
	h.DB.Create(&userMsg)

	// Load recent conversation history for this session (last 10 messages)
	var history []models.ChatHistory
	h.DB.Where("session_id = ?", session.ID).Order("timestamp desc").Limit(10).Find(&history)
	// Reverse to chronological order
	for i, j := 0, len(history)-1; i < j; i, j = i+1, j-1 {
		history[i], history[j] = history[j], history[i]
	}

	// Detect search intent and query properties
	properties := h.searchProperties(req.Message)
	propertyContext := h.buildPropertyContext(properties)

	// Generate AI response
	var aiResponse string
	if h.OpenAIKey != "" {
		var err error
		aiResponse, err = h.queryOpenAI(req.Message, history, propertyContext)
		if err != nil {
			log.Printf("⚠️ OpenAI error: %v — trying Gemini fallback", err)
			if h.GeminiKey != "" {
				aiResponse, err = h.queryGemini(req.Message, history, propertyContext)
				if err != nil {
					log.Printf("❌ Gemini error: %v — using built-in engine", err)
					aiResponse = h.generateBuiltInResponse(req.Message, properties)
				}
			} else {
				aiResponse = h.generateBuiltInResponse(req.Message, properties)
			}
		}
	} else if h.GeminiKey != "" {
		var err error
		aiResponse, err = h.queryGemini(req.Message, history, propertyContext)
		if err != nil {
			log.Printf("❌ Gemini error: %v — using built-in engine", err)
			aiResponse = h.generateBuiltInResponse(req.Message, properties)
		}
	} else {
		aiResponse = h.generateBuiltInResponse(req.Message, properties)
	}

	// Save AI response
	aiMsg := models.ChatHistory{
		SessionID:      session.ID,
		UserID:         uid,
		Role:           models.ChatRoleAI,
		MessageContent: aiResponse,
		Timestamp:      time.Now(),
	}
	h.DB.Create(&aiMsg)

	// Update session UpdateAt for sorting
	h.DB.Model(&session).Update("updated_at", time.Now())

	c.JSON(http.StatusOK, gin.H{
		"response":   aiResponse,
		"session_id": session.ID,
		"properties": properties,
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

// searchProperties queries the database based on user message keywords
func (h *ChatHandler) searchProperties(message string) []models.Property {
	msg := strings.ToLower(message)
	var properties []models.Property

	// Detect if user has search intent
	searchKeywords := []string{
		"find", "search", "show", "list", "looking", "near", "in ", "around",
		"bedroom", "bed", "bath", "budget", "under", "below", "above",
		"cheap", "affordable", "expensive", "house", "condo", "home",
		"property", "apartment", "rent", "buy", "bangna", "sukhumvit",
		"silom", "thonglor", "ekkamai", "ari", "sathorn", "phra khanong",
	}

	hasSearchIntent := false
	for _, kw := range searchKeywords {
		if strings.Contains(msg, kw) {
			hasSearchIntent = true
			break
		}
	}

	if !hasSearchIntent {
		return nil
	}

	// Build dynamic query
	query := h.DB.Where("status = ?", models.StatusActive)

	// Search by city/location keywords in address, city, or description
	locationTerms := extractLocationTerms(msg)
	if len(locationTerms) > 0 {
		for _, term := range locationTerms {
			pattern := "%" + term + "%"
			query = query.Where(
				"LOWER(address) LIKE ? OR LOWER(city) LIKE ? OR LOWER(state) LIKE ? OR LOWER(description) LIKE ?",
				pattern, pattern, pattern, pattern,
			)
		}
	}

	// Search by bedroom count
	bedrooms := extractNumber(msg, []string{"bedroom", "bed", "br"})
	if bedrooms > 0 {
		query = query.Where("bedrooms = ?", bedrooms)
	}

	// Search by price budget
	budget := extractBudget(msg)
	if budget > 0 {
		query = query.Where("price <= ?", budget)
	}

	query.Order("created_at desc").Limit(5).Find(&properties)

	// If no results with strict filters, try broader search
	if len(properties) == 0 && hasSearchIntent {
		h.DB.Where("status = ?", models.StatusActive).
			Order("created_at desc").
			Limit(5).
			Find(&properties)
	}

	return properties
}

// buildPropertyContext converts properties to a text context for the LLM
func (h *ChatHandler) buildPropertyContext(properties []models.Property) string {
	if len(properties) == 0 {
		return "No properties currently in the database."
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Found %d properties in the database:\n\n", len(properties)))
	for i, p := range properties {
		sb.WriteString(fmt.Sprintf("Property %d:\n", i+1))
		sb.WriteString(fmt.Sprintf("  ID: %d\n", p.ID))
		sb.WriteString(fmt.Sprintf("  Address: %s\n", p.Address))
		sb.WriteString(fmt.Sprintf("  City: %s, %s %s\n", p.City, p.State, p.Zip))
		sb.WriteString(fmt.Sprintf("  Price: $%.0f\n", p.Price))
		sb.WriteString(fmt.Sprintf("  Bedrooms: %d | Bathrooms: %d\n", p.Bedrooms, p.Bathrooms))
		sb.WriteString(fmt.Sprintf("  SqFt: %d\n", p.SquareFootage))
		sb.WriteString(fmt.Sprintf("  Status: %s\n", p.Status))
		if p.Description != "" {
			desc := p.Description
			if len(desc) > 200 {
				desc = desc[:200] + "..."
			}
			sb.WriteString(fmt.Sprintf("  Description: %s\n", desc))
		}
		sb.WriteString("\n")
	}
	return sb.String()
}

// extractLocationTerms pulls location-related words from the message
func extractLocationTerms(msg string) []string {
	knownLocations := []string{
		"bangna", "sukhumvit", "silom", "thonglor", "ekkamai", "ari",
		"sathorn", "phra khanong", "on nut", "bearing", "udom suk",
		"san francisco", "new york", "los angeles", "chicago", "miami",
		"bangkok", "pattaya", "chiang mai", "phuket",
	}

	var found []string
	for _, loc := range knownLocations {
		if strings.Contains(msg, loc) {
			found = append(found, loc)
		}
	}
	return found
}

// extractNumber finds a number associated with a keyword (e.g., "3 bedroom")
func extractNumber(msg string, keywords []string) int {
	for _, kw := range keywords {
		idx := strings.Index(msg, kw)
		if idx == -1 {
			continue
		}
		// Look for digit before the keyword
		for i := idx - 1; i >= 0; i-- {
			if msg[i] >= '0' && msg[i] <= '9' {
				return int(msg[i] - '0')
			}
			if msg[i] != ' ' {
				break
			}
		}
	}
	return 0
}

// extractBudget finds budget/price numbers from the message
func extractBudget(msg string) float64 {
	budgetKeywords := []string{"budget", "under", "below", "max", "up to", "less than"}
	for _, kw := range budgetKeywords {
		idx := strings.Index(msg, kw)
		if idx == -1 {
			continue
		}
		// Extract number after keyword
		rest := msg[idx+len(kw):]
		rest = strings.TrimLeft(rest, " $")
		var numStr string
		for _, ch := range rest {
			if (ch >= '0' && ch <= '9') || ch == '.' || ch == ',' {
				if ch != ',' {
					numStr += string(ch)
				}
			} else if len(numStr) > 0 {
				break
			}
		}
		if numStr != "" {
			var val float64
			fmt.Sscanf(numStr, "%f", &val)
			// Handle shorthand (e.g., "500k", "12000")
			if strings.Contains(rest, "k") || strings.Contains(rest, "K") {
				val *= 1000
			}
			if strings.Contains(rest, "m") || strings.Contains(rest, "M") {
				val *= 1000000
			}
			if val > 0 {
				return val
			}
		}
	}
	return 0
}

// generateBuiltInResponse provides context-aware responses using the property database
func (h *ChatHandler) generateBuiltInResponse(message string, properties []models.Property) string {
	msg := strings.ToLower(message)

	// If we found properties, show them directly
	if len(properties) > 0 {
		var sb strings.Builder
		sb.WriteString(fmt.Sprintf("Found **%d** matching properties:\n\n", len(properties)))
		for _, p := range properties {
			propJSON, _ := json.Marshal(map[string]interface{}{
				"id":             p.ID,
				"address":        p.Address,
				"city":           p.City,
				"price":          p.Price,
				"bedrooms":       p.Bedrooms,
				"bathrooms":      p.Bathrooms,
				"square_footage": p.SquareFootage,
				"status":         p.Status,
				"description":    p.Description,
			})
			sb.WriteString("~~~property\n")
			sb.WriteString(string(propJSON))
			sb.WriteString("\n~~~\n\n")
		}
		sb.WriteString("Need to refine? Tell me a **location**, **budget**, or **size** and I'll narrow it down.")
		return sb.String()
	}

	// Search intent but no results
	if containsAny(msg, []string{"find", "search", "show", "looking", "near", "bedroom", "budget"}) {
		return "No properties match that criteria yet.\n\nThe database is currently being populated. Try using the **Bridge Tool** in the Admin Dashboard to import listings from external URLs.\n\nAlternatively, tell me what you're looking for — **location**, **budget**, or **size** — and I'll search as new listings come in."
	}

	// Greetings - keep brief, no menus
	if containsAny(msg, []string{"hi", "hello", "hey", "hai", "good morning", "good evening"}) {
		return "Welcome to **bribox**. I help you find, bridge, and manage real estate listings.\n\nWhat are you looking for?"
	}

	// What can you do - brief
	if containsAny(msg, []string{"what can you do", "what you can do", "help", "capabilities"}) {
		return "I search properties, bridge external listings, and manage your portfolio.\n\nTell me what you need — a **location**, **budget**, or **property type** — and I'll get to work."
	}

	// Bridge / scrape
	if containsAny(msg, []string{"bridge", "scrape", "url", "paste", "link", "import"}) {
		return "To bridge a listing:\n\n1. Go to **Admin Dashboard**\n2. Paste the property URL in the **Bridge Tool**\n3. I'll extract and structure the listing data\n\nThe result becomes a **Draft** you can review and publish."
	}

	// Pricing / market
	if containsAny(msg, []string{"price", "market", "valuation", "worth", "value", "trend", "cost"}) {
		return "Valuation depends on **location**, **comparables**, **condition**, and **market trends**.\n\nShare an address or listing URL and I'll analyze what's available."
	}

	// Listings / dashboard
	if containsAny(msg, []string{"listing", "draft", "active", "dashboard", "admin", "manage"}) {
		return "Your listings live in the **Admin Dashboard**:\n\n- **Drafts** — Awaiting review\n- **Active** — Live on the network\n- **Permissions** — Owner authorization status\n\nHead to **Admin** to manage them."
	}

	// Permission
	if containsAny(msg, []string{"permission", "owner", "authorize", "approval"}) {
		return "The **Permission System** ensures owner authorization before listings go live.\n\nAgents bridge a property → Owner reviews → Approved listings go live.\n\nCheck **Permissions** in your Admin Dashboard."
	}

	// Thanks
	if containsAny(msg, []string{"thank", "thanks", "great", "awesome", "perfect"}) {
		return "Glad to help. Just ask when you need anything."
	}

	// Default - brief, action-oriented
	return "I can search properties, bridge listings, or provide market insights.\n\nTell me specifically what you need — a **location**, **budget**, **property type**, or a **URL to bridge**."
}

// containsAny checks if the message contains any of the given keywords
func containsAny(msg string, keywords []string) bool {
	for _, kw := range keywords {
		if strings.Contains(msg, kw) {
			return true
		}
	}
	return false
}

// queryOpenAI makes a real API call to OpenAI with conversation history and property context
func (h *ChatHandler) queryOpenAI(userMessage string, history []models.ChatHistory, propertyContext string) (string, error) {
	log.Println("Sending chat request to OpenAI API...")

	// Build messages array with history
	messages := []map[string]string{
		{
			"role":    "system",
			"content": briboxSystemPrompt + "\n\n--- PROPERTY DATABASE CONTEXT ---\n" + propertyContext,
		},
	}

	// Add conversation history (exclude current message which is already at the end)
	for _, h := range history {
		role := "user"
		if h.Role == models.ChatRoleAI {
			role = "assistant"
		}
		messages = append(messages, map[string]string{
			"role":    role,
			"content": h.MessageContent,
		})
	}

	// Add current user message
	messages = append(messages, map[string]string{
		"role":    "user",
		"content": userMessage,
	})

	payload := map[string]interface{}{
		"model":    "gpt-4o-mini",
		"messages": messages,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.OpenAIKey)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute req: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("OpenAI API returned status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("OpenAI API returned no choices")
	}

	return result.Choices[0].Message.Content, nil
}

// queryGemini makes a real API call to Google Gemini AI Studio
func (h *ChatHandler) queryGemini(userMessage string, history []models.ChatHistory, propertyContext string) (string, error) {
	log.Println("Sending chat request to Gemini AI...")

	var promptSB strings.Builder
	promptSB.WriteString(briboxSystemPrompt)
	promptSB.WriteString("\n\n--- PROPERTY DATABASE CONTEXT ---\n")
	promptSB.WriteString(propertyContext)
	promptSB.WriteString("\n\n--- RECENT CONVERSATION HISTORY ---\n")

	for _, h := range history {
		role := "User"
		if h.Role == models.ChatRoleAI {
			role = "Assistant"
		}
		promptSB.WriteString(fmt.Sprintf("%s: %s\n", role, h.MessageContent))
	}
	promptSB.WriteString(fmt.Sprintf("User: %s\n", userMessage))
	promptSB.WriteString("Assistant: ")

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{
						"text": promptSB.String(),
					},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature": 0.7,
			"topK":        40,
			"topP":        0.95,
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal Gemini request: %w", err)
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", h.GeminiKey)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create Gemini request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute Gemini req: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Gemini API returned status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode Gemini response: %w", err)
	}

	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("Gemini API returned no candidates")
	}

	return result.Candidates[0].Content.Parts[0].Text, nil
}

// GetChatHistory returns the chat history for a specific session
func (h *ChatHandler) GetChatHistory(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, _ := strconv.ParseUint(sessionIDStr, 10, 32)

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	uid := userID.(uint)

	// Verify session belongs to user
	var session models.ChatSession
	if err := h.DB.Where("id = ? AND user_id = ?", uint(sessionID), uid).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	var messages []models.ChatHistory
	h.DB.Where("session_id = ?", uint(sessionID)).Order("timestamp asc").Find(&messages)

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}
