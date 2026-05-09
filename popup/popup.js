// Universal Product Board popup logic.
class PopupController {
  constructor() {
    this.storage = UniversalProductBoard.storageManager;
    this.messageTypes = UniversalProductBoard.MESSAGE_TYPES;
    this.donation = UniversalProductBoard.DONATION;
    this.elements = this.getElements();
    this.currentTab = null;
    this.scrapeResult = null;
    this.existingProduct = null;
    this.init();
  }

  getElements() {
    return {
      saveButton: document.getElementById('save-button'),
      saveButtonLabel: document.getElementById('save-button-label'),
      sidebarToggle: document.getElementById('sidebar-toggle'),
      statusDot: document.getElementById('status-dot'),
      statusText: document.getElementById('status-text'),
      productPreview: document.getElementById('product-preview'),
      previewImage: document.getElementById('preview-image'),
      previewTitle: document.getElementById('preview-title'),
      previewPrice: document.getElementById('preview-price'),
      previewWebsite: document.getElementById('preview-website'),
      previewNote: document.getElementById('preview-note'),
      popupDisclosure: document.getElementById('popup-disclosure'),
      message: document.getElementById('message'),
      messageText: document.getElementById('message-text'),
      donationReminder: document.getElementById('donation-reminder'),
      donationDonateButton: document.getElementById('donation-donate-button'),
      donationDismissButton: document.getElementById('donation-dismiss-button'),
      donateLink: document.getElementById('donate-link'),
      productCount: document.getElementById('product-count'),
      viewAllLink: document.getElementById('view-all-link'),
      settingsLink: document.getElementById('settings-link')
    };
  }

  async init() {
    this.setupEventListeners();
    await this.applySettings();
    await this.loadProductCount();
    await this.updateDonationReminder();

    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    this.currentTab = tabs[0] || null;

    if (!this.currentTab) {
      this.showUnsupportedState('No active tab found.');
      return;
    }

    if (!this.isSupportedUrl(this.currentTab.url)) {
      this.showUnsupportedState('This page type cannot be scanned. Open a regular product page first.');
      return;
    }

    await this.previewProduct();
  }

