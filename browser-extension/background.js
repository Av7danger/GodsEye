console.log("background.js loaded");

function fetchSvg(url, sendResponse) {
  fetch(url)
    .then((response) => response.text())
    .then((data) => {
      sendResponse({ svg: data });
    })
    .catch((error) => {
      console.error("Error fetching SVG:", error);
      sendResponse({ error: error.toString() });
    });
}

const iconPaths = {
  fetchIconShare: "icons/share.svg",
  fetchIconInfo: "icons/info.svg",
  fetchIconFlag: "icons/flag.svg",
  fetchIconClose: "icons/close.svg",
  fetchIconBookmark: "icons/bookmark.svg",
};

// API endpoint for the GodsEye backend
const BACKEND_API_URL = "http://localhost:8503/api/analyze";

// Content types for the analysis
const types = {
  summary: "Summary",
  positive: "Positive",
  negative: "Negative",
  authenticity: "Authenticity",
};

// Enhanced background script functionality
class BackgroundManager {
    constructor() {
        this.notifications = new Map();
        this.analysisCache = new Map();
        this.setupEventListeners();
        this.initializeSettings();
    }

    setupEventListeners() {
        // Enhanced message handling
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Message received:', request);

            // Handle notification requests
            if (request.action === 'showNotification') {
                this.showBrowserNotification(request.title, request.message, request.type);
                return true;
            }

            // Handle history tracking
            if (request.action === 'trackArticleHistory') {
                this.trackArticleHistory(request.data);
                return true;
            }

            // Handle analysis caching
            if (request.action === 'cacheAnalysis') {
                this.cacheAnalysis(request.url, request.data);
                return true;
            }

            // Handle settings sync
            if (request.action === 'syncSettings') {
                this.syncSettings(request.settings);
                return true;
            }

            // Enhanced content fetching with caching
            if (request.text === "fetchContentFor") {
                this.fetchContentInfo(sendResponse, request.type, request.url);
                return true; // Will respond asynchronously
            }

            // Icon fetching
            if (iconPaths[request.text]) {
                fetchSvg(chrome.runtime.getURL(iconPaths[request.text]), sendResponse);
                return true;
            }

            return false;
        });

        // Tab update monitoring for smart notifications
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.onTabUpdated(tabId, tab);
            }
        });

        // Alarm handling for scheduled tasks
        chrome.alarms.onAlarm.addListener((alarm) => {
            this.handleAlarm(alarm);
        });

        // Installation and update handling
        chrome.runtime.onInstalled.addListener((details) => {
            this.onInstalled(details);
        });
    }

    // Enhanced notification system
    async showBrowserNotification(title, message, type = 'basic', buttons = []) {
        try {
            const settings = await this.getSettings();
            if (!settings.browserNotifications) {
                return; // Notifications disabled
            }

            const notificationId = `godseye_${Date.now()}`;
            const options = {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('assets/logo.png'),
                title: title || 'GodsEye',
                message: message,
                priority: type === 'error' ? 2 : type === 'warning' ? 1 : 0
            };

            // Add action buttons for interactive notifications
            if (buttons.length > 0) {
                options.buttons = buttons;
            }

            // Show notification
            chrome.notifications.create(notificationId, options);

            // Store notification reference
            this.notifications.set(notificationId, {
                type,
                timestamp: Date.now(),
                title,
                message
            });

            // Auto-clear after delay
            setTimeout(() => {
                chrome.notifications.clear(notificationId);
                this.notifications.delete(notificationId);
            }, 10000);

        } catch (error) {
            console.error('Failed to show notification:', error);
        }
    }

    // Enhanced article history tracking
    async trackArticleHistory(articleData) {
        try {
            const result = await chrome.storage.local.get(['analysisHistory', 'settings']);
            const history = result.analysisHistory || [];
            const settings = result.settings || {};

            // Check if history tracking is enabled
            if (settings.trackHistory === false) {
                return;
            }

            // Add unique ID if not present
            if (!articleData.id) {
                articleData.id = Date.now().toString();
            }

            // Check for duplicates (same URL within 1 hour)
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            const isDuplicate = history.some(item => 
                item.url === articleData.url && 
                item.timestamp > oneHourAgo
            );

            if (!isDuplicate) {
                // Add to history
                history.push(articleData);

                // Maintain history size limit
                const historyLimit = settings.historyLimit || 1000;
                if (history.length > historyLimit) {
                    history.splice(0, history.length - historyLimit);
                }

                // Save updated history
                await chrome.storage.local.set({ analysisHistory: history });

                // Send analytics if enabled
                if (settings.analytics) {
                    this.sendAnalytics('article_analyzed', {
                        domain: new URL(articleData.url).hostname,
                        hasAnalysis: !!articleData.analysis
                    });
                }

                console.log('Article tracked in history:', articleData.title);
            }

        } catch (error) {
            console.error('Failed to track article history:', error);
        }
    }

    // Analysis result caching
    cacheAnalysis(url, analysisData) {
        try {
            const cacheKey = this.generateCacheKey(url);
            const cacheEntry = {
                data: analysisData,
                timestamp: Date.now(),
                url: url
            };

            this.analysisCache.set(cacheKey, cacheEntry);

            // Clean old cache entries (older than 1 hour)
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            for (const [key, entry] of this.analysisCache.entries()) {
                if (entry.timestamp < oneHourAgo) {
                    this.analysisCache.delete(key);
                }
            }

            console.log('Analysis cached for:', url);
        } catch (error) {
            console.error('Failed to cache analysis:', error);
        }
    }

    // Get cached analysis
    getCachedAnalysis(url) {
        const cacheKey = this.generateCacheKey(url);
        const cacheEntry = this.analysisCache.get(cacheKey);

        if (cacheEntry) {
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            if (cacheEntry.timestamp > fiveMinutesAgo) {
                return cacheEntry.data;
            } else {
                this.analysisCache.delete(cacheKey);
            }
        }

        return null;
    }

    // Generate cache key from URL
    generateCacheKey(url) {
        try {
            const urlObj = new URL(url);
            return `${urlObj.hostname}${urlObj.pathname}`;
        } catch {
            return url;
        }
    }

    // Enhanced content fetching with intelligent caching and fallbacks
    async fetchContentInfo(sendResponse, type, url) {
        try {
            // Check cache first
            const cachedData = this.getCachedAnalysis(url);
            if (cachedData && cachedData[type]) {
                console.log('Serving from cache:', type);
                sendResponse({
                    content: cachedData[type],
                    fullData: cachedData,
                    cached: true
                });
                return;
            }

            // Check if we should use mock data for development
            const settings = await this.getSettings();
            if (settings.useMockData || !url) {
                this.serveMockData(sendResponse, type, url);
                return;
            }

            // Make API request with timeout and retry logic
            const analysisData = await this.fetchFromAPI(url, type);
            
            if (analysisData) {
                // Cache the results
                this.cacheAnalysis(url, analysisData);

                // Send response
                sendResponse({
                    content: analysisData[type] || types[type],
                    fullData: analysisData,
                    cached: false
                });
            } else {
                // Fallback to mock data if API fails
                this.serveMockData(sendResponse, type, url);
            }

        } catch (error) {
            console.error('Error fetching content:', error);
            this.serveMockData(sendResponse, type, url);
        }
    }

    // Fetch from API with retry logic
    async fetchFromAPI(url, type, retryCount = 0) {
        const maxRetries = 2;
        const timeout = 10000; // 10 seconds

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(BACKEND_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    type: type,
                    enhanced: true // Request enhanced analysis
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API response ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Transform API response to expected format
            return this.transformAPIResponse(data, type);

        } catch (error) {
            console.error(`API request failed (attempt ${retryCount + 1}):`, error);

            // Retry logic
            if (retryCount < maxRetries && !error.name === 'AbortError') {
                console.log(`Retrying API request in ${(retryCount + 1) * 2} seconds...`);
                await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
                return this.fetchFromAPI(url, type, retryCount + 1);
            }

            // Log API failure for analytics
            this.sendAnalytics('api_failure', {
                error: error.message,
                type: type,
                retryCount: retryCount
            });

            return null;
        }
    }

    // Transform API response to internal format
    transformAPIResponse(apiData, requestedType) {
        try {
            return {
                summary: apiData.summary || 'Analysis completed successfully.',
                positive: apiData.sentiment?.positive_text || 'Positive aspects identified.',
                negative: apiData.sentiment?.negative_text || 'Negative aspects identified.',
                authenticity: apiData.credibility?.assessment || 'Authenticity evaluated.',
                // Enhanced data
                bias: apiData.bias,
                sentiment: apiData.sentiment,
                factCheck: apiData.factCheck,
                credibility: apiData.credibility,
                metadata: apiData.metadata
            };
        } catch (error) {
            console.error('Failed to transform API response:', error);
            return null;
        }
    }

    // Serve mock data for development/testing
    serveMockData(sendResponse, type, url) {
        const mockData = this.generateMockData(type, url);
        
        setTimeout(() => {
            sendResponse({
                content: mockData.content,
                fullData: mockData,
                mock: true
            });
        }, Math.random() * 1000 + 500); // Simulate API delay
    }

    // Generate realistic mock data
    generateMockData(type, url) {
        const domain = url ? new URL(url).hostname : 'example.com';
        const isReliableSource = ['bbc.com', 'reuters.com', 'ap.org'].some(s => domain.includes(s));

        const mockSentiment = {
            positive: Math.floor(Math.random() * 60) + 20,
            negative: Math.floor(Math.random() * 40) + 10,
            neutral: Math.floor(Math.random() * 30) + 10,
            dominant: Math.random() > 0.5 ? 'positive' : 'negative',
            confidence: Math.random() * 0.3 + 0.7
        };

        const mockBias = {
            overall: (Math.random() - 0.5) * 1.5, // -0.75 to 0.75
            type: Math.random() > 0.6 ? 'center' : Math.random() > 0.5 ? 'left' : 'right',
            confidence: Math.random() * 0.4 + 0.6,
            factors: {
                political: Math.random() * 100,
                emotional: Math.random() * 100,
                factual: Math.random() * 40 + 60
            }
        };

        const mockCredibility = {
            status: isReliableSource ? 'reliable' : (Math.random() > 0.5 ? 'reliable' : 'questionable'),
            score: isReliableSource ? 0.9 : Math.random() * 0.6 + 0.3,
            factors: {
                domainAge: Math.floor(Math.random() * 20) + 1,
                https: url ? url.startsWith('https://') : true,
                reputation: isReliableSource ? 'high' : 'medium'
            }
        };

        return {
            content: types[type] || 'Mock analysis content',
            summary: 'This is a mock analysis of the article content. The article discusses current events with a focus on factual reporting.',
            positive: 'The article presents information in a clear and informative manner.',
            negative: 'Some claims may require additional verification.',
            authenticity: mockCredibility.status === 'reliable' ? 'Source appears reliable' : 'Source reliability unclear',
            sentiment: mockSentiment,
            bias: mockBias,
            credibility: mockCredibility,
            factCheck: {
                claims: [
                    {
                        text: 'Example claim that can be fact-checked',
                        status: 'verified',
                        confidence: 0.8
                    }
                ],
                overallReliability: 0.75
            }
        };
    }

    // Tab update handler for contextual notifications
    async onTabUpdated(tabId, tab) {
        try {
            const settings = await this.getSettings();
            
            if (settings.smartNotifications && this.isNewsURL(tab.url)) {
                // Send contextual notification about analysis availability
                setTimeout(() => {
                    this.showBrowserNotification(
                        'GodsEye Available',
                        'Click the GodsEye icon to analyze this article.',
                        'info'
                    );
                }, 3000); // Wait 3 seconds after page load
            }
        } catch (error) {
            console.error('Error in tab update handler:', error);
        }
    }

    // Check if URL is likely a news article
    isNewsURL(url) {
        if (!url) return false;
        
        const newsIndicators = [
            '/news/', '/article/', '/story/', '/post/',
            'news.', 'articles.', 'blog.',
            '.com/news', '.com/article', '.org/news'
        ];

        const newsWords = ['news', 'article', 'story', 'report', 'breaking'];
        
        return newsIndicators.some(indicator => url.includes(indicator)) ||
               newsWords.some(word => url.toLowerCase().includes(word));
    }

    // Handle scheduled alarms
    handleAlarm(alarm) {
        console.log('Alarm triggered:', alarm.name);
        
        switch (alarm.name) {
            case 'cleanupCache':
                this.cleanupCache();
                break;
            case 'syncHistory':
                this.syncHistoryToCloud();
                break;
            case 'updateSources':
                this.updateReliableSources();
                break;
            default:
                console.log('Unknown alarm:', alarm.name);
        }
    }

    // Installation and update handler
    async onInstalled(details) {
        console.log('Extension installed/updated:', details);

        if (details.reason === 'install') {
            // First-time installation
            await this.initializeSettings();
            await this.showWelcomeNotification();
            
            // Set up periodic alarms
            chrome.alarms.create('cleanupCache', { periodInMinutes: 60 });
            chrome.alarms.create('syncHistory', { periodInMinutes: 1440 }); // Daily
            
        } else if (details.reason === 'update') {
            // Extension updated
            await this.handleUpdate(details.previousVersion);
        }
    }

    // Initialize default settings
    async initializeSettings() {
        try {
            const result = await chrome.storage.local.get(['settings']);
            const currentSettings = result.settings || {};

            const defaultSettings = {
                darkMode: false,
                autoAnalysis: true,
                analysisDelay: 3000,
                notifications: true,
                browserNotifications: true,
                smartNotifications: true,
                trackHistory: true,
                historyLimit: 1000,
                blockTrackers: false,
                useMockData: false,
                analytics: true,
                ...currentSettings // Preserve existing settings
            };

            await chrome.storage.local.set({ settings: defaultSettings });
            console.log('Settings initialized:', defaultSettings);
        } catch (error) {
            console.error('Failed to initialize settings:', error);
        }
    }

    // Get current settings
    async getSettings() {
        try {
            const result = await chrome.storage.local.get(['settings']);
            return result.settings || {};
        } catch (error) {
            console.error('Failed to get settings:', error);
            return {};
        }
    }

    // Show welcome notification for new users
    async showWelcomeNotification() {
        this.showBrowserNotification(
            'Welcome to GodsEye!',
            'Your news analysis companion is ready. Visit any news article to get started.',
            'info'
        );
    }

    // Handle extension updates
    async handleUpdate(previousVersion) {
        console.log(`Updated from version ${previousVersion}`);
        
        // Migration logic for breaking changes
        if (previousVersion < '1.1.0') {
            await this.migrateToV110();
        }

        this.showBrowserNotification(
            'GodsEye Updated',
            'New features and improvements are now available!',
            'info'
        );
    }

    // Migration for version 1.1.0
    async migrateToV110() {
        try {
            // Migrate old bookmark format if needed
            const result = await chrome.storage.local.get(['savedArticles', 'bookmarks']);
            
            if (result.savedArticles && !result.bookmarks) {
                await chrome.storage.local.set({ bookmarks: result.savedArticles });
                console.log('Migrated savedArticles to bookmarks');
            }
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }

    // Send analytics (if enabled)
    sendAnalytics(event, data = {}) {
        // Implement analytics reporting here
        console.log('Analytics:', event, data);
    }

    // Clean up old cache entries
    cleanupCache() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        let cleaned = 0;
        
        for (const [key, entry] of this.analysisCache.entries()) {
            if (entry.timestamp < oneHourAgo) {
                this.analysisCache.delete(key);
                cleaned++;
            }
        }
        
        console.log(`Cleaned ${cleaned} cache entries`);
    }

    // Sync settings across devices
    async syncSettings(settings) {
        try {
            await chrome.storage.sync.set({ settings });
            console.log('Settings synced to cloud');
        } catch (error) {
            console.error('Failed to sync settings:', error);
        }
    }

    // Tracker blocking functionality using declarativeNetRequest
    trackerBlockingEnabled = false;
    trackerRules = [];

    initializeTrackerBlocking() {
      chrome.storage.local.get(['settings'], (result) => {
        const settings = result.settings || {};
        this.trackerBlockingEnabled = settings.blockTrackers || false;
        
        if (this.trackerBlockingEnabled) {
          this.loadTrackerList();
        }
      });
      
      // Listen for settings changes
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.settings) {
          const newSettings = changes.settings.newValue || {};
          const oldSettings = changes.settings.oldValue || {};
          
          // Check if tracker blocking setting changed
          if (newSettings.blockTrackers !== oldSettings.blockTrackers) {
            this.trackerBlockingEnabled = newSettings.blockTrackers || false;
            
            if (this.trackerBlockingEnabled) {
              this.loadTrackerList();
            } else {
              this.disableTrackerBlocking();
            }
          }
        }
      });
    }

    // Load tracker list and set up blocking rules
    loadTrackerList() {
      // Define tracker patterns - these must use proper declarativeNetRequest format
      const trackerPatterns = [
        "*://*.facebook.net/*",
        "*://*.facebook.com/tr*",
        "*://*.doubleclick.net/*",
        "*://*.google-analytics.com/*",
        "*://*.googletagmanager.com/*",
        "*://*.hotjar.com/*",
        "*://*.adnxs.com/*",
        "*://*.scorecardresearch.com/*",
        "*://*.amazon-adsystem.com/*",
        "*://*.criteo.com/*",
        "*://*.quantserve.com/*",
        "*://*.pubmatic.com/*",
        "*://*.rubiconproject.com/*",
        "*://*.chartbeat.com/*",
        "*://*.moatads.com/*"
      ];
      
      // Create rules for the declarativeNetRequest API
      this.trackerRules = trackerPatterns.map((pattern, index) => {
        return {
          id: index + 1, // Rule IDs must be positive integers
          priority: 1,
          action: { type: "block" },
          condition: {
            urlFilter: pattern,
            resourceTypes: ["script", "image", "xmlhttprequest", "sub_frame"]
          }
        };
      });
      
      this.enableTrackerBlocking();
      console.log("Tracker blocking enabled with", this.trackerRules.length, "rules");
    }

    // Enable tracker blocking
    enableTrackerBlocking() {
      if (!this.trackerRules || this.trackerRules.length === 0) {
        return;
      }
      
      // First remove any existing rules
      chrome.declarativeNetRequest.getDynamicRules().then(existingRules => {
        const ruleIdsToRemove = existingRules.map(rule => rule.id);
        
        // Update the dynamic rules
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIdsToRemove,
          addRules: this.trackerRules
        }).then(() => {
          console.log(`Enabled ${this.trackerRules.length} tracker blocking rules`);
        }).catch(error => {
          console.error("Error enabling tracker blocking:", error);
        });
      }).catch(error => {
        console.error("Error getting existing rules:", error);
      });
    }

    // Disable tracker blocking
    disableTrackerBlocking() {
      chrome.declarativeNetRequest.getDynamicRules().then(existingRules => {
        const ruleIdsToRemove = existingRules.map(rule => rule.id);
        
        chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIdsToRemove,
          addRules: []
        }).then(() => {
          console.log("Tracker blocking disabled");
        }).catch(error => {
          console.error("Error disabling tracker blocking:", error);
        });
      }).catch(error => {
        console.error("Error getting existing rules:", error);
      });
    }
}

// Initialize the background manager
const backgroundManager = new BackgroundManager();

// Initialize tracker blocking
backgroundManager.initializeTrackerBlocking();
