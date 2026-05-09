// Universal Product Board content script.
(function initContentScript() {
  if (window.__UPB_CONTENT_CONTROLLER__) {
    window.__UPB_CONTENT_CONTROLLER__.handleUrlChange();
    return;
  }

  class ContentScriptController {
    constructor() {
      this.scraper = new UniversalProductBoard.ProductScraper();
      this.messageHandler = this.handleMessage.bind(this);
      this.currentUrl = window.location.href;
      this.observeUrlChanges();
      chrome.runtime.onMessage.addListener(this.messageHandler);
      console.log('Universal Product Board content script ready');
    }

    observeUrlChanges() {
      this.observer = new MutationObserver(() => {
        if (window.location.href !== this.currentUrl) {
          this.handleUrlChange();
        }
      });

      this.observer.observe(document, {
        subtree: true,
        childList: true
      });
    }

    handleUrlChange() {
      this.currentUrl = window.location.href;
      this.scraper.refresh();
    }

    handleMessage(message, sender, sendResponse) {
      if (message?.type !== UniversalProductBoard.MESSAGE_TYPES.SCRAPE_PRODUCT) {
        return false;
      }

      (async () => {
        try {
          const result = await this.scraper.scrapeProduct();
          sendResponse({
            success: true,
            data: result
          });
        } catch (error) {
          console.error('Content script scrape failed:', error);
          sendResponse({
            success: false,
            error: error.message || 'Failed to scrape product data'
          });
        }
      })();

      return true;
    }
  }

  window.__UPB_CONTENT_CONTROLLER__ = new ContentScriptController();
})();
