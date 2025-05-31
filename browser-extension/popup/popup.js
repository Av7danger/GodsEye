document.addEventListener('DOMContentLoaded', function() {
  // Initialize settings
  initializeSettings();
  
  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const contentId = tab.id.replace('tab-', '') + '-content';
      document.getElementById(contentId).classList.add('active');
      
      // Load content based on selected tab
      if (tab.id === 'tab-bookmarks') {
        loadBookmarks();
      } else if (tab.id === 'tab-history') {
        loadHistory();
      }
    });
  });
    // Search functionality for bookmarks
  const searchBookmarksInput = document.getElementById('search-bookmarks');
  searchBookmarksInput.addEventListener('input', () => {
    const searchTerm = searchBookmarksInput.value.toLowerCase();
    filterItems('bookmarks', searchTerm);
  });
  
  // Search functionality for history
  const searchHistoryInput = document.getElementById('search-history');
  searchHistoryInput.addEventListener('input', () => {
    const searchTerm = searchHistoryInput.value.toLowerCase();
    filterItems('history', searchTerm);
  });
  
  // Clear history button
  const clearHistoryBtn = document.getElementById('clear-history');
  clearHistoryBtn.addEventListener('click', clearHistory);
  
  // Reset settings button
  const resetSettingsBtn = document.getElementById('reset-settings');
  resetSettingsBtn.addEventListener('click', resetSettings);
  
  // Settings toggles
  setupSettingsToggle('dark-mode-toggle', 'darkMode', toggleDarkMode);
  setupSettingsToggle('notification-toggle', 'notifications');
  setupSettingsToggle('auto-analyze-toggle', 'autoAnalyze');
  
  // Export and data management functionality
  document.getElementById('export-history').addEventListener('click', exportHistory);
  document.getElementById('export-bookmarks').addEventListener('click', exportBookmarks);
  document.getElementById('import-data').addEventListener('change', importData);
  
  // Advanced settings button
  document.getElementById('advanced-settings').addEventListener('click', openAdvancedSettings);
  
  // Privacy protection toggles
  setupSettingsToggle('tracker-blocking-toggle', 'blockTrackers');
  setupSettingsToggle('privacy-mode-toggle', 'privacyMode');
  setupSettingsToggle('browser-notification-toggle', 'browserNotifications');
  
  // Initialize by loading appropriate content for active tab
  const activeTab = document.querySelector('.tab-btn.active');
  if (activeTab) {
    if (activeTab.id === 'tab-bookmarks') {
      loadBookmarks();
    } else if (activeTab.id === 'tab-history') {
      loadHistory();
    }
  }
  
  // Initialize API settings
  initializeAPISettings();
});

// Initialize settings from storage
function initializeSettings() {
  chrome.storage.local.get('settings', function(data) {
    const settings = data.settings || {
      darkMode: false,
      notifications: true,
      autoAnalyze: false
    };
    
    // Apply settings
    if (settings.darkMode) {
      document.body.classList.add('dark-mode');
      document.getElementById('dark-mode-toggle').checked = true;
    }
    
    document.getElementById('notification-toggle').checked = settings.notifications;
    document.getElementById('auto-analyze-toggle').checked = settings.autoAnalyze;
    
    // Save default settings if they don't exist
    if (!data.settings) {
      chrome.storage.local.set({settings});
    }
  });
}

// Setup a settings toggle with storage sync
function setupSettingsToggle(toggleId, settingKey, callback) {
  const toggle = document.getElementById(toggleId);
  toggle.addEventListener('change', function() {
    // Update storage
    chrome.storage.local.get('settings', function(data) {
      const settings = data.settings || {};
      settings[settingKey] = toggle.checked;
      chrome.storage.local.set({settings});
      
      // Execute callback if provided
      if (callback) {
        callback(toggle.checked);
      }
    });
  });
}

