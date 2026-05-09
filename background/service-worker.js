// Universal Product Board background service worker.
importScripts('../shared/constants.js', '../shared/storage.js');

class BackgroundService {
  constructor() {
    this.storage = UniversalProductBoard.storageManager;
    this.MESSAGE_TYPES = UniversalProductBoard.MESSAGE_TYPES;
    this.AFFILIATE_MAPPINGS = UniversalProductBoard.AFFILIATE_MAPPINGS;
    this.DEFAULT_SETTINGS = UniversalProductBoard.DEFAULT_SETTINGS;
    this.init();
  }

  init() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender)
        .then((response) => sendResponse({ success: true, ...response }))
        .catch((error) => {
          console.error('Background message handling error:', error);
          sendResponse({ success: false, error: error.message });
        });

      return true;
    });

    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details).catch((error) => {
        console.error('Installation handler failed:', error);
      });
    });

    console.log('Universal Product Board background service initialized');
  }

  async handleMessage(message) {
    switch (message?.type) {
      case this.MESSAGE_TYPES.SCRAPE_PRODUCT:
        return this.handleScrapeProduct();

      case this.MESSAGE_TYPES.SCRAPE_TAB:
        return this.handleScrapeTab(message.tabId);

      case this.MESSAGE_TYPES.SAVE_PRODUCT:
        return this.handleSaveProduct(message.productData);

      default:
        console.warn('Unknown background message type received:', message?.type, message);
        throw new Error(`Unknown message type: ${message?.type || 'missing'}`);
    }
  }

  async handleScrapeProduct() {
    const activeTab = await this.getActiveTab();
    const processed = await this.scrapeTab(activeTab, 'popup');

    return {
      data: processed
    };
  }

  async handleScrapeTab(tabId) {
    if (!tabId && tabId !== 0) {
      throw new Error('No tab was provided for side panel scanning.');
    }

    const tab = await chrome.tabs.get(tabId);
    const processed = await this.scrapeTab(tab, 'sidebar');

    return {
      data: processed
    };
  }

  async handleSaveProduct(productData) {
    if (!productData?.originalUrl) {
      throw new Error('Product data is missing the source URL');
    }

    const normalizedProduct = this.normalizeStoredProduct(productData);
    if (!normalizedProduct.originalUrl) {
      throw new Error('Only products with a valid http or https source URL can be saved.');
    }

    const result = await this.storage.saveProduct(normalizedProduct);

    if (result.created) {
      await this.showSaveNotification(normalizedProduct.name);
    }

    return {
      data: result
    };
  }

  async getActiveTab() {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tabs.length) {
      throw new Error('No active tab found');
    }

    return tabs[0];
  }

  async scrapeTab(tab, source) {
    if (!this.isSupportedUrl(tab?.url)) {
      throw new Error('This page type cannot be scanned. Try an http or https product page.');
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          'shared/constants.js',
          'shared/scraper.js',
          'content/content-script.js'
        ]
      });
    } catch (error) {
      throw new Error(this.getScriptInjectionErrorMessage(error, tab.url, source));
    }

    const response = await this.sendMessageToTab(tab.id, {
      type: this.MESSAGE_TYPES.SCRAPE_PRODUCT
    });

    return this.processScrapeResult(response, tab.url);
  }

  sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response?.success) {
          reject(new Error(response?.error || 'No response from content script'));
          return;
        }

        resolve(response.data);
      });
    });
  }

  processScrapeResult(scrapeResult, url) {
    const product = this.normalizeStoredProduct({
      ...scrapeResult.product,
      originalUrl: url,
      affiliateUrl: this.generateAffiliateUrl(url),
      scrapedAt: Date.now()
    });

    return {
      product,
      meta: scrapeResult.meta
    };
  }

  normalizeStoredProduct(product) {
    const originalUrl = this.storage.sanitizeProductUrl(product.originalUrl);
    const affiliateUrl = this.storage.sanitizeProductUrl(product.affiliateUrl) || originalUrl;

    return {
      name: this.storage.normalizeProductName(product.name),
      price: this.storage.normalizeProductPrice(product.price),
      currency: this.storage.normalizeCurrency(product.currency),
      imageUrl: this.storage.normalizeImageUrl(product.imageUrl),
      originalUrl,
      affiliateUrl,
      website: this.storage.normalizeWebsite(product.website, originalUrl),
      scrapedAt: product.scrapedAt || Date.now()
    };
  }

  generateAffiliateUrl(originalUrl) {
    try {
      const url = new URL(originalUrl);

      for (const config of Object.values(this.AFFILIATE_MAPPINGS)) {
        if (!config.affiliateId || !config.pattern.test(originalUrl)) {
          continue;
        }

        url.searchParams.set(config.param, config.affiliateId);
        return url.toString();
      }

      return originalUrl;
    } catch (error) {
      console.warn('Affiliate URL generation error:', error);
      return originalUrl;
    }
  }

  extractWebsiteName(url) {
    try {
      return new URL(url).hostname.replace(/^www\./i, '');
    } catch (error) {
      return 'unknown';
    }
  }

  isSupportedUrl(url) {
    return /^https?:\/\//i.test(url || '');
  }

  async showSaveNotification(productName) {
    try {
      const settings = await this.storage.getSettings();
      if (settings.showNotifications === false) {
        return;
      }

      const notificationsGranted = await chrome.permissions.contains({
        permissions: ['notifications']
      });
      if (!notificationsGranted) {
        return;
      }

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon128.png'),
        title: 'Product Saved',
        message: `"${productName}" was added to your board.`
      });
    } catch (error) {
      console.warn('Failed to show notification:', error);
    }
  }

  async handleInstallation(details) {
    if (details.reason !== 'install') {
      return;
    }

    await this.storage.updateSettings(this.DEFAULT_SETTINGS);
  }

  getScriptInjectionErrorMessage(error, url, source = 'popup') {
    const rawMessage = error?.message || '';

    if (/Cannot access a chrome:\/\/|Cannot access contents of url|The extensions gallery cannot be scripted/i.test(rawMessage)) {
      return 'This page is restricted by Chrome. Open a regular shopping page and try again.';
    }

    if (/Missing host permission for the tab/i.test(rawMessage)) {
      if (source === 'sidebar') {
        return 'Enable Live Save to let the side panel follow the active shopping tab after you grant optional website access.';
      }

      return 'Chrome did not grant page access. Reopen the popup from the page you want to scan and try again.';
    }

    if (/Frame with ID 0 is showing error page|No tab with id/i.test(rawMessage)) {
      return 'The current tab is unavailable. Reload the page and try again.';
    }

    console.warn('Unexpected script injection failure while scanning', { url, rawMessage, source });
    return 'Could not read this page. Reload it and try again.';
  }
}

new BackgroundService();
