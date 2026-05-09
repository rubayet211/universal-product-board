// Shared constants for Universal Product Board.
(function initSharedConstants(global) {
  const STORAGE_KEYS = {
    PRODUCTS: 'products',
    SETTINGS: 'settings',
    DONATION_STATE: 'donationState'
  };

  const MESSAGE_TYPES = {
    SCRAPE_PRODUCT: 'SCRAPE_PRODUCT',
    SCRAPE_TAB: 'SCRAPE_TAB',
    SAVE_PRODUCT: 'SAVE_PRODUCT'
  };

  const AFFILIATE_MAPPINGS = {
    'amazon.com': {
      pattern: /^https?:\/\/(www\.)?amazon\.com\//i,
      param: 'tag',
      affiliateId: null
    },
    'etsy.com': {
      pattern: /^https?:\/\/(www\.)?etsy\.com\//i,
      param: 'ref',
      affiliateId: null
    },
    'walmart.com': {
      pattern: /^https?:\/\/(www\.)?walmart\.com\//i,
      param: 'wmlspartner',
      affiliateId: null
    },
    'target.com': {
      pattern: /^https?:\/\/(www\.)?target\.com\//i,
      param: 'ref',
      affiliateId: null
    },
    'bestbuy.com': {
      pattern: /^https?:\/\/(www\.)?bestbuy\.com\//i,
      param: 'loc',
      affiliateId: null
    },
    'ebay.com': {
      pattern: /^https?:\/\/(www\.)?ebay\.com\//i,
      param: 'mkcid',
      affiliateId: null
    },
    'homedepot.com': {
      pattern: /^https?:\/\/(www\.)?homedepot\.com\//i,
      param: 'cm_mmc',
      affiliateId: null
    },
    'lowes.com': {
      pattern: /^https?:\/\/(www\.)?lowes\.com\//i,
      param: 'cm_mmc',
      affiliateId: null
    },
    'ikea.com': {
      pattern: /^https?:\/\/(www\.)?ikea\.com\//i,
      param: 'ref',
      affiliateId: null
    },
    'costco.com': {
      pattern: /^https?:\/\/(www\.)?costco\.com\//i,
      param: 'ref',
      affiliateId: null
    }
  };

  const SCRAPER_SELECTORS = {
    jsonLd: 'script[type="application/ld+json"]',
    ogTitle: 'meta[property="og:title"]',
    ogImage: 'meta[property="og:image"]',
    ogUrl: 'meta[property="og:url"]',
    metaPrice: [
      'meta[property="product:price:amount"]',
      'meta[property="product:price"]',
      'meta[name="price"]',
      'meta[name="twitter:data1"]'
    ],
    productName: [
      '[data-testid="product-title"]',
      '[data-test-id="product-title"]',
      '[itemprop="name"]',
      '#productTitle',
      'h1.product-title',
      '.product-title',
      '.product-name',
      '.pdp-product-name',
      'main h1',
      'h1'
    ],
    productPrice: [
      '[data-testid="price"]',
      '[data-test-id="price"]',
      '[itemprop="price"]',
      '.priceToPay .a-offscreen',
      '.a-price .a-offscreen',
      '.product-price',
      '.price',
      '.current-price',
      '.selling-price',
      '.price-current',
      '.notranslate'
    ],
    productImage: [
      '[data-testid="product-image"] img',
      '[data-testid="product-image"]',
      '[itemprop="image"]',
      '#landingImage',
      '#imgBlkFront',
      '.product-image img',
      '.main-image img',
      '.product-gallery img',
      'meta[property="og:image"]'
    ]
  };

  const DEFAULT_SETTINGS = {
    showNotifications: false,
    showDonationReminders: true,
    showLivePreview: true,
    showPopupDisclosure: true,
    theme: 'system'
  };

  const DONATION = {
    url: 'https://buymeacoffee.com/axinofy',
    reminderIntervalMs: 7 * 24 * 60 * 60 * 1000
  };

  const PRICE_CURRENCY_MAP = {
    '$': 'USD',
    '£': 'GBP',
    '€': 'EUR',
    '¥': 'JPY',
    '₹': 'INR',
    'C$': 'CAD',
    'A$': 'AUD'
  };

  const api = {
    STORAGE_KEYS,
    MESSAGE_TYPES,
    AFFILIATE_MAPPINGS,
    SCRAPER_SELECTORS,
    DEFAULT_SETTINGS,
    PRICE_CURRENCY_MAP,
    DONATION
  };

  global.UniversalProductBoard = global.UniversalProductBoard || {};
  Object.assign(global.UniversalProductBoard, api);
})(typeof globalThis !== 'undefined' ? globalThis : self);