// Toggle dark mode
function toggleDarkMode(enabled) {
  if (enabled) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// Reset settings to defaults
function resetSettings() {
  const defaultSettings = {
    darkMode: false,
    notifications: true,
    autoAnalyze: false
  };
  
  chrome.storage.local.set({settings: defaultSettings}, function() {
    // Update UI
    document.getElementById('dark-mode-toggle').checked = false;
    document.getElementById('notification-toggle').checked = true;
    document.getElementById('auto-analyze-toggle').checked = false;
    
    // Remove dark mode
    document.body.classList.remove('dark-mode');
    
    // Show confirmation
    showNotification('Settings reset to defaults');
  });
}

// Load bookmarks from storage
function loadBookmarks() {
  const bookmarksList = document.getElementById('bookmarks-list');
  
  chrome.storage.local.get('savedArticles', function(data) {
    const savedArticles = data.savedArticles || [];
    
    // Clear previous bookmarks
    while (bookmarksList.firstChild) {
      bookmarksList.removeChild(bookmarksList.firstChild);
    }
    
    if (savedArticles.length === 0) {
      // Show empty state
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.textContent = 'No bookmarked articles yet';
      bookmarksList.appendChild(emptyDiv);
    } else {
      // Sort bookmarks by date (newest first)
      savedArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Create bookmark items
      savedArticles.forEach((article, index) => {
        const bookmarkItem = createBookmarkItem(article, index);
        bookmarksList.appendChild(bookmarkItem);
      });
    }
  });
}

// Create a bookmark item element
function createBookmarkItem(article, index) {
  const div = document.createElement('div');
  div.className = 'bookmark-item';
  div.dataset.index = index;
  
  // Format date
  const date = new Date(article.date);
  const formattedDate = date.toLocaleDateString() + ' ' + 
    date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  // Get sentiment percentages
  const positivePercent = article.analysisData.positivePercent || '0%';
  const negativePercent = article.analysisData.negativePercent || '0%';
  
  div.innerHTML = `
    <div class="bookmark-title">${article.title}</div>
    <div class="bookmark-date">Saved on ${formattedDate}</div>
    <div class="bookmark-stats">
      <span style="color: green">Positive: ${positivePercent}</span>
      <span style="color: red">Negative: ${negativePercent}</span>
    </div>
    <div class="bookmark-actions">
      <button class="bookmark-btn open-btn">Open Article</button>
      <button class="bookmark-btn delete-btn">Delete</button>
    </div>
  `;
  
  // Add event listeners
  div.querySelector('.open-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: article.url });
  });
  
  div.querySelector('.delete-btn').addEventListener('click', () => {
    deleteBookmark(index);
  });
  
  return div;
}

// Delete a bookmark
function deleteBookmark(index) {
  chrome.storage.local.get('savedArticles', function(data) {
    const savedArticles = data.savedArticles || [];
    savedArticles.splice(index, 1);
    
    chrome.storage.local.set({savedArticles}, function() {
      loadBookmarks(); // Reload bookmarks after deletion
    });
  });
}

