package llm_parser

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

// ParsedProperty represents AI-structured property data
type ParsedProperty struct {
	Address       string   `json:"address"`
	City          string   `json:"city"`
	State         string   `json:"state"`
	Zip           string   `json:"zip"`
	Price         float64  `json:"price"`
	Bedrooms      int      `json:"bedrooms"`
	Bathrooms     int      `json:"bathrooms"`
	SquareFootage int      `json:"square_footage"`
	Description   string   `json:"description"`
	ImageURLs     []string `json:"image_urls"`
}

// Service handles LLM-based parsing of property data
type Service struct {
	APIKey string
}

// NewService creates a new LLM parser service
func NewService(apiKey string) *Service {
	return &Service{APIKey: apiKey}
}

// ParseHTML takes raw HTML and uses an LLM to extract structured property data
// In production, this would call OpenAI or similar API
func (s *Service) ParseHTML(ctx context.Context, rawHTML string) (*ParsedProperty, error) {
	log.Println("🧠 Parsing HTML with LLM...")

	if s.APIKey != "" {
		// Production: Call OpenAI API
		return s.parseWithOpenAI(ctx, rawHTML)
	}

	// Mock: Extract basic info from HTML content
	log.Println("⚠️ No API key configured, using mock LLM parsing")
	return s.mockParse(rawHTML), nil
}

// parseWithOpenAI makes real API calls to OpenAI
func (s *Service) parseWithOpenAI(ctx context.Context, rawHTML string) (*ParsedProperty, error) {
	log.Println("🧠 Sending request to OpenAI API...")

	// Truncate rawHTML to avoid token limits
	if len(rawHTML) > 20000 {
		rawHTML = rawHTML[:20000]
	}

	payload := map[string]interface{}{
		"model": "gpt-4o-mini",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a real estate parser. Extract the following from the HTML and return a JSON object with these exact keys: address (string), city (string), state (string), zip (string), price (number), bedrooms (number), bathrooms (number), square_footage (number), description (string), image_urls (array of strings). Return ONLY the raw JSON object.",
			},
			{
				"role":    "user",
				"content": rawHTML,
			},
		},
		"response_format": map[string]string{
			"type": "json_object",
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.APIKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute req: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI API returned status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("OpenAI API returned no choices")
	}

	content := result.Choices[0].Message.Content

	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	var parsed ParsedProperty
	if err := json.Unmarshal([]byte(content), &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse JSON from OpenAI: %w -> %s", err, content)
	}

	return &parsed, nil
}

// mockParse simulates LLM parsing
func (s *Service) mockParse(rawHTML string) *ParsedProperty {
	// Try to find any price-like patterns in the HTML
	price := 450000.0
	if strings.Contains(rawHTML, "$") {
		price = 525000.0
	}

	parsed := &ParsedProperty{
		Address:       "AI-Parsed Property Address",
		City:          "San Francisco",
		State:         "CA",
		Zip:           "94102",
		Price:         price,
		Bedrooms:      3,
		Bathrooms:     2,
		SquareFootage: 1950,
		Description:   "This property was parsed by BriBox AI from raw HTML content. In production, OpenAI will extract detailed, accurate property information including features, amenities, and neighborhood details.",
		ImageURLs: []string{
			"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
		},
	}

	return parsed
}

// StructuredOutput converts parsed property to JSON string
func (p *ParsedProperty) StructuredOutput() string {
	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return fmt.Sprintf(`{"error": "%s"}`, err.Error())
	}
	return string(data)
}