  setupEventListeners() {
    this.elements.saveButton.addEventListener('click', () => {
      this.handleSaveProduct();
    });

    this.elements.sidebarToggle.addEventListener('click', () => {
      this.handleSidebarToggle();
    });

    this.elements.viewAllLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.handleSidebarToggle();
    });

    this.elements.settingsLink.addEventListener('click', (event) => {
      event.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    this.elements.donationDonateButton.addEventListener('click', () => {
      this.handleDonateClick();
    });

    this.elements.donationDismissButton.addEventListener('click', () => {
      this.handleDonationDismiss();
    });

    this.elements.donateLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.handleDonateClick();
    });
  }

  async loadProductCount() {
    try {
      const products = await this.storage.getProducts();
      this.updateProductCount(products.length);
    } catch (error) {
      console.error('Failed to load product count:', error);
      this.updateProductCount(0);
    }
  }

  async applySettings() {
    try {
      const settings = await this.storage.getSettings();
      this.elements.popupDisclosure.hidden = !settings.showPopupDisclosure;
    } catch (error) {
      console.error('Failed to load popup settings:', error);
      this.elements.popupDisclosure.hidden = false;
    }
  }

  async previewProduct() {
    this.setLoading(true);
    this.setStatus('loading', 'Scanning page');
    this.hideMessage();

    try {
      const response = await this.sendRuntimeMessage({
        type: this.messageTypes.SCRAPE_PRODUCT
      });

      this.scrapeResult = response.data;
      this.existingProduct = await this.storage.getProductByUrl(
        this.scrapeResult.product.originalUrl
      );

      this.showProductPreview(this.scrapeResult);
      this.updateSaveButtonText();

      if (this.scrapeResult.meta.confidence === 'high') {
        this.setStatus('success', 'Ready to save');
      } else if (this.scrapeResult.meta.confidence === 'medium') {
        this.setStatus('warning', 'Review details');
      } else {
        this.setStatus('warning', 'Limited data found');
        this.showMessage(
          'Only limited product data was detected. You can still save this item.',
          'warning'
        );
      }
    } catch (error) {
      console.error('Product preview failed:', error);
      this.showUnsupportedState(
        this.getUserFacingPreviewError(error)
      );
    } finally {
      this.setLoading(false);
    }
  }

  async handleSaveProduct() {
    if (!this.scrapeResult?.product) {
      await this.previewProduct();
      return;
    }

    this.setLoading(true);
    this.setStatus('loading', 'Saving product');
    this.hideMessage();

    try {
      const response = await this.sendRuntimeMessage({
        type: this.messageTypes.SAVE_PRODUCT,
        productData: this.scrapeResult.product
      });

      const result = response.data;
      this.existingProduct = result.product;
      this.updateSaveButtonText();
      await this.loadProductCount();

      this.setStatus('success', result.created ? 'Saved' : 'Updated');
      this.showMessage(
        result.created
          ? 'Product saved to your board.'
          : 'Saved product updated with the latest details.',
        'success'
      );
    } catch (error) {
      console.error('Save failed:', error);
      this.setStatus('error', 'Save failed');
      this.showMessage(
        error.message || 'Failed to save this product.',
        'error'
      );
    } finally {
      this.setLoading(false);
    }
  }

  handleSidebarToggle() {
    if (!this.currentTab?.windowId) {
      return;
    }

    chrome.sidePanel.open({ windowId: this.currentTab.windowId }).catch((error) => {
      console.error('Side panel open failed:', error);
      this.showMessage('Could not open the board right now.', 'error');
    });
  }

  showProductPreview(scrapeResult) {
    const { product, meta } = scrapeResult;

    this.elements.previewTitle.textContent = product.name || 'Unknown Product';
    this.elements.previewPrice.textContent = this.formatPrice(
      product.price,
      product.currency
    );
    this.elements.previewWebsite.textContent = product.website || 'Unknown site';
    this.elements.previewNote.textContent = this.buildPreviewNote(meta);

    if (product.imageUrl) {
      this.elements.previewImage.src = product.imageUrl;
      this.elements.previewImage.alt = product.name || 'Product preview';
      this.elements.previewImage.style.display = 'block';
    } else {
      this.elements.previewImage.removeAttribute('src');
      this.elements.previewImage.alt = 'No product image available';
      this.elements.previewImage.style.display = 'none';
    }

    this.elements.productPreview.style.display = 'block';
    this.elements.saveButton.disabled = false;
  }

  showUnsupportedState(message) {
    this.scrapeResult = null;
    this.existingProduct = null;
    this.elements.productPreview.style.display = 'none';
    this.elements.saveButton.disabled = true;
    this.setStatus('error', 'Unavailable');
    this.showMessage(message, 'warning');
  }

  getUserFacingPreviewError(error) {
    const message = error?.message || '';

    if (/restricted by Chrome/i.test(message)) {
      return message;
    }

    if (/grant page access|Missing host permission/i.test(message)) {
      return 'Chrome did not grant temporary page access. Close the popup, reopen it from the page you want to scan, and try again.';
    }

    if (/cannot be scanned|regular product page/i.test(message)) {
      return message;
    }

    return 'Could not extract product information from this page.';
  }

  buildPreviewNote(meta) {
    if (this.existingProduct) {
      return 'Already on your board. Saving again will refresh the saved details.';
    }

    if (meta.confidence === 'high') {
      return `Strong match from ${meta.strategy}.`;
    }

    if (meta.confidence === 'medium') {
      return `Partial product data found via ${meta.strategy}.`;
    }

    return 'Fallback product details were detected. Review before saving.';
  }

  updateSaveButtonText() {
    this.elements.saveButtonLabel.textContent = this.existingProduct
      ? 'Update Saved Product'
      : 'Save to Board';
  }

  formatPrice(price, currency) {
    if (!price) {
      return 'Price not available';
    }

    const numericPrice = Number.parseFloat(price);
    if (Number.isNaN(numericPrice)) {
      return price;
    }

    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'USD'
      }).format(numericPrice);
    } catch (error) {
      return `$${numericPrice.toFixed(2)}`;
    }
  }

  showMessage(text, type = 'info') {
    this.elements.messageText.textContent = text;
    this.elements.message.className = `message ${type}`;
    this.elements.message.style.display = 'flex';
  }

  hideMessage() {
    this.elements.message.style.display = 'none';
  }

  async updateDonationReminder() {
    try {
      const isDue = await this.storage.isDonationReminderDue();
      this.elements.donationReminder.hidden = !isDue;
    } catch (error) {
      console.error('Failed to update donation reminder:', error);
      this.elements.donationReminder.hidden = true;
    }
  }

  async handleDonateClick() {
    try {
      await this.storage.recordDonationVisit();
      this.elements.donationReminder.hidden = true;
      await chrome.tabs.create({
        url: this.donation.url
      });
    } catch (error) {
      console.error('Failed to open donation link:', error);
      this.showMessage('Could not open the donation link right now.', 'error');
    }
  }

  async handleDonationDismiss() {
    try {
      await this.storage.dismissDonationReminder();
      this.elements.donationReminder.hidden = true;
    } catch (error) {
      console.error('Failed to dismiss donation reminder:', error);
      this.showMessage('Could not update the donation reminder right now.', 'error');
    }
  }

  setStatus(type, text) {
    this.elements.statusText.textContent = text;

    const dot = this.elements.statusDot;
    dot.className = 'status-dot';

    switch (type) {
      case 'success':
        dot.style.backgroundColor = 'var(--success-color)';
        break;
      case 'warning':
      case 'loading':
        dot.style.backgroundColor = 'var(--warning-color)';
        if (type === 'loading') {
          dot.classList.add('loading');
        }
        break;
      case 'error':
        dot.style.backgroundColor = 'var(--error-color)';
        break;
      default:
        dot.style.backgroundColor = 'var(--secondary-color)';
    }
  }

  setLoading(loading) {
    const container = document.getElementById('popup-container');
    container.classList.toggle('loading', loading);
    this.elements.saveButton.disabled = loading || !this.scrapeResult?.product;
  }

  updateProductCount(count) {
    this.elements.productCount.textContent =
      `${count} product${count === 1 ? '' : 's'} saved`;
  }

  isSupportedUrl(url) {
    return /^https?:\/\//i.test(url || '');
  }

  sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response?.success) {
          reject(new Error(response?.error || 'Request failed'));
          return;
        }

        resolve(response);
      });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.popupController = new PopupController();
  });
} else {
  window.popupController = new PopupController();
}
