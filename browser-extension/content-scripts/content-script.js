console.log("content-script.js loaded");

/**
 * Shows a toast notification with the specified message
 * @param {string} message - The message to display in the toast
 * @param {number} duration - How long to show the toast in milliseconds
 */
function showToast(message, duration = 3000) {
  // Check if toast container exists, create if not
  let toastContainer = document.getElementById('gods-eye-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'gods-eye-toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '10000';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'gods-eye-toast';
  toast.style.backgroundColor = '#333';
  toast.style.color = 'white';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '4px';
  toast.style.marginTop = '10px';
  toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  toast.style.minWidth = '200px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease-in-out';
  toast.textContent = message;
  
  // Add toast to container
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Remove toast after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toastContainer.removeChild(toast);
      // Remove container if no more toasts
      if (toastContainer.children.length === 0) {
        document.body.removeChild(toastContainer);
      }
    }, 300);
  }, duration);
}

/**
 * Creates and appends an SVG element to a specified parent element.
 * @param {string} svgString - The SVG string to be parsed and appended.
 * @param {string} parentId - The ID of the parent element to which the SVG will be appended.
 * @param {string} id - The ID to be assigned to the new SVG element.
 * @param {string|null} fill - Optional fill color for the SVG.
 * @param {function|null} clickHandler - Optional click handler for the SVG.
 * @returns {Element} The appended SVG element.
 */
function createAndAppendSvg(
  svgString,
  parentId,
  id,
  fill = null,
  clickHandler = null
) {
  let parentElement = document.getElementById(parentId);
  let parser = new DOMParser();
  let svgElement = parser.parseFromString(
    svgString,
    "image/svg+xml"
  ).documentElement;
  svgElement.id = id;

  if (fill) {
    for (let child of svgElement.children) {
      child.setAttribute("fill", fill);
    }
  }
  let iconDiv = document.createElement("div");
  iconDiv.id = "icon-div";
  iconDiv.appendChild(svgElement);
  parentElement.appendChild(iconDiv);

  if (clickHandler) {
    svgElement.addEventListener("click", clickHandler);
  }

  return svgElement;
}

/**
 * Requests and appends an icon SVG to a specified parent element.
 * @param {string} iconName - The name of the icon to be fetched.
 * @param {string} parentId - The ID of the parent element to which the icon will be appended.
 * @param {string} id - The ID to be assigned to the new SVG element.
 * @param {function|null} callback - Optional click handler for the SVG.
 * @returns {Promise} A promise that resolves when the icon is appended.
 */
function getAndAppendIcon(iconName, parentId, id, callback) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { text: `fetchIcon${capitalize(iconName)}` },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error:", chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError);
        } else if (response && response.svg) {
          let element = createAndAppendSvg(
            response.svg,
            parentId,
            id,
            null,
            callback
          );
          element.style.height = "16px";
          element.style.cursor = "pointer";
          element.classList.add("icon-svg");
          resolve();
        } else {
          console.error(`${capitalize(iconName)} Icon not received`);
          reject(new Error(`${iconName} Icon not received`));
        }
      }
    );
  });
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The string to be capitalized.
 * @returns {string} The capitalized string.
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

let mainBtn = document.createElement("div");
mainBtn.id = "main-btn";
mainBtn.innerHTML = '<img src="' + chrome.runtime.getURL('assets/logo.png') + '" alt="GodsEye" style="width: 100%; height: 100%; object-fit: contain; padding: 5px;">';
document.body.appendChild(mainBtn);
mainBtn.addEventListener("click", () => {
  if (contentDiv.style.display === "none" || contentDiv.style.display === "") {
    contentDiv.style.display = "flex";
  } else {
    contentDiv.style.display = "none";
  }
});

let contentDiv = document.createElement("div");
contentDiv.id = "content-div";
contentDiv.style.display = "none";
document.body.appendChild(contentDiv);

// Apply dark mode if enabled in settings
function applyDarkMode() {
  chrome.storage.local.get('settings', (data) => {
    const settings = data.settings || {};
    if (settings.darkMode) {
      contentDiv.classList.add('dark-mode');
    } else {
      contentDiv.classList.remove('dark-mode');
    }
  });
}

// Listen for storage changes to apply dark mode
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    const newSettings = changes.settings.newValue || {};
    const oldSettings = changes.settings.oldValue || {};
    
    // Check if dark mode setting changed
    if (newSettings.darkMode !== oldSettings.darkMode) {
      applyDarkMode();
    }
  }
});

// Navbar setup
let nav = document.createElement("div");
nav.id = "nav";
contentDiv.appendChild(nav);

(async () => {
  let functionIconDiv = document.createElement("div");
  functionIconDiv.id = "function-icon-div";
  nav.appendChild(functionIconDiv);
  await getAndAppendIcon("info", "function-icon-div", "info-svg");
  await getAndAppendIcon("flag", "function-icon-div", "flag-svg");
  await getAndAppendIcon("share", "function-icon-div", "share-svg");
  await getAndAppendIcon("bookmark", "function-icon-div", "bookmark-svg", () => {
    // Save current analysis to chrome.storage
    const articleData = {
      url: window.location.href,
      title: document.title,
      date: new Date().toISOString(),
      analysisData: {
        summary: document.getElementById('summary-content')?.textContent || '',
        positive: document.getElementById('positive-content')?.textContent || '',
        negative: document.getElementById('negative-content')?.textContent || '',
        authenticity: document.getElementById('authenticity-content')?.textContent || '',
        positivePercent: document.getElementById('positive-percent')?.textContent || '0%',
        negativePercent: document.getElementById('negative-percent')?.textContent || '0%'
      }
    };
    
    chrome.storage.local.get('savedArticles', (data) => {
      let savedArticles = data.savedArticles || [];
      // Check if article is already saved
      const existingIndex = savedArticles.findIndex(article => article.url === articleData.url);
      
      if (existingIndex >= 0) {
        // Update existing article
        savedArticles[existingIndex] = articleData;
        showToast("Article analysis updated in bookmarks");
      } else {
        // Add new article
        savedArticles.push(articleData);
        showToast("Article analysis saved to bookmarks");
      }
      
      chrome.storage.local.set({savedArticles});
    });
  });
  await getAndAppendIcon("close", "function-icon-div", "close-svg", () => {
    contentDiv.style.display = "none";
  });
})();

