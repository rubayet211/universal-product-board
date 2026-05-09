// Shared storage utilities for Universal Product Board.
(function initSharedStorage(global) {
  const namespace = global.UniversalProductBoard || {};
  const STORAGE_KEYS = namespace.STORAGE_KEYS;
  const DEFAULT_SETTINGS = namespace.DEFAULT_SETTINGS;
  const DONATION = namespace.DONATION;

  if (!STORAGE_KEYS || !DEFAULT_SETTINGS || !DONATION) {
    throw new Error('UniversalProductBoard constants must load before storage');
  }

  class StorageManager {
    constructor() {
      this.storage = chrome.storage.local;
    }

    async set(key, value) {
      await this.storage.set({ [key]: value });
      return true;
    }

    async get(key, defaultValue = null) {
      const result = await this.storage.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    }

    async remove(key) {
      await this.storage.remove(key);
      return true;
    }

    normalizeSettings(settings) {
      const validThemes = new Set(['system', 'light', 'dark']);
      const requestedTheme = typeof settings?.theme === 'string'
        ? settings.theme
        : DEFAULT_SETTINGS.theme;

      return {
        ...DEFAULT_SETTINGS,
        showNotifications: settings?.showNotifications === true,
        showDonationReminders: settings?.showDonationReminders !== false,
        showLivePreview: settings?.showLivePreview !== false,
        showPopupDisclosure: settings?.showPopupDisclosure !== false,
        theme: validThemes.has(requestedTheme) ? requestedTheme : DEFAULT_SETTINGS.theme
      };
    }

    normalizeDonationState(state) {
      return {
        lastDonationPromptAt: Number.isFinite(state?.lastDonationPromptAt)
          ? state.lastDonationPromptAt
          : 0,
        lastDonationVisitAt: Number.isFinite(state?.lastDonationVisitAt)
          ? state.lastDonationVisitAt
          : 0
      };
    }

    async getSettings() {
      const stored = await this.get(STORAGE_KEYS.SETTINGS, {});
      return this.normalizeSettings(stored);
    }

    async updateSettings(newSettings) {
      const currentSettings = await this.getSettings();
      const merged = this.normalizeSettings({
        ...currentSettings,
        ...newSettings
      });
      await this.set(STORAGE_KEYS.SETTINGS, merged);
      return merged;
    }

    async getProducts() {
      const products = await this.get(STORAGE_KEYS.PRODUCTS, []);
      if (!Array.isArray(products)) {
        return [];
      }

      return products
        .map((product) => this.normalizeStoredBoardProduct(product))
        .filter(Boolean);
    }

    async getDonationState() {
      const stored = await this.get(STORAGE_KEYS.DONATION_STATE, {});
      return this.normalizeDonationState(stored);
    }

    async updateDonationState(nextState) {
      const currentState = await this.getDonationState();
      const merged = this.normalizeDonationState({
        ...currentState,
        ...nextState
      });
      await this.set(STORAGE_KEYS.DONATION_STATE, merged);
      return merged;
    }

    async isDonationReminderDue() {
      const settings = await this.getSettings();
      if (!settings.showDonationReminders) {
        return false;
      }

      const donationState = await this.getDonationState();
      const lastTouchAt = Math.max(
        donationState.lastDonationPromptAt || 0,
        donationState.lastDonationVisitAt || 0
      );

      return Date.now() - lastTouchAt >= DONATION.reminderIntervalMs;
    }

    async dismissDonationReminder() {
      return this.updateDonationState({
        lastDonationPromptAt: Date.now()
      });
    }

    async recordDonationVisit() {
      const now = Date.now();
      return this.updateDonationState({
        lastDonationPromptAt: now,
        lastDonationVisitAt: now
      });
    }

    async getProductByUrl(url) {
      const safeUrl = this.sanitizeProductUrl(url);
      if (!safeUrl) {
        return null;
      }

      const products = await this.getProducts();
      return products.find((product) => product.originalUrl === safeUrl) || null;
    }

    async saveProduct(product) {
      const normalizedInput = this.normalizeStoredBoardProduct(product);
      if (!normalizedInput?.originalUrl) {
        throw new Error('A product with an originalUrl is required');
      }

      const now = Date.now();
      const products = await this.getProducts();
      const existingIndex = products.findIndex(
        (item) => item.originalUrl === normalizedInput.originalUrl
      );

      let savedProduct;
      let created = false;

      if (existingIndex >= 0) {
        savedProduct = {
          ...products[existingIndex],
          ...normalizedInput,
          id: products[existingIndex].id,
          dateSaved: products[existingIndex].dateSaved,
          dateUpdated: now
        };
        products[existingIndex] = savedProduct;
      } else {
        created = true;
        savedProduct = {
          ...normalizedInput,
          id: normalizedInput.id || this.generateProductId(),
          dateSaved: now,
          dateUpdated: now
        };
        products.push(savedProduct);
      }

      await this.set(STORAGE_KEYS.PRODUCTS, products);

      return {
        created,
        updated: !created,
        product: savedProduct
      };
    }

    async deleteProduct(productId) {
      const products = await this.getProducts();
      const filteredProducts = products.filter((product) => product.id !== productId);
      const deleted = filteredProducts.length !== products.length;
      await this.set(STORAGE_KEYS.PRODUCTS, filteredProducts);
      return deleted;
    }

    async clearProducts() {
      await this.set(STORAGE_KEYS.PRODUCTS, []);
      return true;
    }

    async clearAllData() {
      await this.storage.clear();
      await this.updateSettings(DEFAULT_SETTINGS);
      return true;
    }

    async exportData() {
      return {
        products: await this.getProducts(),
        settings: await this.getSettings(),
        exportDate: new Date().toISOString(),
        version: '1.3.0'
      };
    }

    async importData(data) {
      if (!data || typeof data !== 'object') {
        throw new Error('Import data must be an object');
      }

      const importedProducts = Array.isArray(data.products) ? data.products : [];
      const settings = this.normalizeSettings(data.settings || {});
      const productsByUrl = new Map();
      let productsSkipped = 0;

      importedProducts.forEach((product) => {
        const normalizedProduct = this.normalizeStoredBoardProduct(product);
        if (!normalizedProduct) {
          productsSkipped += 1;
          return;
        }

        productsByUrl.set(normalizedProduct.originalUrl, {
          ...normalizedProduct,
          id: normalizedProduct.id || this.generateProductId(),
          dateSaved: normalizedProduct.dateSaved || Date.now(),
          dateUpdated: normalizedProduct.dateUpdated || normalizedProduct.dateSaved || Date.now()
        });
      });

      const products = Array.from(productsByUrl.values());

      if (!products.length && importedProducts.length) {
        throw new Error('The import file did not contain any valid http or https product URLs.');
      }

      await this.set(STORAGE_KEYS.PRODUCTS, products);
      await this.set(STORAGE_KEYS.SETTINGS, settings);
      await this.remove(STORAGE_KEYS.DONATION_STATE);

      return {
        productsImported: products.length,
        productsSkipped,
        settings
      };
    }

    addChangeListener(callback) {
      chrome.storage.onChanged.addListener((changes, namespaceName) => {
        if (namespaceName === 'local') {
          callback(changes);
        }
      });
    }

    generateProductId() {
      return `product_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    sanitizeProductUrl(url) {
      if (!url) {
        return null;
      }

      try {
        const parsed = new URL(String(url).trim());
        if (!/^https?:$/i.test(parsed.protocol)) {
          return null;
        }

        return parsed.toString();
      } catch (error) {
        return null;
      }
    }

    normalizeImageUrl(url) {
      if (!url) {
        return null;
      }

      const value = String(url).trim();
      if (!value) {
        return null;
      }

      if (value.startsWith('data:')) {
        return value;
      }

      if (value.startsWith('//')) {
        return `https:${value}`;
      }

      if (value.startsWith('http://')) {
        return value.replace(/^http:\/\//i, 'https://');
      }

      try {
        const parsed = new URL(value);
        if (!/^https?:$/i.test(parsed.protocol)) {
          return null;
        }

        return parsed.protocol === 'http:' ? value.replace(/^http:\/\//i, 'https://') : parsed.toString();
      } catch (error) {
        return null;
      }
    }

    normalizeProductName(name) {
      if (!name) {
        return 'Unknown Product';
      }

      return String(name).replace(/\s+/g, ' ').trim().slice(0, 200) || 'Unknown Product';
    }

    normalizeProductPrice(price) {
      if (price === null || price === undefined || price === '') {
        return null;
      }

      const numeric = Number.parseFloat(String(price).replace(/\s+/g, ' ').trim());
      return Number.isNaN(numeric) ? null : numeric.toString();
    }

    normalizeCurrency(currency) {
      const candidate = String(currency || 'USD').trim().toUpperCase();
      return /^[A-Z]{3}$/.test(candidate) ? candidate : 'USD';
    }

    normalizeTimestamp(timestamp) {
      if (!Number.isFinite(timestamp)) {
        return 0;
      }

      return Math.max(0, Math.floor(timestamp));
    }

    normalizeWebsite(website, originalUrl) {
      const cleanedWebsite = String(website || '').replace(/\s+/g, ' ').trim();
      if (cleanedWebsite) {
        return cleanedWebsite.slice(0, 120);
      }

      try {
        return new URL(originalUrl).hostname.replace(/^www\./i, '');
      } catch (error) {
        return 'unknown';
      }
    }

    normalizeStoredBoardProduct(product) {
      if (!product || typeof product !== 'object') {
        return null;
      }

      const originalUrl = this.sanitizeProductUrl(product.originalUrl);
      if (!originalUrl) {
        return null;
      }

      return {
        id: typeof product.id === 'string' && product.id ? product.id : null,
        name: this.normalizeProductName(product.name),
        price: this.normalizeProductPrice(product.price),
        currency: this.normalizeCurrency(product.currency),
        imageUrl: this.normalizeImageUrl(product.imageUrl),
        originalUrl,
        affiliateUrl: this.sanitizeProductUrl(product.affiliateUrl) || originalUrl,
        website: this.normalizeWebsite(product.website, originalUrl),
        dateSaved: this.normalizeTimestamp(product.dateSaved),
        dateUpdated: this.normalizeTimestamp(product.dateUpdated)
      };
    }
  }

  namespace.storageManager = namespace.storageManager || new StorageManager();
  namespace.StorageManager = StorageManager;
  global.UniversalProductBoard = namespace;
})(typeof globalThis !== 'undefined' ? globalThis : self);