// Filter bookmarks based on search term
function filterBookmarks(searchTerm) {
  const bookmarkItems = document.querySelectorAll('.bookmark-item');
  
  bookmarkItems.forEach(item => {
    const title = item.querySelector('.bookmark-title').textContent.toLowerCase();
    if (title.includes(searchTerm)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
  
  // Check if any results are visible
  let anyVisible = false;
  bookmarkItems.forEach(item => {
    if (item.style.display !== 'none') {
      anyVisible = true;
    }
  });
  
  // Show no results message if needed
  const bookmarksList = document.getElementById('bookmarks-list');
  let noResults = bookmarksList.querySelector('.no-results');
  
  if (!anyVisible && searchTerm && bookmarkItems.length > 0) {
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.className = 'empty-state no-results';
      noResults.textContent = 'No results found';
      bookmarksList.appendChild(noResults);
    }
  } else if (noResults) {
    bookmarksList.removeChild(noResults);
  }
}

// Load history from storage
function loadHistory() {
  const historyList = document.getElementById('history-list');
  
  chrome.storage.local.get('articleHistory', function(data) {
    const articleHistory = data.articleHistory || [];
    
    // Clear previous history
    while (historyList.firstChild) {
      historyList.removeChild(historyList.firstChild);
    }
    
    if (articleHistory.length === 0) {
      // Show empty state
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.textContent = 'No articles in history yet';
      historyList.appendChild(emptyDiv);
    } else {
      // Sort history by date (newest first)
      articleHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Create history items
      articleHistory.forEach((article, index) => {
        const historyItem = createHistoryItem(article, index);
        historyList.appendChild(historyItem);
      });
    }
  });
}

// Create a history item element
function createHistoryItem(article, index) {
  const div = document.createElement('div');
  div.className = 'history-item';
  div.dataset.index = index;
  
  // Format date
  const date = new Date(article.date);
  const formattedDate = date.toLocaleDateString() + ' ' + 
    date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  div.innerHTML = `
    <div class="history-title">${article.title}</div>
    <div class="history-date">Viewed on ${formattedDate}</div>
    <div class="history-actions">
      <button class="history-btn open-btn">Open Article</button>
      <button class="history-btn bookmark-btn">Bookmark</button>
    </div>
  `;
  
  // Add event listeners
  div.querySelector('.open-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: article.url });
  });
  
  div.querySelector('.bookmark-btn').addEventListener('click', () => {
    saveToBookmarks(article);
  });
  
  return div;
}

// Clear history
function clearHistory() {
  if (confirm('Are you sure you want to clear your article history?')) {
    chrome.storage.local.set({articleHistory: []}, function() {
      loadHistory(); // Reload history
      showNotification('History cleared');
    });
  }
}

// Save an article from history to bookmarks
function saveToBookmarks(article) {
  chrome.storage.local.get('savedArticles', function(data) {
    let savedArticles = data.savedArticles || [];
    
    // Check if already bookmarked
    const existingIndex = savedArticles.findIndex(a => a.url === article.url);
    
    if (existingIndex >= 0) {
      showNotification('Article already bookmarked');
    } else {
      // Add to bookmarks
      savedArticles.push(article);
      chrome.storage.local.set({savedArticles}, function() {
        showNotification('Article saved to bookmarks');
      });
    }
  });
}

// Filter items based on search term
function filterItems(type, searchTerm) {
  const items = document.querySelectorAll(`.${type}-item`);
  const list = document.getElementById(`${type}-list`);
  
  let anyVisible = false;
  
  items.forEach(item => {
    const title = item.querySelector(`.${type}-title`).textContent.toLowerCase();
    if (title.includes(searchTerm)) {
      item.style.display = 'block';
      anyVisible = true;
    } else {
      item.style.display = 'none';
    }
  });
  
  // Show no results message if needed
  let noResults = list.querySelector('.no-results');
  
  if (!anyVisible && searchTerm && items.length > 0) {
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.className = 'empty-state no-results';
      noResults.textContent = 'No results found';
      list.appendChild(noResults);
    }
  } else if (noResults) {
    list.removeChild(noResults);
  }
}

// Show a notification message
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.left = '50%';
  notification.style.transform = 'translateX(-50%)';
  notification.style.backgroundColor = '#333';
  notification.style.color = 'white';
  notification.style.padding = '10px 15px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '1000';
  notification.style.opacity = '0';
  notification.style.transition = 'opacity 0.3s';
  
  // Add to body
  document.body.appendChild(notification);
  
  // Add visible class after a short delay (for animation)
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Function to export history data
function exportHistory() {
  chrome.storage.local.get(['analysisHistory'], function(result) {
    const history = result.analysisHistory || [];
    
    if (history.length === 0) {
      showNotification('No history data to export', 'error');
      return;
    }
    
    const exportData = {
      type: 'GodsEye_History',
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      data: history
    };
    
    downloadJSON(exportData, `godseye-history-${formatDate(new Date())}.json`);
    showNotification('History exported successfully!', 'success');
  });
}

// Function to export bookmarks data
function exportBookmarks() {
  chrome.storage.local.get(['bookmarks'], function(result) {
    const bookmarks = result.bookmarks || [];
    
    if (bookmarks.length === 0) {
      showNotification('No bookmarks to export', 'error');
      return;
    }
    
    const exportData = {
      type: 'GodsEye_Bookmarks',
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      data: bookmarks
    };
    
    downloadJSON(exportData, `godseye-bookmarks-${formatDate(new Date())}.json`);
    showNotification('Bookmarks exported successfully!', 'success');
  });
}

// Function to download JSON data as a file
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  // Clean up
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