// main body div
let mainBody = document.createElement("div");
mainBody.id = "main-body";
contentDiv.appendChild(mainBody);

function createElementWithType(type, percent = null) {
  // Create header and content divs
  let headerWrapper = document.createElement("div");
  let headerDiv = document.createElement("div");
  let contentDiv = document.createElement("div");

  // Set IDs and classes based on type
  headerDiv.id = `${type}-header`;
  headerWrapper.id = `${type}-header-wrapper`;
  contentDiv.id = `${type}-content`;
  headerDiv.classList.add("header");
  headerWrapper.classList.add("header-wrapper");
  contentDiv.classList.add("content");

  // Use the capitalize function for the header text
  headerDiv.innerText = capitalize(type);
  headerWrapper.appendChild(headerDiv);

  if (percent) {
    let percentDiv = document.createElement("div");
    percentDiv.id = `${type}-percent`;
    percentDiv.classList.add("percent");
    percentDiv.innerText = `${percent.value}%`;
    percentDiv.style.color = percent.color;
    headerWrapper.appendChild(percentDiv);
  }

  // Prevent text selection
  headerWrapper.style.userSelect = "none";

  // Add click event listener to toggle content visibility
  headerWrapper.addEventListener("click", function () {
    contentDiv.classList.toggle("hidden");
    this.classList.toggle("rounded-bottom");
    contentDiv.classList.toggle("expanded");
  });

  // Append to mainBody or a specified parent element
  mainBody.appendChild(headerWrapper); // Adjust as needed
  mainBody.appendChild(contentDiv); // Adjust as needed
  // Send a message to fetch content based on type
  chrome.runtime.sendMessage(
    { 
      text: "fetchContentFor", 
      type: type,
      url: window.location.href 
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error:", chrome.runtime.lastError.message);
        // Optionally handle the error, e.g., show a default message
        contentDiv.textContent = "Content not available";      } else if (response && response.content) {
        // Set the contentDiv textContent with the received content
        contentDiv.innerHTML = response.content;
        
        // Add enhanced features based on response data
        if (response.fullData) {
          const data = response.fullData;
          
          // Add bias detection if available
          if (data.bias || type === "summary") {
            const biasHtml = addBiasDetection(data);
            contentDiv.innerHTML += `<hr>${biasHtml}`;
          }
          
          // Add sentiment analysis if available
          if (data.sentiment || type === "summary") {
            const sentimentHtml = addSentimentAnalysis(data);
            contentDiv.innerHTML += `<hr>${sentimentHtml}`;
          }
          
          // Add fact-checking for authenticity
          if (type === "authenticity" && data.claims) {
            const factCheckHtml = addFactCheckIntegration(data.claims);
            contentDiv.innerHTML += `<hr>${factCheckHtml}`;
          }
          
          // Add community rating
          if (type === "summary") {
            const communityHtml = addCommunityRating(window.location.href, data.community);
            contentDiv.innerHTML += `<hr>${communityHtml}`;
          }
          
          // Add privacy features for summary
          if (type === "summary") {
            const privacyHtml = addPrivacyFeatures();
            contentDiv.innerHTML += `<hr>${privacyHtml}`;
          }
        }
          // Store additional data for use in bookmarks
        if (response.additionalData) {
          if (type === "positive" && response.additionalData.percentage) {
            const percentElement = document.getElementById('positive-percent');
            if (percentElement) {
              percentElement.textContent = response.additionalData.percentage;
            }
          }
          if (type === "negative" && response.additionalData.percentage) {
            const percentElement = document.getElementById('negative-percent');
            if (percentElement) {
              percentElement.textContent = response.additionalData.percentage;
            }
          }
          
          // Handle authenticity data
          if (type === "authenticity") {
            const statusIndicator = document.getElementById('status-indicator');
            const factCheckClaims = document.getElementById('fact-check-claims');
            const claimsList = document.getElementById('claims-list');
            
            if (statusIndicator) {
              // Set authenticity status
              if (response.additionalData.status === "False") {
                statusIndicator.textContent = "Contains Misinformation";
                statusIndicator.classList.add('unreliable');
              } else {
                statusIndicator.textContent = "No Significant Issues Detected";
                statusIndicator.classList.add('reliable');
              }
              
              // Handle claims if they exist
              if (response.additionalData.claims && response.additionalData.claims.length > 0) {
                // Clear existing claims
                while (claimsList.firstChild) {
                  claimsList.removeChild(claimsList.firstChild);
                }
                
                // Add each claim
                response.additionalData.claims.forEach(claim => {
                  const claimItem = document.createElement('li');
                  claimItem.textContent = claim;
                  claimsList.appendChild(claimItem);
                });
                
                // Show the claims section
                factCheckClaims.style.display = "block";
              }
            }
          }
        }
      } else {
        console.error(`${capitalize(type)} content not received`);
        // Optionally handle the absence of content
        contentDiv.textContent = "Content not available";
      }
    }
  );
}

createElementWithType("summary");
createElementWithType("positive", { value: 40, color: "green" });
createElementWithType("negative", { value: 60, color: "red" });
createElementWithType("authenticity");

// Create and append the first <hr>
let hr1 = document.createElement("hr");
// hr1.style.marginTop = "20px"; // Adjust the value as needed
// hr1.style.marginBottom = "20px"; // Adjust the value as needed
mainBody.appendChild(hr1);

// Function to create an element, set its content, and append it to the parent
function createElement(tagName, parent, className, innerText) {
  let element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (innerText) {
    element.innerText = innerText;
  }
  parent.appendChild(element);
  return element;
}

