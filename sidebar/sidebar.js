// Universal Product Board sidebar logic.
class SidebarController {
  constructor() {
    this.storage = UniversalProductBoard.storageManager;
    this.storageKeys = UniversalProductBoard.STORAGE_KEYS;
    this.messageTypes = UniversalProductBoard.MESSAGE_TYPES;
    this.donation = UniversalProductBoard.DONATION;
    this.products = [];
    this.filteredProducts = [];
    this.currentView = 'grid';
    this.currentSort = 'newest';
    this.searchQuery = '';
    this.currentPageResult = null;
    this.currentPageExistingProduct = null;
    this.currentTabId = null;
    this.currentWindowId = null;
    this.hasLiveAccess = false;
    this.showLivePreview = true;
    this.isScanningCurrentPage = false;
    this.contextMenuTarget = null;
    this.toastTimeout = null;
    this.fallbackImage =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="18" fill="#e2e8f0"/><path d="M40 42h40v36H40z" fill="#94a3b8"/><circle cx="50" cy="52" r="6" fill="#e2e8f0"/><path d="M44 72l10-10 8 8 10-12 12 14H44z" fill="#cbd5e1"/></svg>'
      );
    this.elements = this.getElements();
    this.init();
  }

  getElements() {
    return {
      refreshButton: document.getElementById('refresh-button'),
      sortButton: document.getElementById('sort-button'),
      sortMenu: document.getElementById('sort-menu'),
      closeButton: document.getElementById('close-button'),
      searchInput: document.getElementById('search-input'),
      clearSearch: document.getElementById('clear-search'),
      currentPageSection: document.getElementById('current-page-section'),
      currentPageStatus: document.getElementById('current-page-status'),
      currentPageEmpty: document.getElementById('current-page-empty'),
      currentPageLoading: document.getElementById('current-page-loading'),
      currentPagePreview: document.getElementById('current-page-preview'),
      currentPageError: document.getElementById('current-page-error'),
      currentPageErrorText: document.getElementById('current-page-error-text'),
      currentPreviewImage: document.getElementById('current-preview-image'),
      currentPreviewTitle: document.getElementById('current-preview-title'),
      currentPreviewPrice: document.getElementById('current-preview-price'),
      currentPreviewSite: document.getElementById('current-preview-site'),
      currentPreviewNote: document.getElementById('current-preview-note'),
      enableLiveSave: document.getElementById('enable-live-save'),
      currentSaveButton: document.getElementById('current-save-button'),
      currentRefreshButton: document.getElementById('current-refresh-button'),
      currentPageRetry: document.getElementById('current-page-retry'),
      donationReminder: document.getElementById('donation-reminder'),
      sidebarDonateButton: document.getElementById('sidebar-donate-button'),
      sidebarDismissDonation: document.getElementById('sidebar-dismiss-donation'),
      sidebarDonateLink: document.getElementById('sidebar-donate-link'),
      compactSaveCurrent: document.getElementById('compact-save-current'),
      productsCount: document.getElementById('products-count'),
      gridView: document.getElementById('grid-view'),
      listView: document.getElementById('list-view'),
      productsContainer: document.getElementById('products-container'),
      emptyState: document.getElementById('empty-state'),
      emptyHeading: document.querySelector('#empty-state h3'),
      emptyCopy: document.querySelector('#empty-state p'),
      loadingState: document.getElementById('loading-state'),
      contextMenu: document.getElementById('context-menu'),
      toast: document.getElementById('toast')
    };
  }

  async init() {
    this.setupEventListeners();
    this.storage.addChangeListener((changes) => {
      this.handleStorageChange(changes);
    });
    await this.loadSettings();
    await this.syncLiveAccessState();
    await this.loadProducts();
    await this.updateDonationReminder();
    if (this.showLivePreview) {
      await this.refreshCurrentPage();
    }
    console.log('Sidebar initialized');
  }

  setupEventListeners() {
    this.elements.refreshButton.addEventListener('click', () => {
      this.loadProducts();
    });

    this.elements.sortButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleSortMenu();
    });

    this.elements.closeButton.addEventListener('click', () => {
      window.close();
    });

    this.elements.searchInput.addEventListener('input', (event) => {
      this.searchQuery = event.target.value.trim().toLowerCase();
      this.applyFilters();
      this.renderProducts();
    });

    this.elements.clearSearch.addEventListener('click', () => {
      this.elements.searchInput.value = '';
      this.searchQuery = '';
      this.applyFilters();
      this.renderProducts();
    });

    this.elements.enableLiveSave.addEventListener('click', () => {
      this.requestLiveSaveAccess();
    });

    this.elements.currentRefreshButton.addEventListener('click', () => {
      this.refreshCurrentPage({ force: true });
    });

    this.elements.currentPageRetry.addEventListener('click', () => {
      this.refreshCurrentPage({ force: true });
    });

    this.elements.currentSaveButton.addEventListener('click', () => {
      this.handleCurrentPageSave();
    });

    this.elements.sidebarDonateButton.addEventListener('click', () => {
      this.handleDonateClick();
    });

    this.elements.sidebarDismissDonation.addEventListener('click', () => {
      this.handleDonationDismiss();
    });

    this.elements.sidebarDonateLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.handleDonateClick();
    });

    this.elements.compactSaveCurrent.addEventListener('click', () => {
      this.handleCompactCurrentPageSave();
    });

    this.elements.currentPreviewImage.addEventListener('error', () => {
      this.setCurrentPreviewImage(null, 'No product image available');
    });

    this.elements.gridView.addEventListener('click', () => {
      this.setView('grid');
    });

    this.elements.listView.addEventListener('click', () => {
      this.setView('list');
    });

    document.querySelectorAll('.context-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.handleContextMenuAction(item.dataset.action);
      });
    });

    document.querySelectorAll('.sort-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.setSort(item.dataset.sort);
      });
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.product-card')) {
        this.hideContextMenu();
      }

      if (!event.target.closest('#sort-menu') && event.target !== this.elements.sortButton) {
        this.hideSortMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hideContextMenu();
        this.hideSortMenu();
      }
    });

    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleActiveTabChanged(activeInfo);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdated(tabId, changeInfo, tab);
    });

    chrome.windows.onFocusChanged.addListener((windowId) => {
      this.handleWindowFocusChanged(windowId);
    });

    chrome.permissions.onAdded.addListener(() => {
      this.syncLiveAccessState()
        .then(() => this.refreshCurrentPage({ force: true }))
        .catch((error) => {
          console.error('Failed to react to added permissions:', error);
        });
    });

    chrome.permissions.onRemoved.addListener(() => {
      this.syncLiveAccessState()
        .then(() => this.refreshCurrentPage({ force: true }))
        .catch((error) => {
          console.error('Failed to react to removed permissions:', error);
        });
    });
  }

  async loadSettings() {
    const settings = await this.storage.getSettings();
    this.applySidebarSettings(settings);
  }

  applySidebarSettings(settings) {
    const showLivePreview = settings?.showLivePreview !== false;
    const changed = this.showLivePreview !== showLivePreview;

    this.showLivePreview = showLivePreview;
    this.elements.currentPageSection.hidden = !showLivePreview;
    this.elements.compactSaveCurrent.hidden = showLivePreview;

    if (!showLivePreview) {
      this.resetCurrentPageTransientState();
      this.currentPageResult = null;
      this.currentPageExistingProduct = null;
      this.currentTabId = null;
      this.currentWindowId = null;
      return;
    }

    if (changed) {
      this.refreshCurrentPage({ force: true }).catch((error) => {
        console.error('Failed to refresh current page after showing live preview:', error);
      });
    }
  }

  async loadProducts() {
    try {
      this.showLoading(true);
      const products = await this.storage.getProducts();
      this.updateProducts(products);
    } catch (error) {
      console.error('Failed to load products:', error);
      this.showToast('Failed to load products.', 'error');
      this.updateProducts([]);
    } finally {
      this.showLoading(false);
    }
  }

  handleStorageChange(changes) {
    if (changes[this.storageKeys.SETTINGS] || changes[this.storageKeys.DONATION_STATE]) {
      this.updateDonationReminder().catch((error) => {
        console.error('Failed to refresh donation reminder after storage update:', error);
      });
    }

    if (changes[this.storageKeys.SETTINGS]) {
      this.storage.getSettings()
        .then((settings) => this.applySidebarSettings(settings))
        .catch((error) => {
          console.error('Failed to refresh sidebar settings after storage update:', error);
        });
    }

    if (!changes[this.storageKeys.PRODUCTS]) {
      return;
    }

    const nextProducts = Array.isArray(changes[this.storageKeys.PRODUCTS].newValue)
      ? changes[this.storageKeys.PRODUCTS].newValue
      : [];
    this.updateProducts(nextProducts);
    this.syncCurrentPageExistingProduct();
    if (this.currentPageResult) {
      this.renderCurrentPagePreview();
    }
  }

  updateProducts(products) {
    this.products = Array.isArray(products) ? products : [];
    this.applyFilters();
    this.renderProducts();
  }

  applyFilters() {
    const query = this.searchQuery;

    this.filteredProducts = this.products.filter((product) => {
      if (!query) {
        return true;
      }

      return (
        (product.name || '').toLowerCase().includes(query) ||
        (product.website || '').toLowerCase().includes(query) ||
        (product.price || '').toString().includes(query)
      );
    });

    this.applySorting();
    this.updateProductsCount();
    this.elements.clearSearch.style.display = query ? 'flex' : 'none';
  }

  applySorting() {
    this.filteredProducts.sort((a, b) => {
      switch (this.currentSort) {
        case 'oldest':
          return (a.dateSaved || 0) - (b.dateSaved || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'price-low':
          return (Number.parseFloat(a.price) || Number.MAX_SAFE_INTEGER) -
            (Number.parseFloat(b.price) || Number.MAX_SAFE_INTEGER);
        case 'price-high':
          return (Number.parseFloat(b.price) || -1) -
            (Number.parseFloat(a.price) || -1);
        case 'newest':
        default:
          return (b.dateSaved || 0) - (a.dateSaved || 0);
      }
    });
  }

  renderProducts() {
    this.elements.productsContainer.replaceChildren();
    this.elements.productsContainer.className = `products-container ${this.currentView}-view`;

    if (!this.products.length) {
      this.showEmptyState(
        'No products saved yet',
        'Click the extension icon on any product page to start building your board.'
      );
      return;
    }

    if (!this.filteredProducts.length) {
      this.showEmptyState(
        'No products match your search',
        'Try a different keyword or clear the search field.'
      );
      return;
    }

    this.hideEmptyState();

    this.filteredProducts.forEach((product) => {
      this.elements.productsContainer.appendChild(this.createProductCard(product));
    });
  }

  createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card fade-in';
    card.dataset.productId = product.id;

    const imageContainer = document.createElement('div');
    imageContainer.className = 'product-image-container';

    const image = document.createElement('img');
    image.className = 'product-image';
    image.loading = 'lazy';
    image.alt = product.name || 'Saved product image';
    image.src = product.imageUrl || this.fallbackImage;
    image.addEventListener('error', () => {
      image.src = this.fallbackImage;
    });
    imageContainer.appendChild(image);

    const info = document.createElement('div');
    info.className = 'product-info';

    const name = document.createElement('div');
    name.className = 'product-name';
    name.textContent = product.name || 'Unknown Product';

    const price = document.createElement('div');
    price.className = 'product-price';
    price.textContent = this.formatPrice(product.price, product.currency);

    const website = document.createElement('div');
    website.className = 'product-website';
    website.textContent = product.website || 'Unknown';

    const date = document.createElement('div');
    date.className = 'product-date';
    date.textContent = this.formatDate(product.dateSaved || product.dateUpdated);

    info.append(name, price, website, date);
    card.append(imageContainer, info);

    card.addEventListener('click', () => {
      this.openProduct(product);
    });

    card.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.showContextMenu(event, product);
    });

    return card;
  }

  setView(view) {
    this.currentView = view;
    this.elements.gridView.classList.toggle('active', view === 'grid');
    this.elements.listView.classList.toggle('active', view === 'list');
    this.renderProducts();
  }

  setSort(sortType) {
    this.currentSort = sortType;
    this.highlightActiveSort();
    this.hideSortMenu();
    this.applyFilters();
    this.renderProducts();
  }

  highlightActiveSort() {
    document.querySelectorAll('.sort-menu-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.sort === this.currentSort);
    });
  }

  toggleSortMenu() {
    const isHidden = this.elements.sortMenu.hasAttribute('hidden');
    if (isHidden) {
      this.highlightActiveSort();
      this.elements.sortMenu.removeAttribute('hidden');
    } else {
      this.hideSortMenu();
    }
  }

  hideSortMenu() {
    this.elements.sortMenu.setAttribute('hidden', 'hidden');
  }

  showContextMenu(event, product) {
    this.contextMenuTarget = product;
    const menu = this.elements.contextMenu;
    menu.style.display = 'block';

    const left = Math.min(event.pageX, window.innerWidth - 210);
    const top = Math.min(event.pageY, window.innerHeight - 180);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  hideContextMenu() {
    this.elements.contextMenu.style.display = 'none';
    this.contextMenuTarget = null;
  }

  async handleContextMenuAction(action) {
    if (!this.contextMenuTarget) {
      return;
    }

    const product = this.contextMenuTarget;
    this.hideContextMenu();

    switch (action) {
      case 'open':
        this.openProduct(product);
        return;

      case 'copy-link':
        await this.copyProductLink(product);
        return;

      case 'delete':
        await this.deleteProduct(product);
        return;

      default:
        return;
    }
  }

  openProduct(product) {
    const url = this.storage.sanitizeProductUrl(product.affiliateUrl || product.originalUrl);
    if (url) {
      chrome.tabs.create({ url });
      return;
    }

    this.showToast('This saved item does not have a valid product URL.', 'error');
  }

  async syncLiveAccessState() {
    this.hasLiveAccess = await chrome.permissions.contains({
      origins: ['https://*/*', 'http://*/*']
    });
  }

  async requestLiveSaveAccess() {
    try {
      const granted = await chrome.permissions.request({
        origins: ['https://*/*', 'http://*/*']
      });

      if (!granted) {
        this.setCurrentPageStatus('Access denied');
        this.renderCurrentPageGate('Live Save stays off until you allow optional website access for the side panel to follow the active shopping tab.');
        this.showToast('Live Save access was not granted.', 'error');
        return;
      }

      await this.syncLiveAccessState();
      this.showToast('Live Save enabled for the side panel.', 'success');
      await this.refreshCurrentPage({ force: true });
    } catch (error) {
      console.error('Failed to request Live Save access:', error);
      this.setCurrentPageStatus('Access error');
      this.renderCurrentPageError('Could not request website access right now.');
    }
  }

  async refreshCurrentPage(options = {}) {
    if (!this.showLivePreview) {
      return;
    }

    const force = options.force === true;

    await this.syncLiveAccessState();
    this.resetCurrentPageTransientState();

    if (!this.hasLiveAccess) {
      this.currentPageResult = null;
      this.currentPageExistingProduct = null;
      this.currentTabId = null;
      this.renderCurrentPageGate(
        'Enable Live Save to let this side panel follow the active shopping tab. Website access stays optional and is only used for the visible current-page card.'
      );
      return;
    }

    let activeTab;
    try {
      activeTab = await this.getActiveTab();
    } catch (error) {
      console.error('Failed to resolve active tab for side panel:', error);
      this.renderCurrentPageError('Could not find an active browser tab to scan.');
      return;
    }

    if (!activeTab?.id) {
      this.renderCurrentPageError('Could not find an active browser tab to scan.');
      return;
    }

    if (
      !force &&
      this.isScanningCurrentPage &&
      activeTab.id === this.currentTabId
    ) {
      return;
    }

    this.currentTabId = activeTab.id;
    this.currentWindowId = activeTab.windowId || this.currentWindowId;

    if (!this.isSupportedUrl(activeTab.url)) {
      this.currentPageResult = null;
      this.currentPageExistingProduct = null;
      this.setCurrentPageStatus('Unavailable');
      this.renderCurrentPageError('This tab is not a supported shopping page. Open a regular http or https product page.');
      return;
    }

    this.isScanningCurrentPage = true;
    this.setCurrentPageStatus('Scanning');
    this.showCurrentPageState('loading');

    try {
      const response = await this.requestCurrentPageScrape(activeTab.id);
      if (!this.showLivePreview) {
        return;
      }

      this.currentPageResult = response.data;
      this.syncCurrentPageExistingProduct();
      this.renderCurrentPagePreview();
    } catch (error) {
      console.error('Current page scan failed:', error);
      this.currentPageResult = null;
      this.currentPageExistingProduct = null;
      this.setCurrentPageStatus('Unavailable');
      this.renderCurrentPageError(error.message || 'Could not scan the current page.');
    } finally {
      this.isScanningCurrentPage = false;
    }
  }

  async handleCurrentPageSave() {
    if (!this.showLivePreview) {
      this.showToast('Side panel live preview is hidden. Use the popup to save this page.', 'error');
      return;
    }

    if (!this.currentPageResult?.product) {
      await this.refreshCurrentPage({ force: true });
      return;
    }

    this.elements.currentSaveButton.disabled = true;
    this.setCurrentPageStatus('Saving');

    try {
      const response = await this.sendRuntimeMessage({
        type: this.messageTypes.SAVE_PRODUCT,
        productData: this.currentPageResult.product
      });

      this.currentPageExistingProduct = response.data.product;
      this.renderCurrentPagePreview();
      this.showToast(
        response.data.created ? 'Product saved from the side panel.' : 'Saved product updated.',
        'success'
      );
    } catch (error) {
      console.error('Current page save failed:', error);
      this.setCurrentPageStatus('Save failed');
      this.showToast(error.message || 'Failed to save this product.', 'error');
    } finally {
      this.elements.currentSaveButton.disabled = false;
    }
  }

  async handleCompactCurrentPageSave() {
    this.elements.compactSaveCurrent.disabled = true;
    const originalLabel = this.elements.compactSaveCurrent.textContent;
    this.elements.compactSaveCurrent.textContent = 'Saving...';

    try {
      const activeTab = await this.prepareActiveTabForDirectSave();
      const scrapeResponse = await this.requestCurrentPageScrape(activeTab.id);
      const saveResponse = await this.sendRuntimeMessage({
        type: this.messageTypes.SAVE_PRODUCT,
        productData: scrapeResponse.data.product
      });

      this.showToast(
        saveResponse.data.created ? 'Product saved from the side panel.' : 'Saved product updated.',
        'success'
      );
    } catch (error) {
      console.error('Compact current page save failed:', error);
      this.showToast(error.message || 'Failed to save the current page.', 'error');
    } finally {
      this.elements.compactSaveCurrent.disabled = false;
      this.elements.compactSaveCurrent.textContent = originalLabel;
    }
  }

  async prepareActiveTabForDirectSave() {
    await this.syncLiveAccessState();

    if (!this.hasLiveAccess) {
      const granted = await chrome.permissions.request({
        origins: ['https://*/*', 'http://*/*']
      });

      if (!granted) {
        throw new Error('Live Save website access was not granted.');
      }

      await this.syncLiveAccessState();
    }

    const activeTab = await this.getActiveTab();
    if (!activeTab?.id) {
      throw new Error('Could not find an active browser tab to scan.');
    }

    if (!this.isSupportedUrl(activeTab.url)) {
      throw new Error('Open a regular http or https product page before saving.');
    }

    return activeTab;
  }

  async handleActiveTabChanged(activeInfo) {
    if (!this.showLivePreview || !this.hasLiveAccess) {
      return;
    }

    this.currentTabId = activeInfo.tabId;
    this.currentWindowId = activeInfo.windowId;
    await this.refreshCurrentPage({ force: true });
  }

  async handleTabUpdated(tabId, changeInfo, tab) {
    if (!this.showLivePreview || !this.hasLiveAccess) {
      return;
    }

    if (tabId !== this.currentTabId) {
      return;
    }

    if (changeInfo.status !== 'complete' && !changeInfo.url) {
      return;
    }

    if (tab?.active === false) {
      return;
    }

    await this.refreshCurrentPage({ force: true });
  }

  async handleWindowFocusChanged(windowId) {
    if (!this.showLivePreview || !this.hasLiveAccess) {
      return;
    }

    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      return;
    }

    this.currentWindowId = windowId;
    await this.refreshCurrentPage({ force: true });
  }

  async getActiveTab() {
    const tabs = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });

    return tabs[0] || null;
  }

  syncCurrentPageExistingProduct() {
    if (!this.currentPageResult?.product?.originalUrl) {
      this.currentPageExistingProduct = null;
      return;
    }

    this.currentPageExistingProduct =
      this.products.find((product) => product.originalUrl === this.currentPageResult.product.originalUrl) || null;
  }

  renderCurrentPageGate(copy) {
    this.setCurrentPageStatus('Live Save off');
    this.elements.currentPageEmpty.querySelector('.current-page-copy').textContent = copy;
    this.showCurrentPageState('gate');
  }

  renderCurrentPagePreview() {
    const { product, meta } = this.currentPageResult;

    this.elements.currentPreviewTitle.textContent = product.name || 'Unknown Product';
    this.elements.currentPreviewPrice.textContent = this.formatPrice(product.price, product.currency);
    this.elements.currentPreviewSite.textContent = product.website || 'Unknown site';
    this.elements.currentPreviewNote.textContent = this.buildCurrentPageNote(meta);
    this.elements.currentSaveButton.textContent = this.currentPageExistingProduct
      ? 'Update Saved Product'
      : 'Save to Board';

    this.setCurrentPreviewImage(
      product.imageUrl,
      product.name || 'Current page product preview'
    );

    if (meta.confidence === 'high') {
      this.setCurrentPageStatus('Ready to save');
    } else if (meta.confidence === 'medium') {
      this.setCurrentPageStatus('Review details');
    } else {
      this.setCurrentPageStatus('Limited data');
    }

    this.showCurrentPageState('preview');
  }

  buildCurrentPageNote(meta) {
    if (this.currentPageExistingProduct) {
      return 'Already on your board. Saving again refreshes the saved details.';
    }

    if (meta?.confidence === 'high') {
      return `Strong match from ${meta.strategy}.`;
    }

    if (meta?.confidence === 'medium') {
      return `Partial product data found via ${meta.strategy}.`;
    }

    return 'Fallback product details were detected. Review before saving.';
  }

  renderCurrentPageError(message) {
    this.elements.currentPageErrorText.textContent = message;
    this.showCurrentPageState('error');
  }

  showCurrentPageState(state) {
    this.elements.currentPageEmpty.hidden = state !== 'gate';
    this.elements.currentPageLoading.hidden = state !== 'loading';
    this.elements.currentPagePreview.hidden = state !== 'preview';
    this.elements.currentPageError.hidden = state !== 'error';
  }

  setCurrentPageStatus(text) {
    this.elements.currentPageStatus.textContent = text;
  }

  resetCurrentPageTransientState() {
    this.elements.currentPageErrorText.textContent = 'This page could not be scanned right now.';
  }

  setCurrentPreviewImage(imageUrl, altText) {
    const safeSrc = imageUrl || this.fallbackImage;
    this.elements.currentPreviewImage.src = safeSrc;
    this.elements.currentPreviewImage.alt = altText || 'No product image available';
  }

  async updateDonationReminder() {
    try {
      const isDue = await this.storage.isDonationReminderDue();
      this.elements.donationReminder.hidden = !isDue;
    } catch (error) {
      console.error('Failed to update sidebar donation reminder:', error);
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
      this.showToast('Could not open the donation link right now.', 'error');
    }
  }

  async handleDonationDismiss() {
    try {
      await this.storage.dismissDonationReminder();
      this.elements.donationReminder.hidden = true;
    } catch (error) {
      console.error('Failed to dismiss donation reminder:', error);
      this.showToast('Could not update the donation reminder right now.', 'error');
    }
  }

  async requestCurrentPageScrape(tabId) {
    try {
      return await this.sendRuntimeMessage({
        type: this.messageTypes.SCRAPE_TAB,
        tabId
      });
    } catch (error) {
      if (!/Unknown message type/i.test(error?.message || '')) {
        throw error;
      }

      console.warn('Falling back to SCRAPE_PRODUCT after SCRAPE_TAB was rejected:', error.message);
      return this.sendRuntimeMessage({
        type: this.messageTypes.SCRAPE_PRODUCT
      });
    }
  }

  async copyProductLink(product) {
    try {
      const safeUrl = this.storage.sanitizeProductUrl(product.affiliateUrl || product.originalUrl);
      if (!safeUrl) {
        throw new Error('This saved item does not have a valid product URL.');
      }

      await navigator.clipboard.writeText(safeUrl);
      this.showToast('Link copied to clipboard.', 'success');
    } catch (error) {
      console.error('Failed to copy link:', error);
      this.showToast(error.message || 'Could not copy the link.', 'error');
    }
  }

  async deleteProduct(product) {
    const confirmed = window.confirm(`Delete "${product.name}" from your board?`);
    if (!confirmed) {
      return;
    }

    try {
      const deleted = await this.storage.deleteProduct(product.id);
      if (!deleted) {
        throw new Error('Product was not found in storage');
      }

      this.showToast('Product deleted.', 'success');
    } catch (error) {
      console.error('Failed to delete product:', error);
      this.showToast('Could not delete the product.', 'error');
    }
  }

  showLoading(show) {
    this.elements.loadingState.style.display = show ? 'flex' : 'none';
  }

  showEmptyState(title, copy) {
    this.elements.emptyHeading.textContent = title;
    this.elements.emptyCopy.textContent = copy;
    this.elements.emptyState.style.display = 'flex';
    this.elements.productsContainer.style.display = 'none';
  }

  hideEmptyState() {
    this.elements.emptyState.style.display = 'none';
    this.elements.productsContainer.style.display = '';
  }

  updateProductsCount() {
    const count = this.filteredProducts.length;
    const total = this.products.length;

    if (count === total) {
      this.elements.productsCount.textContent = `${count} product${count === 1 ? '' : 's'}`;
      return;
    }

    this.elements.productsCount.textContent = `${count} of ${total} products`;
  }

  formatPrice(price, currency = 'USD') {
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
        currency
      }).format(numericPrice);
    } catch (error) {
      return `$${numericPrice.toFixed(2)}`;
    }
  }

  formatDate(timestamp) {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Today';
    }

    if (diffDays === 1) {
      return 'Yesterday';
    }

    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }

    return date.toLocaleDateString();
  }

  showToast(message, type = 'success') {
    window.clearTimeout(this.toastTimeout);
    this.elements.toast.hidden = false;
    this.elements.toast.className = `toast ${type}`;
    this.elements.toast.textContent = message;
    this.toastTimeout = window.setTimeout(() => {
      this.elements.toast.hidden = true;
    }, 2400);
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
    window.sidebarController = new SidebarController();
  });
} else {
  window.sidebarController = new SidebarController();
}