// Function to format date for filenames
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Function to import data from JSON file
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      // Validate imported data
      if (!importedData.type || !importedData.data || !Array.isArray(importedData.data)) {
        showNotification('Invalid import file format', 'error');
        return;
      }
      
      if (importedData.type === 'GodsEye_History') {
        importHistory(importedData.data);
      } else if (importedData.type === 'GodsEye_Bookmarks') {
        importBookmarks(importedData.data);
      } else if (importedData.type === 'GodsEye_Settings') {
        importSettings(importedData.data);
      } else {
        showNotification('Unknown import data type', 'error');
      }
      
    } catch (error) {
      console.error('Import error:', error);
      showNotification('Failed to import data', 'error');
    }
    
    // Reset file input
    event.target.value = '';
  };
  
  reader.readAsText(file);
}

// Function to import history data
function importHistory(importData) {
  chrome.storage.local.get(['analysisHistory'], function(result) {
    const currentHistory = result.analysisHistory || [];
    
    // Merge data, avoid duplicates based on URL and timestamp
    const merged = [...currentHistory];
    
    importData.forEach(item => {
      if (!merged.some(existing => 
        existing.url === item.url && 
        existing.timestamp === item.timestamp)) {
        merged.push(item);
      }
    });
    
    // Sort by timestamp (newest first)
    merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Save merged data
    chrome.storage.local.set({ analysisHistory: merged }, function() {
      showNotification(`Imported ${importData.length} history items`, 'success');
      loadHistory(); // Refresh history display
    });
  });
}

// Function to import bookmarks data
function importBookmarks(importData) {
  chrome.storage.local.get(['bookmarks'], function(result) {
    const currentBookmarks = result.bookmarks || [];
    
    // Merge data, avoid duplicates based on URL
    const merged = [...currentBookmarks];
    
    importData.forEach(item => {
      if (!merged.some(existing => existing.url === item.url)) {
        merged.push(item);
      }
    });
    
    // Save merged data
    chrome.storage.local.set({ bookmarks: merged }, function() {
      showNotification(`Imported ${importData.length} bookmarks`, 'success');
      loadBookmarks(); // Refresh bookmarks display
    });
  });
}

// Function to import settings
function importSettings(settings) {
  chrome.storage.local.set({ settings: settings }, function() {
    showNotification('Settings imported successfully', 'success');
    // Apply imported settings
    initializeSettings();
  });
}

// Function to open advanced settings page
function openAdvancedSettings() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('advanced-settings.html')
  });
}

// API testing functionality
function initializeAPISettings() {
  // Get elements
  const useApiToggle = document.getElementById('use-api-toggle');
  const apiUrlInput = document.getElementById('api-url');
  const testApiButton = document.getElementById('test-api');
  const apiStatus = document.getElementById('api-status');
  
  // Load saved settings
  chrome.storage.local.get(['useApi', 'apiUrl'], (data) => {
    if (data.useApi !== undefined) {
      useApiToggle.checked = data.useApi;
    }
    
    if (data.apiUrl) {
      apiUrlInput.value = data.apiUrl;
    }
  });
  
  // Save API settings when changed
  useApiToggle.addEventListener('change', () => {
    chrome.storage.local.set({ useApi: useApiToggle.checked });
    
    // Notify content scripts about the change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateApiSettings',
          useApi: useApiToggle.checked
        }).catch(() => {
          // Ignore errors for tabs that don't have our content script
        });
      });
    });
  });
  
  // Save API URL when changed
  apiUrlInput.addEventListener('change', () => {
    chrome.storage.local.set({ apiUrl: apiUrlInput.value });
    
    // Notify content scripts about the change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateApiSettings',
          apiUrl: apiUrlInput.value
        }).catch(() => {
          // Ignore errors for tabs that don't have our content script
        });
      });
    });
  });
  
  // Test API connection
  testApiButton.addEventListener('click', async () => {
    const apiUrl = apiUrlInput.value;
    
    // Display loading state
    apiStatus.innerHTML = `
      <div class="loading-spinner"></div>
      Testing connection...
    `;
    apiStatus.className = 'api-status loading';
    
    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}`);
      
      if (response.ok) {
        const data = await response.json();
        apiStatus.textContent = `✓ Connected: ${data.message || 'API is running'}`;
        apiStatus.className = 'api-status success';
      } else {
        apiStatus.textContent = `✗ Error: Server returned ${response.status}`;
        apiStatus.className = 'api-status error';
      }
    } catch (error) {
      apiStatus.textContent = `✗ Connection failed: ${error.message}`;
      apiStatus.className = 'api-status error';
    }
  });
}