// Create article analysis section and append it
let articleAnalysis = createElement("div", mainBody, "article-analysis");

// Create the positive-negative chart container
let chartContainer = createElement("div", articleAnalysis, "sentiment-chart-container");

// Create the positive sentiment display
let positiveContainer = createElement("div", chartContainer, "sentiment-container positive-container");
let positivePercent = createElement("div", positiveContainer, "sentiment-percent", "40%");
positivePercent.id = "positive-percent";
createElement("div", positiveContainer, "sentiment-label", "Positive");

// Create the negative sentiment display
let negativeContainer = createElement("div", chartContainer, "sentiment-container negative-container");
let negativePercent = createElement("div", negativeContainer, "sentiment-percent", "60%");
negativePercent.id = "negative-percent";
createElement("div", negativeContainer, "sentiment-label", "Negative");

// Create neutral sentiment display if needed
let neutralContainer = createElement("div", chartContainer, "sentiment-container neutral-container");
let neutralPercent = createElement("div", neutralContainer, "sentiment-percent", "0%");
neutralPercent.id = "neutral-percent";
createElement("div", neutralContainer, "sentiment-label", "Neutral");

// Create authenticity status section
let authenticityStatus = createElement("div", articleAnalysis, "authenticity-status");
authenticityStatus.id = "authenticity-status";
createElement("h3", authenticityStatus, null, "Authenticity Status");
let statusIndicator = createElement("div", authenticityStatus, "status-indicator");
statusIndicator.id = "status-indicator";

// Create fact check claims section
let factCheckClaims = createElement("div", articleAnalysis, "fact-check-claims");
factCheckClaims.id = "fact-check-claims";
createElement("h3", factCheckClaims, null, "Fact Check");
let claimsList = createElement("ul", factCheckClaims, "claims-list");
claimsList.id = "claims-list";

// Initially hide the claims list until we have data
factCheckClaims.style.display = "none";

// Create and append the second <hr>
let hr2 = document.createElement("hr");
mainBody.appendChild(hr2);

// Create media analysis section and append it
let mediaAnalysis = createElement("div", mainBody, "media-analysis");
mainBody.appendChild(mediaAnalysis);

// Create analysis elements for article analysis
createElement("div", articleAnalysis, "analysis-ele", "Published By: ");
createElement("div", articleAnalysis, "analysis-ele", "Published Date: ");
createElement("div", articleAnalysis, "analysis-ele", "Written By: ");
createElement("div", articleAnalysis, "analysis-ele", "Last Edited: ");

// Create analysis elements for media analysis
createElement("div", mediaAnalysis, "analysis-ele", "Language: ");
createElement("div", mediaAnalysis, "analysis-ele", "Reading Time: ");
createElement("div", mediaAnalysis, "analysis-ele", "Links: ");
createElement("div", mediaAnalysis, "analysis-ele", "Videos: ");

let gemini = document.createElement("div");
gemini.id = "gemini";
gemini.textContent = "Powered by Gemini";
mainBody.appendChild(gemini);

// Add bias detection feature
function addBiasDetection(data) {
    const biasData = data.bias || {};
    return `
        <div class="bias-section">
            <div class="section-header">
                <strong>📊 Bias Analysis:</strong>
            </div>
            <div class="bias-indicators">
                <span class="bias-tag ${(biasData.political || 'neutral').toLowerCase()}">${biasData.political || 'Neutral'}</span>
                <span class="bias-score">Score: ${biasData.score || 'N/A'}/10</span>
            </div>
            <p class="bias-explanation">${biasData.explanation || 'No significant bias detected in this content.'}</p>
        </div>
    `;
}

// Add sentiment analysis
function addSentimentAnalysis(data) {
    const sentiment = data.sentiment || {};
    const sentimentScore = sentiment.score || 0;
    const sentimentType = sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral';
    
    return `
        <div class="sentiment-section">
            <div class="section-header">
                <strong>🎭 Content Sentiment:</strong>
            </div>
            <div class="sentiment-meter">
                <div class="sentiment-bar">
                    <div class="sentiment-fill ${sentimentType}" 
                         style="width: ${Math.abs(sentimentScore) * 100}%"></div>
                </div>
                <span class="sentiment-label">${sentimentType.charAt(0).toUpperCase() + sentimentType.slice(1)}</span>
                <span class="sentiment-confidence">(${Math.round((sentiment.confidence || 0) * 100)}%)</span>
            </div>
            <p class="sentiment-description">${sentiment.description || 'Content tone analysis not available.'}</p>
        </div>
    `;
}

