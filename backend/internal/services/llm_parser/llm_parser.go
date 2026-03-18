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
	APIKey    string // OpenAI API Key
	GeminiKey string // Google Gemini API Key
}

// NewService creates a new LLM parser service
func NewService(apiKey string, geminiKey string) *Service {
	return &Service{APIKey: apiKey, GeminiKey: geminiKey}
}

// ParseHTML takes raw HTML and uses an LLM to extract structured property data
func (s *Service) ParseHTML(ctx context.Context, rawHTML string) (*ParsedProperty, error) {
	log.Println("🧠 Parsing HTML with AI...")

	// 1. Try OpenAI first
	if s.APIKey != "" {
		parsed, err := s.parseWithOpenAI(ctx, rawHTML)
		if err == nil {
			return parsed, nil
		}

		// If it's a quota error (429), log it and move to Gemini fallback
		if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "quota") {
			log.Printf("⚠️ OpenAI quota exceeded, falling back to Gemini: %v", err)
		} else {
			// If it's another type of error, return it unless we have Gemini as a backup
			if s.GeminiKey == "" {
				return nil, err
			}
			log.Printf("⚠️ OpenAI error, trying Gemini fallback: %v", err)
		}
	}

	// 2. Try Gemini fallback
	if s.GeminiKey != "" {
		return s.parseWithGemini(ctx, rawHTML)
	}

	return nil, fmt.Errorf("No AI service available (OpenAI Key: %v, Gemini Key: %v)", s.APIKey != "", s.GeminiKey != "")
}

// parseWithGemini makes API calls to Google Gemini AI Studio
func (s *Service) parseWithGemini(ctx context.Context, rawHTML string) (*ParsedProperty, error) {
	log.Println("✨ Sending request to Gemini AI...")

	// Truncate rawHTML to avoid token limits
	if len(rawHTML) > 25000 {
		rawHTML = rawHTML[:25000]
	}

	// Prepare the Premium Luxury Gemini prompt
	prompt := "You are a luxury real estate curator. Extract data from the provided text and write a high-end, minimalist, luxury-focused description. Use professional, elegant language. If the price is in THB, convert to standard number format. Return a clean JSON object with these keys: address, city, state, zip, price (number), bedrooms (number), bathrooms (number), square_footage (number), description (the luxury version), image_urls (empty array). Return ONLY the raw JSON object, no markdown."

	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{
						"text": prompt + "\n\nHTML Content:\n" + rawHTML,
					},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"response_mime_type": "application/json",
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal Gemini request: %w", err)
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", s.GeminiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute Gemini req: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Gemini API returned status %d: %s", resp.StatusCode, string(body))
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
		return nil, fmt.Errorf("failed to decode Gemini response: %w", err)
	}

	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("Gemini API returned no candidates or parts")
	}

	content := result.Candidates[0].Content.Parts[0].Text

	// Clean up Gemini's markdown response if present
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	var parsed ParsedProperty
	if err := json.Unmarshal([]byte(content), &parsed); err != nil {
		return nil, fmt.Errorf("failed to parse JSON from Gemini: %w -> %s", err, content)
	}

	log.Printf("✅ Gemini successfully parsed property: %s", parsed.Address)
	return &parsed, nil
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
				"content": "You are a luxury real estate curator. Extract data from the provided text and write an elegant, premium, luxury-focused description using our 'Premium Default Template'. Return a JSON object with keys: address, city, state, zip, price, bedrooms, bathrooms, square_footage, description, image_urls.",
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
func (p *ParsedProperty) StructuredOutput() string {
	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return fmt.Sprintf(`{"error": "%s"}`, err.Error())
	}
	return string(data)
}
// RefineDescription takes a current description and a user instruction to generate a new version
func (s *Service) RefineDescription(ctx context.Context, currentDesc string, instruction string) (string, error) {
	log.Println("🎨 Refining description based on user instruction...")
	
	payload := map[string]interface{}{
		"model": "gpt-4o-mini",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a luxury real estate copywriter. I will give you a property description and an instruction on how to change it. Rewrite the description to be more premium, luxury-focused, and follow the instruction exactly. Return ONLY the new description text.",
			},
			{
				"role":    "user",
				"content": fmt.Sprintf("Current Description: %s\nInstruction: %s", currentDesc, instruction),
			},
		},
	}

	jsonData, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	if s.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+s.APIKey)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content, nil
	}
	return currentDesc, nil
}
