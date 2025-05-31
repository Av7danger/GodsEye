// History page functionality
class HistoryManager {
    constructor() {
        this.historyData = [];
        this.filteredData = [];
        this.init();
    }

    async init() {
        await this.loadHistory();
        this.setupEventListeners();
        this.updateStats();
        this.renderHistory();
        this.checkDarkMode();
    }

    async loadHistory() {
        try {
            const result = await chrome.storage.local.get(['analysisHistory']);
            this.historyData = result.analysisHistory || [];
            this.filteredData = [...this.historyData];
        } catch (error) {
            console.error('Failed to load history:', error);
            this.historyData = [];
            this.filteredData = [];
        }
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filterHistory();
        });

        // Filter functionality
        document.getElementById('filter-select').addEventListener('change', (e) => {
            this.filterHistory();
        });

        // Export functionality
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        // Clear history functionality
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearHistory();
        });

        // Listen for storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.analysisHistory) {
                this.loadHistory().then(() => {
                    this.updateStats();
                    this.renderHistory();
                });
            }
        });
    }

    filterHistory() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const filterType = document.getElementById('filter-select').value;

        this.filteredData = this.historyData.filter(item => {
            // Search filter
            const matchesSearch = !searchTerm || 
                item.title.toLowerCase().includes(searchTerm) ||
                item.url.toLowerCase().includes(searchTerm) ||
                (item.content && item.content.toLowerCase().includes(searchTerm));

            if (!matchesSearch) return false;

            // Type filter
            switch (filterType) {
                case 'all':
                    return true;
                case 'reliable':
                    return item.analysis?.authenticity?.status === 'reliable';
                case 'unreliable':
                    return item.analysis?.authenticity?.status === 'unreliable';
                case 'positive':
                    return item.analysis?.sentiment?.dominant === 'positive';
                case 'negative':
                    return item.analysis?.sentiment?.dominant === 'negative';
                case 'neutral':
                    return item.analysis?.sentiment?.dominant === 'neutral';
                case 'recent':
                    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                    return new Date(item.timestamp) > weekAgo;
                case 'month':
                    const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                    return new Date(item.timestamp) > monthAgo;
                default:
                    return true;
            }
        });

        this.renderHistory();
    }

    updateStats() {
        const totalArticles = this.historyData.length;
        document.getElementById('total-articles').textContent = totalArticles;

        if (totalArticles === 0) {
            document.getElementById('avg-sentiment').textContent = '0%';
            document.getElementById('reliable-sources').textContent = '0%';
            document.getElementById('recent-analyses').textContent = '0';
            return;
        }

        // Calculate average positive sentiment
        const sentimentData = this.historyData
            .filter(item => item.analysis?.sentiment?.positive)
            .map(item => item.analysis.sentiment.positive);
        
        const avgSentiment = sentimentData.length > 0 
            ? Math.round(sentimentData.reduce((a, b) => a + b, 0) / sentimentData.length)
            : 0;
        document.getElementById('avg-sentiment').textContent = `${avgSentiment}%`;

        // Calculate reliable sources percentage
        const reliableCount = this.historyData
            .filter(item => item.analysis?.authenticity?.status === 'reliable').length;
        const reliablePercentage = Math.round((reliableCount / totalArticles) * 100);
        document.getElementById('reliable-sources').textContent = `${reliablePercentage}%`;

        // Calculate recent analyses (last 7 days)
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentCount = this.historyData
            .filter(item => new Date(item.timestamp) > weekAgo).length;
        document.getElementById('recent-analyses').textContent = recentCount;
    }

    renderHistory() {
        const grid = document.getElementById('history-grid');
        
        if (this.filteredData.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No articles found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                </div>
            `;
            return;
        }

        // Sort by timestamp (newest first)
        const sortedData = [...this.filteredData].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        grid.innerHTML = sortedData.map(item => this.createHistoryItemHTML(item)).join('');

        // Add event listeners for item actions
        grid.addEventListener('click', (e) => {
            if (e.target.classList.contains('visit-btn')) {
                const url = e.target.dataset.url;
                chrome.tabs.create({ url });
            } else if (e.target.classList.contains('delete-btn')) {
                const itemId = e.target.dataset.id;
                this.deleteHistoryItem(itemId);
            } else if (e.target.classList.contains('bookmark-btn')) {
                const itemId = e.target.dataset.id;
                this.bookmarkItem(itemId);
            }
        });
    }

    createHistoryItemHTML(item) {
        const date = new Date(item.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const analysis = item.analysis || {};
        const sentiment = analysis.sentiment || {};
        const bias = analysis.bias || {};
        const authenticity = analysis.authenticity || {};

        // Determine sentiment class
        const sentimentClass = sentiment.dominant === 'negative' ? 'sentiment-negative' :
                              sentiment.dominant === 'neutral' ? 'sentiment-neutral' : '';

        // Determine bias class
        const biasClass = bias.overall < -0.3 ? 'bias-left' :
                         bias.overall > 0.3 ? 'bias-right' : '';

        return `
            <div class="history-item" data-id="${item.id}">
                <div class="item-header">
                    <h3 class="item-title">${this.escapeHtml(item.title)}</h3>
                    <div class="item-date">${date}</div>
                </div>
                <a href="${item.url}" class="item-url" target="_blank">${this.truncateUrl(item.url)}</a>
                
                <div class="analysis-summary">
                    <div class="metric">
                        <div class="metric-value ${sentimentClass}">
                            ${sentiment.positive ? Math.round(sentiment.positive) : 0}%
                        </div>
                        <div class="metric-label">Positive</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value ${biasClass}">
                            ${bias.overall ? Math.round(Math.abs(bias.overall) * 100) : 0}%
                        </div>
                        <div class="metric-label">Bias</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value ${authenticity.status === 'reliable' ? '' : 'sentiment-negative'}">
                            ${authenticity.status === 'reliable' ? '✓' : '⚠'}
                        </div>
                        <div class="metric-label">Authenticity</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">
                            ${analysis.communityRating ? Math.round(analysis.communityRating * 10) / 10 : 'N/A'}
                        </div>
                        <div class="metric-label">Rating</div>
                    </div>
                </div>

                <div class="item-actions">
                    <button class="action-btn-small visit-btn" data-url="${item.url}">Visit</button>
                    <button class="action-btn-small bookmark-btn" data-id="${item.id}">Bookmark</button>
                    <button class="action-btn-small danger delete-btn" data-id="${item.id}">Delete</button>
                </div>
            </div>
        `;
    }

    async deleteHistoryItem(itemId) {
        if (!confirm('Are you sure you want to delete this item from your history?')) {
            return;
        }

        try {
            this.historyData = this.historyData.filter(item => item.id !== itemId);
            await chrome.storage.local.set({ analysisHistory: this.historyData });
            
            this.filterHistory();
            this.updateStats();
        } catch (error) {
            console.error('Failed to delete history item:', error);
            alert('Failed to delete item. Please try again.');
        }
    }

    async bookmarkItem(itemId) {
        try {
            const item = this.historyData.find(h => h.id === itemId);
            if (!item) return;

            const result = await chrome.storage.local.get(['bookmarks']);
            const bookmarks = result.bookmarks || [];
            
            // Check if already bookmarked
            if (bookmarks.some(b => b.url === item.url)) {
                alert('This article is already bookmarked.');
                return;
            }

            const bookmark = {
                id: Date.now().toString(),
                title: item.title,
                url: item.url,
                timestamp: Date.now(),
                analysis: item.analysis
            };

            bookmarks.push(bookmark);
            await chrome.storage.local.set({ bookmarks });
            
            alert('Article bookmarked successfully!');
        } catch (error) {
            console.error('Failed to bookmark item:', error);
            alert('Failed to bookmark article. Please try again.');
        }
    }

    async clearHistory() {
        if (!confirm('Are you sure you want to clear all analysis history? This action cannot be undone.')) {
            return;
        }

        try {
            await chrome.storage.local.set({ analysisHistory: [] });
            this.historyData = [];
            this.filteredData = [];
            this.updateStats();
            this.renderHistory();
        } catch (error) {
            console.error('Failed to clear history:', error);
            alert('Failed to clear history. Please try again.');
        }
    }

    exportData() {
        try {
            const exportData = {
                exportDate: new Date().toISOString(),
                totalItems: this.historyData.length,
                data: this.historyData.map(item => ({
                    title: item.title,
                    url: item.url,
                    timestamp: item.timestamp,
                    date: new Date(item.timestamp).toISOString(),
                    analysis: item.analysis
                }))
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `godseye-analysis-history-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Failed to export data:', error);
            alert('Failed to export data. Please try again.');
        }
    }

    checkDarkMode() {
        chrome.storage.sync.get(['darkMode'], (result) => {
            if (result.darkMode) {
                document.body.classList.add('dark-mode');
            }
        });

        // Listen for dark mode changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes.darkMode) {
                if (changes.darkMode.newValue) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncateUrl(url, maxLength = 50) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HistoryManager();
});