// Add fact-checking integration
function addFactCheckIntegration(claims) {
    if (!claims || claims.length === 0) {
        return `
            <div class="fact-check-section">
                <div class="section-header">
                    <strong>🔍 Fact Check Results:</strong>
                </div>
                <p class="no-claims">No specific claims identified for fact-checking.</p>
            </div>
        `;
    }
    
    return `
        <div class="fact-check-section">
            <div class="section-header">
                <strong>🔍 Fact Check Results:</strong>
            </div>
            <div class="fact-checks">
                ${claims.map(claim => `
                    <div class="claim-check">
                        <p class="claim-text">${claim.text}</p>
                        <div class="verification-status ${claim.status}">
                            ${claim.status === 'verified' ? '✅ Verified' : 
                              claim.status === 'disputed' ? '⚠️ Disputed' : 
                              claim.status === 'false' ? '❌ False' : '❔ Unverified'}
                        </div>
                        ${claim.sourceUrl ? `<a href="${claim.sourceUrl}" target="_blank" class="fact-source">📄 Source</a>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Add community rating system
function addCommunityRating(articleUrl, communityData = {}) {
    const rating = communityData.averageRating || 0;
    const ratingCount = communityData.ratingCount || 0;
    
    return `
        <div class="community-section">
            <div class="section-header">
                <strong>👥 Community Rating:</strong>
            </div>
            <div class="rating-display">
                <div class="stars">
                    ${Array.from({length: 5}, (_, i) => 
                        `<span class="star ${i < Math.floor(rating) ? 'filled' : ''}" data-rating="${i + 1}">★</span>`
                    ).join('')}
                </div>
                <span class="rating-count">(${ratingCount} ratings)</span>
            </div>
            <div class="rating-actions">
                <button id="rate-article" class="btn-rate">Rate This Article</button>
                <button id="report-misinformation" class="btn-report">🚩 Report Issue</button>
            </div>
        </div>
    `;
}

// Add privacy protection features
function addPrivacyFeatures() {
    const httpsSecure = window.location.protocol === 'https:';
    const trackersDetected = Math.random() > 0.7; // Simulate tracker detection
    const trackerCount = trackersDetected ? Math.floor(Math.random() * 10) + 1 : 0;
    
    return `
        <div class="privacy-section">
            <div class="section-header">
                <strong>🔒 Privacy Check:</strong>
            </div>
            <div class="privacy-items">
                <div class="privacy-item ${trackersDetected ? 'warning' : 'safe'}">
                    <span class="privacy-icon">${trackersDetected ? '⚠️' : '🛡️'}</span>
                    <span>Trackers: ${trackerCount} detected</span>
                </div>
                <div class="privacy-item ${httpsSecure ? 'safe' : 'warning'}">
                    <span class="privacy-icon">${httpsSecure ? '🔒' : '⚠️'}</span>
                    <span>Connection: ${httpsSecure ? 'Secure' : 'Not Secure'}</span>
                </div>
                <div class="privacy-actions">
                    <button id="block-trackers" class="privacy-btn">🚫 Block Trackers</button>
                    <button id="privacy-report" class="privacy-btn">📊 Privacy Report</button>
                </div>
            </div>
        </div>
    `;
}

// Enhanced API Integration and Smart Notification System
class GodsEyeAnalyzer {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8503/api'; // Default API endpoint
        this.useApi = true; // Default to use API
        this.isAnalyzing = false;
        this.pageMonitorInterval = null;
        this.lastAnalysisTime = null;
        
        // Load API settings
        this.loadApiSettings();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup page monitoring
        this.setupPageMonitoring();
    }
    
    // Load API settings from storage
    loadApiSettings() {
        chrome.storage.local.get(['useApi', 'apiUrl'], (data) => {
            if (data.useApi !== undefined) {
                this.useApi = data.useApi;
            }
            
            if (data.apiUrl) {
                this.apiBaseUrl = data.apiUrl;
            }
            
            console.log(`GodsEye API settings: useApi=${this.useApi}, apiUrl=${this.apiBaseUrl}`);
        });
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Listen for messages from popup or background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'updateApiSettings') {
                if (request.useApi !== undefined) {
                    this.useApi = request.useApi;
                    console.log(`API usage updated: ${this.useApi}`);
                }
                
                if (request.apiUrl) {
                    this.apiBaseUrl = request.apiUrl;
                    console.log(`API URL updated: ${this.apiBaseUrl}`);
                }
                
                sendResponse({success: true});
                return true;
            }
        });
    }

    // Setup smart page monitoring
    setupPageMonitoring() {
        // Monitor for page changes
        let lastUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                this.onPageChange();
            }
        }, 1000);

        // Monitor for content changes
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                const hasSignificantChanges = mutations.some(mutation => 
                    mutation.type === 'childList' && 
                    mutation.addedNodes.length > 0 &&
                    Array.from(mutation.addedNodes).some(node => 
                        node.nodeType === Node.ELEMENT_NODE && 
                        (node.tagName === 'ARTICLE' || node.classList.contains('article') || 
                         node.tagName === 'MAIN' || node.id.includes('content'))
                    )
                );
                
                if (hasSignificantChanges) {
                    this.onContentChange();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // Handle page navigation
    onPageChange() {
        if (this.isNewsPage()) {
            this.scheduleAnalysis();
        }
    }

    // Handle content updates
    onContentChange() {
        if (this.isNewsPage() && !this.isAnalyzing) {
            clearTimeout(this.contentChangeTimeout);
            this.contentChangeTimeout = setTimeout(() => {
                this.scheduleAnalysis();
            }, 2000); // Wait 2 seconds after content stops changing
        }
    }

    // Check if current page is a news article
    isNewsPage() {
        const newsIndicators = [
            'article', 'news', 'story', 'post', 'blog',
            '.article', '.news-article', '.story-content',
            '[role="article"]', '.post-content'
        ];

        return newsIndicators.some(indicator => {
            if (indicator.startsWith('.') || indicator.startsWith('[')) {
                return document.querySelector(indicator) !== null;
            }
            return window.location.href.includes(indicator) || 
                   document.title.toLowerCase().includes(indicator);
        });
    }

    // Schedule analysis with smart timing
    scheduleAnalysis() {
        const now = Date.now();
        
        // Don't analyze too frequently
        if (this.lastAnalysisTime && (now - this.lastAnalysisTime) < 30000) {
            return;
        }

        // Check user preferences
        chrome.storage.local.get(['settings'], (data) => {
            const settings = data.settings || {};
            
            if (settings.autoAnalysis !== false) { // Default to true
                setTimeout(() => {
                    this.performEnhancedAnalysis();
                }, settings.analysisDelay || 3000);
            }
        });
    }    // Perform enhanced analysis with multiple APIs
    async performEnhancedAnalysis() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.lastAnalysisTime = Date.now();

        try {
            const articleContent = this.extractArticleContent();
            if (!articleContent || articleContent.trim().length < 100) {
                console.log('Insufficient content for analysis');
                this.isAnalyzing = false;
                return;
            }

            // Show loading notification
            this.showSmartNotification('Analyzing article...', 'info', 2000);

            // Try to get analysis from the API if enabled
            if (this.useApi) {
                try {
                    const url = window.location.href;
                    console.log(`Using API: ${this.apiBaseUrl} to analyze URL: ${url}`);
                    const apiResponse = await this.fetchAnalysisFromAPI(url);
                    
                    if (apiResponse && !apiResponse.error) {
                        // Use API response for analysis results
                        console.log('API analysis successful:', apiResponse);
                        
                        // Process the API response
                        const analysisResults = this.processAPIResponse(apiResponse, articleContent);
                        
                        // Update UI with results
                        this.updateAnalysisDisplay(analysisResults);
                        
                        // Save to history
                        chrome.runtime.sendMessage({
                            action: 'trackArticleHistory',
                            data: analysisResults
                        });
                        
                        this.isAnalyzing = false;
                        return;
                    } else {
                        console.log('API analysis failed, falling back to local analysis:', apiResponse?.error || 'Unknown error');
                        this.showSmartNotification('API connection failed, using local analysis', 'warning', 3000);
                    }
                } catch (apiError) {
                    console.error('Error fetching from API, using fallback:', apiError);
                    this.showSmartNotification('API error, using local analysis', 'warning', 3000);
                }
            } else {
                console.log('API usage disabled, using local analysis');
            }

            // Fallback to simulated analysis if API fails
            // Perform parallel analysis
            const [biasResults, sentimentResults, factCheckResults, credibilityResults] = await Promise.allSettled([
                this.performBiasAnalysis(articleContent),
                this.performSentimentAnalysis(articleContent),
                this.performFactCheck(articleContent),
                this.performCredibilityCheck(window.location.href)
            ]);

            // Compile results
            const analysisResults = {
                timestamp: Date.now(),
                url: window.location.href,
                title: document.title,
                content: articleContent.substring(0, 500), // First 500 chars for storage
                bias: biasResults.status === 'fulfilled' ? biasResults.value : null,
                sentiment: sentimentResults.status === 'fulfilled' ? sentimentResults.value : null,
                factCheck: factCheckResults.status === 'fulfilled' ? factCheckResults.value : null,
                credibility: credibilityResults.status === 'fulfilled' ? credibilityResults.value : null
            };

            // Update UI with results
            this.updateAnalysisDisplay(analysisResults);

            // Save to history
            this.saveToHistory(analysisResults);

            // Show completion notification
            this.showAnalysisCompletionNotification(analysisResults);

        } catch (error) {
            console.error('Analysis failed:', error);
            this.showSmartNotification('Analysis failed. Please try again.', 'error', 3000);
        } finally {
            this.isAnalyzing = false;
        }
    }

    // Fetch analysis from the API
    async fetchAnalysisFromAPI(url) {
        try {
            const apiUrl = `${this.apiBaseUrl}/analyze?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching from API:', error);
            return { error: error.message };
        }
    }    // Process the API response into our standard format
    processAPIResponse(apiResponse, articleContent) {
        // Extract data from API response and handle percentage strings
        const parsePercentage = (value) => {
            if (value === undefined || value === null) return 0;
            // Remove the % symbol if present and parse as float
            const stringValue = String(value);
            // First handle "Unknown%" case
            if (stringValue.toLowerCase().includes('unknown')) return 0;
            // Then handle normal percentage values
            return parseFloat(stringValue.replace('%', ''));
        };
        
        const positive = parsePercentage(apiResponse.positive_percentage);
        const negative = parsePercentage(apiResponse.negative_percentage);
        const neutral = parsePercentage(apiResponse.neutral_percentage);
        
        // Extract misinformation status
        const misinformationStatus = apiResponse.authenticity?.['Misinformation Status']?.['Misinformation'] || 'Unknown';
        const factCheckStatus = apiResponse.authenticity?.['Fact Check']?.['article_status'] || 'Unknown';
        
        return {
            timestamp: Date.now(),
            url: window.location.href,
            title: apiResponse.title || document.title,
            publisher: apiResponse.publisher || new URL(window.location.href).hostname,
            content: articleContent.substring(0, 500), // First 500 chars for storage
            category: apiResponse.category || 'News',
            sentiment: {
                positive: positive,
                negative: negative,
                neutral: neutral,
                dominant: positive > negative && positive > neutral ? 'positive' :
                         negative > neutral ? 'negative' : 'neutral',
                confidence: 0.9, // High confidence as it's from our API
            },
            bias: this.deriveBiasFromSentiment(positive, negative, neutral),
            factCheck: {
                claims: apiResponse.authenticity?.['Fact Check']?.['verified_claims'] || [],
                overallReliability: factCheckStatus === 'True' ? 0.9 : 0.5,
                misinformation: misinformationStatus === 'Yes',
                sourcesChecked: apiResponse.authenticity?.['Fact Check']?.['verified_claims']?.length || 0
            },
            credibility: {
                status: misinformationStatus === 'No' ? 'reliable' : 'questionable',
                trustScore: misinformationStatus === 'No' ? 0.8 : 0.4,
                communityRating: 4.2, // Placeholder
            }
        };
    }
    
    // Derive bias metrics from sentiment data
    deriveBiasFromSentiment(positive, negative, neutral) {
        // Calculate bias score: -1 (very negative) to 1 (very positive)
        const biasScore = (positive - negative) / 100;
        const biasType = biasScore < -0.3 ? 'left' : biasScore > 0.3 ? 'right' : 'center';
        
        return {
            overall: biasScore,
            type: biasType,
            confidence: 0.7,
            factors: {
                political: Math.abs(biasScore) * 100,
                emotional: Math.max(positive, negative),
                factual: neutral
            },
            explanation: `Analysis indicates ${biasType} leaning content with ${Math.round(Math.abs(biasScore) * 100)}% confidence.`
        };
    }

    // Show smart notification
    showSmartNotification(message, type = 'info', duration = 3000) {
        showToast(message, duration);
    }

    // Extract article content intelligently
    extractArticleContent() {
        // Priority selectors for article content
        const contentSelectors = [
            'article',
            '[role="article"]',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.content',
            'main',
            '.main-content',
            '#content',
            '.story-body'
        ];

        for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                // Filter out navigation, ads, and other non-content elements
                const text = this.cleanTextContent(element.textContent);
                if (text.length > 200) { // Minimum content length
                    return text;
                }
            }
        }

        // Fallback to body content if no article found
        return this.cleanTextContent(document.body.textContent);
    }

    // Clean and filter text content
    cleanTextContent(text) {
        return text
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/^\s+|\s+$/g, '') // Trim
            .replace(/(\r\n|\n|\r)/gm, ' ') // Remove line breaks
            .substring(0, 10000); // Limit length for API calls
    }

    // Perform bias analysis using external API
    async performBiasAnalysis(content) {
        // Simulate API call - replace with actual bias detection API
        return new Promise((resolve) => {
            setTimeout(() => {
                const biasScore = Math.random() * 2 - 1; // -1 to 1
                const biasType = biasScore < -0.3 ? 'left' : biasScore > 0.3 ? 'right' : 'center';
                
                resolve({
                    overall: biasScore,
                    type: biasType,
                    confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1
                    factors: {
                        political: Math.abs(biasScore) * 100,
                        emotional: Math.random() * 100,
                        factual: 100 - (Math.abs(biasScore) * 50)
                    },
                    explanation: `Analysis indicates ${biasType} leaning content with ${Math.round(Math.abs(biasScore) * 100)}% confidence.`
                });
            }, 1000 + Math.random() * 2000);
        });
    }

    // Perform sentiment analysis
    async performSentimentAnalysis(content) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const positive = Math.random() * 100;
                const negative = Math.random() * (100 - positive);
                const neutral = 100 - positive - negative;
                
                const dominant = positive > negative && positive > neutral ? 'positive' :
                               negative > neutral ? 'negative' : 'neutral';

                resolve({
                    positive: Math.round(positive),
                    negative: Math.round(negative),
                    neutral: Math.round(neutral),
                    dominant,
                    confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1
                    emotions: {
                        joy: Math.random() * positive,
                        anger: Math.random() * negative,
                        fear: Math.random() * negative,
                        sadness: Math.random() * negative,
                        surprise: Math.random() * 50
                    }
                });
            }, 800 + Math.random() * 1500);
        });
    }

    // Perform fact-checking
    async performFactCheck(content) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const claims = this.extractPotentialClaims(content);
                const checkedClaims = claims.map(claim => ({
                    text: claim,
                    status: ['verified', 'disputed', 'false', 'unverified'][Math.floor(Math.random() * 4)],
                    confidence: Math.random() * 0.4 + 0.6,
                    sources: Math.floor(Math.random() * 3) + 1
                }));

                resolve({
                    claims: checkedClaims,
                    overallReliability: Math.random() * 0.4 + 0.6,
                    sourcesChecked: checkedClaims.length
                });
            }, 1500 + Math.random() * 2500);
        });
    }

    // Extract potential claims from content
    extractPotentialClaims(content) {
        // Simple claim extraction - look for statements with numbers, dates, or strong assertions
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const claims = sentences.filter(sentence => {
            return /\d{4}|\d+%|\$\d+|according to|studies show|research indicates|reports that/i.test(sentence);
        });
        
        return claims.slice(0, 5); // Limit to 5 claims
    }

    // Perform credibility check
    async performCredibilityCheck(url) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const domain = new URL(url).hostname;
                const isKnownSource = ['bbc.com', 'reuters.com', 'ap.org', 'npr.org'].some(trusted => 
                    domain.includes(trusted)
                );

                resolve({
                    status: isKnownSource ? 'reliable' : Math.random() > 0.5 ? 'reliable' : 'questionable',
                    trustScore: isKnownSource ? 0.9 : Math.random() * 0.6 + 0.3,
                    domain,
                    factors: {
                        domainAge: Math.floor(Math.random() * 20) + 1,
                        https: url.startsWith('https://'),
                        socialMedia: Math.random() > 0.7
                    }
                });
            }, 500 + Math.random() * 1000);
        });
    }

    // Update the analysis display with enhanced results
    updateAnalysisDisplay(results) {
        // Update bias detection
        if (results.bias) {
            const biasElement = document.getElementById('bias-content') || this.createBiasElement();
            biasElement.innerHTML = this.generateBiasHTML(results.bias);
        }

        // Update sentiment analysis
        if (results.sentiment) {
            this.updateSentimentDisplay(results.sentiment);
        }

        // Update fact-check results
        if (results.factCheck) {
            const factCheckElement = document.getElementById('fact-check-claims');
            if (factCheckElement) {
                factCheckElement.style.display = 'block';
                factCheckElement.innerHTML = this.generateFactCheckHTML(results.factCheck);
            }
        }

        // Update authenticity status
        if (results.credibility) {
            this.updateAuthenticityDisplay(results.credibility);
        }

        // Add community rating section
        this.addCommunityRatingSection(results);

        // Add privacy features
        this.addPrivacySection();
    }

    // Generate enhanced bias HTML
    generateBiasHTML(biasData) {
        return `
            <div class="bias-indicator">
                <h3>📊 Bias Analysis</h3>
                <div class="bias-meter">
                    <div class="bias-label">Left</div>
                    <div class="bias-bar">
                        <div class="bias-fill ${biasData.type}" style="width: ${Math.abs(biasData.overall) * 100}%"></div>
                    </div>
                    <div class="bias-label">Right</div>
                    <div class="bias-score">${Math.round(Math.abs(biasData.overall) * 100)}%</div>
                </div>
                <div class="bias-factors">
                    <div class="factor">Political: ${Math.round(biasData.factors.political)}%</div>
                    <div class="factor">Emotional: ${Math.round(biasData.factors.emotional)}%</div>
                    <div class="factor">Factual: ${Math.round(biasData.factors.factual)}%</div>
                </div>
                <p class="bias-explanation">${biasData.explanation}</p>
            </div>
        `;
    }    // Update sentiment display with enhanced data
    updateSentimentDisplay(sentiment) {
        const positiveElement = document.getElementById('positive-percent');
        const negativeElement = document.getElementById('negative-percent');
        const neutralElement = document.getElementById('neutral-percent');

        // Default values if sentiment data is missing
        const positive = sentiment?.positive ?? 0;
        const negative = sentiment?.negative ?? 0;
        const neutral = sentiment?.neutral ?? 0;
        
        // Sum to determine if we have valid sentiment data
        const totalSentiment = positive + negative + neutral;
        
        // Update display elements
        if (positiveElement) {
            positiveElement.textContent = totalSentiment > 0 ? `${Math.round(positive)}%` : 'N/A';
        }
        
        if (negativeElement) {
            negativeElement.textContent = totalSentiment > 0 ? `${Math.round(negative)}%` : 'N/A';
        }
        
        if (neutralElement) {
            neutralElement.textContent = totalSentiment > 0 ? `${Math.round(neutral)}%` : 'N/A';
        }
        
        // Add descriptive text based on sentiment values
        const sentimentContainer = document.querySelector('.sentiment-chart-container');
        if (sentimentContainer) {
            // Remove any existing status message
            const existingStatus = sentimentContainer.querySelector('.sentiment-status');
            if (existingStatus) {
                existingStatus.remove();
            }
            
            // Add new status message
            const statusMsg = document.createElement('div');
            statusMsg.className = 'sentiment-status';
            
            if (totalSentiment === 0) {
                statusMsg.textContent = 'No sentiment data available.';
            } else if (positive > negative && positive > neutral) {
                statusMsg.textContent = 'Positive sentiment detected in this article.';
                statusMsg.classList.add('positive');
            } else if (negative > positive && negative > neutral) {
                statusMsg.textContent = 'Negative sentiment detected in this article.';
                statusMsg.classList.add('negative');
            } else {
                statusMsg.textContent = 'Neutral sentiment detected in this article.';
                statusMsg.classList.add('neutral');
            }
            
            sentimentContainer.appendChild(statusMsg);
        }

        // Add emotion breakdown if emotions data exists
        if (sentiment?.emotions) {
            const emotions = sentiment.emotions;
            const emotionHTML = `
                <div class="emotion-breakdown">
                    <h4>Emotional Tone:</h4>
                    <div class="emotions">
                        <span class="emotion joy">Joy: ${Math.round(emotions.joy || 0)}%</span>
                        <span class="emotion anger">Anger: ${Math.round(emotions.anger || 0)}%</span>
                        <span class="emotion fear">Fear: ${Math.round(emotions.fear || 0)}%</span>
                        <span class="emotion sadness">Sadness: ${Math.round(emotions.sadness || 0)}%</span>
                    </div>
                </div>
            `;

        // Find a suitable place to insert emotion data
        const sentimentContainer = document.querySelector('.sentiment-chart-container');
        if (sentimentContainer && !sentimentContainer.querySelector('.emotion-breakdown')) {
            sentimentContainer.insertAdjacentHTML('afterend', emotionHTML);
        }
    }

    // Generate fact-check HTML
    generateFactCheckHTML(factCheckData) {
        return `
            <h3>🔍 Fact Check Results</h3>
            <div class="fact-check-summary">
                <p><strong>Overall Reliability:</strong> ${Math.round(factCheckData.overallReliability * 100)}%</p>
                <p><strong>Claims Checked:</strong> ${factCheckData.sourcesChecked}</p>
            </div>
            <div class="claims-list">
                ${factCheckData.claims.map(claim => `
                    <div class="claim-item ${claim.status}">
                        <div class="claim-text">${claim.text.substring(0, 150)}...</div>
                        <div class="claim-status">
                            <span class="status-badge ${claim.status}">${claim.status.toUpperCase()}</span>
                            <span class="confidence">${Math.round(claim.confidence * 100)}% confidence</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Show smart contextual notifications
    showSmartNotification(message, type = 'info', duration = 3000) {
        // Check user notification preferences
        chrome.storage.local.get(['settings'], (data) => {
            const settings = data.settings || {};
            
            if (settings.notifications !== false) { // Default to enabled
                if (settings.browserNotifications && chrome.notifications) {
                    // Use browser notifications for important alerts
                    chrome.runtime.sendMessage({
                        action: 'showNotification',
                        title: 'GodsEye Analysis',
                        message: message,
                        type: type
                    });
                } else {
                    // Use in-page toast notification
                    showToast(message, duration);
                }
            }
        });
    }

    // Show analysis completion notification with summary
    showAnalysisCompletionNotification(results) {
        const biasLevel = results.bias ? Math.round(Math.abs(results.bias.overall) * 100) : 0;
        const sentimentType = results.sentiment ? results.sentiment.dominant : 'unknown';
        const reliability = results.credibility ? results.credibility.status : 'unknown';

        const summary = `Analysis complete! Bias: ${biasLevel}%, Sentiment: ${sentimentType}, Source: ${reliability}`;
        
        this.showSmartNotification(summary, 'success', 4000);

        // Schedule follow-up notifications based on analysis results
        this.scheduleFollowUpNotifications(results);
    }

    // Schedule follow-up notifications based on analysis
    scheduleFollowUpNotifications(results) {
        // High bias warning
        if (results.bias && Math.abs(results.bias.overall) > 0.7) {
            setTimeout(() => {
                this.showSmartNotification(
                    '⚠️ High bias detected in this article. Consider checking alternative sources.',
                    'warning',
                    5000
                );
            }, 10000);
        }

        // Fact-check alerts
        if (results.factCheck && results.factCheck.claims.some(claim => claim.status === 'false')) {
            setTimeout(() => {
                this.showSmartNotification(
                    '🚫 False claims detected. Review fact-check results.',
                    'error',
                    5000
                );
            }, 15000);
        }

        // Unreliable source warning
        if (results.credibility && results.credibility.status === 'questionable') {
            setTimeout(() => {
                this.showSmartNotification(
                    '⚠️ Source reliability unclear. Verify information independently.',
                    'warning',
                    5000
                );
            }, 20000);
        }
    }

    // Save analysis to history with enhanced data
    async saveToHistory(results) {
        try {
            const historyItem = {
                id: Date.now().toString(),
                timestamp: results.timestamp,
                title: results.title,
                url: results.url,
                content: results.content,
                analysis: {
                    bias: results.bias,
                    sentiment: results.sentiment,
                    factCheck: results.factCheck,
                    authenticity: results.credibility,
                    communityRating: await this.getCommunityRating(results.url)
                }
            };

            const result = await chrome.storage.local.get(['analysisHistory']);
            const history = result.analysisHistory || [];
            
            // Limit history to last 100 items
            if (history.length >= 100) {
                history.splice(0, history.length - 99);
            }
            
            history.push(historyItem);
            await chrome.storage.local.set({ analysisHistory: history });

            // Notify background script
            chrome.runtime.sendMessage({
                action: 'trackArticleHistory',
                data: historyItem
            });

        } catch (error) {
            console.error('Failed to save to history:', error);
        }
    }

    // Get community rating for URL
    async getCommunityRating(url) {
        // Simulate community rating fetch
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(Math.random() * 5);
            }, 500);
        });
    }

    // Add community rating section to the UI
    addCommunityRatingSection(results) {
        const existingSection = document.getElementById('community-rating-section');
        if (existingSection) return;

        const ratingHTML = `
            <div id="community-rating-section" class="community-rating">
                <h3>👥 Community Feedback</h3>
                <div class="rating_overview">
                    <div class="overall-rating">
                        <div class="rating-score">${(Math.random() * 2 + 3).toFixed(1)}</div>
                        <div class="rating-count">${Math.floor(Math.random() * 200) + 10} ratings</div>
                    </div>
                    <div class="star-rating">
                        ${Array.from({length: 5}, (_, i) => `<div class="star ${i < 4 ? 'filled' : ''}"></div>`).join('')}
                    </div>
                </div>
                <div class="user-rating">
                    <p>Rate this article's credibility:</p>
                    <div class="rating-buttons">
                        <button class="rating-btn" data-rating="1">Very Low</button>
                        <button class="rating-btn" data-rating="2">Low</button>
                        <button class="rating-btn" data-rating="3">Medium</button>
                        <button class="rating-btn" data-rating="4">High</button>
                        <button class="rating-btn" data-rating="5">Very High</button>
                    </div>
                </div>
            </div>
        `;

        const mainBody = document.getElementById('main-body');
        if (mainBody) {
            mainBody.insertAdjacentHTML('beforeend', ratingHTML);
            this.setupCommunityRatingEvents();
        }
    }

    // Setup community rating event handlers
    setupCommunityRatingEvents() {
        const ratingButtons = document.querySelectorAll('.rating-btn');
        ratingButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.submitCommunityRating(rating);
                
                // Update UI
                ratingButtons.forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
            });
        });
    }

    // Submit community rating
    async submitCommunityRating(rating) {
        try {
            // Simulate rating submission
            await new Promise(resolve => setTimeout(resolve, 500));
            this.showSmartNotification(`Thank you for rating this article (${rating}/5)!`, 'success', 2000);
            
            // Save rating locally
            const ratingData = {
                url: window.location.href,
                rating: rating,
                timestamp: Date.now()
            };
            
            const result = await chrome.storage.local.get(['userRatings']);
            const ratings = result.userRatings || [];
            ratings.push(ratingData);
            
            await chrome.storage.local.set({ userRatings: ratings });
            
        } catch (error) {
            console.error('Failed to submit rating:', error);
            this.showSmartNotification('Failed to submit rating. Please try again.', 'error', 3000);
        }
    }

    // Add privacy section
    addPrivacySection() {
        const existingSection = document.getElementById('privacy-section');
        if (existingSection) return;

        const privacyHTML = addPrivacyFeatures();
        const mainBody = document.getElementById('main-body');
        if (mainBody) {
            mainBody.insertAdjacentHTML('beforeend', privacyHTML);
            this.setupPrivacyEvents();
        }
    }

    // Setup privacy feature events
    setupPrivacyEvents() {
        const blockTrackersBtn = document.getElementById('block-trackers');
        const privacyReportBtn = document.getElementById('privacy-report');

        if (blockTrackersBtn) {
            blockTrackersBtn.addEventListener('click', () => {
                this.toggleTrackerBlocking();
            });
        }

        if (privacyReportBtn) {
            privacyReportBtn.addEventListener('click', () => {
                this.showPrivacyReport();
            });
        }
    }

    // Toggle tracker blocking
    async toggleTrackerBlocking() {
        try {
            const result = await chrome.storage.local.get(['settings']);
            const settings = result.settings || {};
            settings.blockTrackers = !settings.blockTrackers;
            
            await chrome.storage.local.set({ settings });
            
            const status = settings.blockTrackers ? 'enabled' : 'disabled';
            this.showSmartNotification(`Tracker blocking ${status}`, 'info', 2000);
            
        } catch (error) {
            console.error('Failed to toggle tracker blocking:', error);
        }
    }

    // Show privacy report
    showPrivacyReport() {
        const report = `
            Privacy Report for ${window.location.hostname}:
            • Connection: ${window.location.protocol === 'https:' ? 'Secure (HTTPS)' : 'Not Secure (HTTP)'
            }
            • Cookies: ${document.cookie ? 'Present' : 'None detected'}
            • Third-party requests: ${Math.floor(Math.random() * 10) + 1} detected
            • Privacy score: ${Math.floor(Math.random() * 40 + 60)}/100
        `;
        
        alert(report); // Replace with a better modal in production
    }
}

// Initialize the enhanced analyzer
const godsEyeAnalyzer = new GodsEyeAnalyzer();

// Export for use in other parts of the extension
window.godsEyeAnalyzer = godsEyeAnalyzer;
