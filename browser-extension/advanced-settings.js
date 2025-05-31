// Advanced settings functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all sliders with their corresponding value displays
    initializeSliders();
    
    // Load saved settings
    loadAdvancedSettings();
    
    // Set up event listeners
    document.getElementById('save-advanced-settings').addEventListener('click', saveAdvancedSettings);
    document.getElementById('cancel').addEventListener('click', () => window.close());
    document.getElementById('delete-all-data').addEventListener('click', confirmDeleteAllData);
    document.getElementById('reset-extension').addEventListener('click', confirmResetExtension);
    
    // Apply dark mode if enabled
    checkDarkMode();
});

// Initialize range sliders to update their displayed values
function initializeSliders() {
    const sliders = document.querySelectorAll('input[type="range"]');
    
    sliders.forEach(slider => {
        const valueDisplay = document.getElementById(`${slider.id}-value`);
        
        // Set initial value
        updateSliderValue(slider, valueDisplay);
        
        // Update when slider changes
        slider.addEventListener('input', () => {
            updateSliderValue(slider, valueDisplay);
        });
    });
}

// Update slider value display
function updateSliderValue(slider, valueDisplay) {
    if (!valueDisplay) return;
    
    let displayValue = slider.value;
    
    // Add percentage sign for some sliders
    if (['analysis-confidence', 'bias-threshold', 'font-size'].includes(slider.id)) {
        displayValue += '%';
    }
    
    valueDisplay.textContent = displayValue;
}

// Load settings from storage
function loadAdvancedSettings() {
    chrome.storage.local.get(['advancedSettings', 'settings'], (data) => {
        const advancedSettings = data.advancedSettings || {};
        const settings = data.settings || {};
        
        // Analysis settings
        if (advancedSettings.analysisDelay) {
            document.getElementById('analysis-delay').value = advancedSettings.analysisDelay;
        }
        
        if (advancedSettings.analysisThreshold) {
            document.getElementById('analysis-threshold').value = advancedSettings.analysisThreshold;
        }
        
        if (advancedSettings.analysisConfidence) {
            document.getElementById('analysis-confidence').value = advancedSettings.analysisConfidence;
        }
        
        if (advancedSettings.analysisApi) {
            document.getElementById('analysis-api').value = advancedSettings.analysisApi;
        }
        
        // Privacy settings
        if (advancedSettings.trackerList) {
            document.getElementById('tracker-list').value = advancedSettings.trackerList;
        }
        
        if (advancedSettings.dataCollection) {
            document.getElementById('data-collection').value = advancedSettings.dataCollection;
        }
        
        if (advancedSettings.historyRetention) {
            document.getElementById('history-retention').value = advancedSettings.historyRetention;
        }
        
        // Notification settings
        if (advancedSettings.notificationFrequency) {
            document.getElementById('notification-frequency').value = advancedSettings.notificationFrequency;
        }
        
        if (advancedSettings.biasThreshold) {
            document.getElementById('bias-threshold').value = advancedSettings.biasThreshold;
        }
        
        // Display settings
        if (advancedSettings.fontSize) {
            document.getElementById('font-size').value = advancedSettings.fontSize;
        }
        
        if (advancedSettings.animationSpeed) {
            document.getElementById('animation-speed').value = advancedSettings.animationSpeed;
        }
        
        if (advancedSettings.panelPosition) {
            document.getElementById('panel-position').value = advancedSettings.panelPosition;
        }
        
        // Update all slider displays
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            const valueDisplay = document.getElementById(`${slider.id}-value`);
            updateSliderValue(slider, valueDisplay);
        });
    });
}

// Save settings to storage
function saveAdvancedSettings() {
    const advancedSettings = {
        // Analysis settings
        analysisDelay: parseInt(document.getElementById('analysis-delay').value),
        analysisThreshold: parseInt(document.getElementById('analysis-threshold').value),
        analysisConfidence: parseInt(document.getElementById('analysis-confidence').value),
        analysisApi: document.getElementById('analysis-api').value,
        
        // Privacy settings
        trackerList: document.getElementById('tracker-list').value,
        dataCollection: document.getElementById('data-collection').value,
        historyRetention: document.getElementById('history-retention').value,
        
        // Notification settings
        notificationFrequency: document.getElementById('notification-frequency').value,
        biasThreshold: parseInt(document.getElementById('bias-threshold').value),
        
        // Display settings
        fontSize: parseInt(document.getElementById('font-size').value),
        animationSpeed: document.getElementById('animation-speed').value,
        panelPosition: document.getElementById('panel-position').value
    };
    
    chrome.storage.local.set({ advancedSettings }, () => {
        // Show save confirmation
        showStatus('Settings saved successfully!');
        
        // Close window after a delay
        setTimeout(() => {
            window.close();
        }, 1500);
    });
}

// Confirm data deletion
function confirmDeleteAllData() {
    if (confirm('Are you sure you want to delete all your data? This includes all analysis history, bookmarks, and settings. This action cannot be undone!')) {
        deleteAllData();
    }
}

// Delete all extension data
function deleteAllData() {
    chrome.storage.local.clear(() => {
        showStatus('All data deleted. Extension will now reset.');
        
        setTimeout(() => {
            window.close();
            // Reload any open extension pages
            chrome.runtime.reload();
        }, 2000);
    });
}

// Confirm extension reset
function confirmResetExtension() {
    if (confirm('Are you sure you want to reset the extension to default settings? Your history and bookmarks will be preserved.')) {
        resetExtension();
    }
}

// Reset extension to default settings
function resetExtension() {
    // Get current data for preservation
    chrome.storage.local.get(['analysisHistory', 'bookmarks'], (data) => {
        // Clear all storage
        chrome.storage.local.clear(() => {
            // Restore only history and bookmarks
            const dataToRestore = {};
            if (data.analysisHistory) {
                dataToRestore.analysisHistory = data.analysisHistory;
            }
            if (data.bookmarks) {
                dataToRestore.bookmarks = data.bookmarks;
            }
            
            // Set default settings
            dataToRestore.settings = {
                darkMode: false,
                notifications: true,
                browserNotifications: true,
                autoAnalysis: true,
                blockTrackers: false
            };
            
            chrome.storage.local.set(dataToRestore, () => {
                showStatus('Extension reset to default settings.');
                
                setTimeout(() => {
                    window.close();
                }, 1500);
            });
        });
    });
}

// Display status message
function showStatus(message) {
    // Check if status element exists, create if not
    let statusElement = document.getElementById('status-message');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'status-message';
        statusElement.style.position = 'fixed';
        statusElement.style.bottom = '20px';
        statusElement.style.left = '0';
        statusElement.style.right = '0';
        statusElement.style.backgroundColor = '#4CAF50';
        statusElement.style.color = 'white';
        statusElement.style.padding = '10px';
        statusElement.style.textAlign = 'center';
        statusElement.style.zIndex = '1000';
        document.body.appendChild(statusElement);
    }
    
    // Show message
    statusElement.textContent = message;
    statusElement.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

// Check if dark mode is enabled
function checkDarkMode() {
    chrome.storage.local.get(['settings'], (data) => {
        if (data.settings && data.settings.darkMode) {
            document.body.classList.add('dark-mode');
        }
    });
}
