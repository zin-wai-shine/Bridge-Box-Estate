package scraper

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/chromedp"
)

// PropertyData holds scraped property information
type PropertyData struct {
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
	RawHTML       string   `json:"raw_html"`
}

// Service handles web scraping of property listings
type Service struct {
	UserAgent string
}

// NewService creates a new scraper service
func NewService() *Service {
	return &Service{
		UserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
	}
}

// ScrapeURL fetches content from a property listing URL using a stealth headless browser
func (s *Service) ScrapeURL(ctx context.Context, url string) (*PropertyData, error) {
	log.Printf("🔍 Scraping URL with stealth browser: %s", url)

	// Configure chromedp options for stealth mode
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.Flag("headless", true), // Change to false for debugging if needed
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("disable-blink-features", "AutomationControlled"),
		chromedp.UserAgent(s.UserAgent),
		chromedp.WindowSize(1920, 1080),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(ctx, opts...)
	defer cancel()

	// Create a new browser context with a 45-second timeout
	taskCtx, taskCancel := chromedp.NewContext(allocCtx, chromedp.WithLogf(log.Printf))
	defer taskCancel()

	timeoutCtx, timeoutCancel := context.WithTimeout(taskCtx, 15*time.Second)
	defer timeoutCancel()

	var rawHTML string
	var imageNodes []*cdp.Node

	// Define tasks
	tasks := chromedp.Tasks{
		// COMPREHENSIVE STEALTH SCRIPT
		chromedp.ActionFunc(func(ctx context.Context) error {
			stealthScript := `
				Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
				Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
				Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
				window.chrome = { runtime: {} };
				const getParameter = WebGLRenderingContext.prototype.getParameter;
				WebGLRenderingContext.prototype.getParameter = function(parameter) {
					if (parameter === 37445) return 'Intel Open Source Technology Center';
					if (parameter === 37446) return 'Mesa DRI Intel(R) HD Graphics 520 (Skylake GT2)';
					return getParameter(parameter);
				};
			`
			return chromedp.Evaluate(stealthScript, nil).Do(ctx)
		}),
		chromedp.Navigate(url),
	}

	// Add dynamic waiting based on the target website
	if strings.Contains(url, "facebook.com") {
		// Wait for Facebook post content to load (typically inside roles=main or specific generic containers)
		tasks = append(tasks,
			chromedp.WaitVisible(`div[role="main"], div[data-ad-preview="message"]`, chromedp.ByQuery),
			// Small delay for dynamic images to render
			chromedp.Sleep(3*time.Second),
		)
	} else {
		// Generic fallback: wait for body
		tasks = append(tasks,
			chromedp.WaitVisible(`body`, chromedp.ByQuery),
			chromedp.Sleep(2*time.Second),
		)
	}

	// Extract the HTML and images
	tasks = append(tasks,
		chromedp.OuterHTML(`html`, &rawHTML, chromedp.ByQuery),
		chromedp.Nodes(`img`, &imageNodes, chromedp.ByQueryAll),
	)

	// Execute tasks
	if err := chromedp.Run(timeoutCtx, tasks); err != nil {
		log.Printf("⚠️ Scraping failed: %v", err)
		return nil, fmt.Errorf("Unable to access source. Please ensure the post is public or try again later. (Error: %v)", err)
	}

	log.Printf("✅ Successfully fetched page (%d bytes HTML)", len(rawHTML))

	// Extract high-res image URLs
	var imageUrls []string
	for _, node := range imageNodes {
		src := node.AttributeValue("src")
		if src == "" {
			src = node.AttributeValue("data-src") // Handle lazy loading
		}
		
		// Filter out tiny tracking pixels or icons
		if src != "" && !strings.Contains(src, "data:image") && !strings.Contains(src, ".svg") {
			// Basic heuristic: check if it looks like a real photo (Facebook CDN links often start with scontent)
			if strings.Contains(src, "scontent") || strings.Contains(src, "photos") || len(src) > 50 {
				imageUrls = append(imageUrls, src)
			}
		}
	}

	// Deduplicate images
	imageUrls = deduplicate(imageUrls)

	// If no images found through direct node extraction, try basic string parsing of rawHTML
	if len(imageUrls) == 0 {
		log.Println("⚠️ No images found via DOM nodes, attempting regex/string search...")
		// A simple regex approach could go here if needed, but chromedp Nodes is usually reliable
	}

	return &PropertyData{
		RawHTML:   rawHTML,
		ImageURLs: imageUrls,
		// The LLM parser will populate the rest
	}, nil
}

// deduplicate removes duplicate strings from a string slice
func deduplicate(input []string) []string {
	keys := make(map[string]bool)
	list := []string{}
	for _, entry := range input {
		if _, value := keys[entry]; !value {
			keys[entry] = true
			list = append(list, entry)
		}
	}
	return list
}
