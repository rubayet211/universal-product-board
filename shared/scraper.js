// Shared scraper utilities for Universal Product Board.
(function initSharedScraper(global) {
  const namespace = global.UniversalProductBoard || {};
  const selectors = namespace.SCRAPER_SELECTORS;
  const priceCurrencyMap = namespace.PRICE_CURRENCY_MAP;

  if (!selectors) {
    throw new Error('UniversalProductBoard constants must load before scraper');
  }

  class ProductScraper {
    constructor(doc = document, locationObject = window.location) {
      this.doc = doc;
      this.location = locationObject;
      this.refresh();
    }

    refresh() {
      this.currentUrl = this.location.href;
      this.currentHostname = this.location.hostname;
      this.currentOrigin = this.location.origin;
    }

    async scrapeProduct() {
      this.refresh();

      const product = {
        name: null,
        price: null,
        currency: this.detectCurrencyFromHostname(),
        imageUrl: null,
        originalUrl: this.currentUrl,
        website: this.extractWebsiteName()
      };

      const warnings = [];
      let strategy = 'fallback';
      let amazonSiteSpecificMissingPrice = false;

      const methods = [
        { name: 'site-specific', run: () => this.extractFromSiteSpecific() },
        { name: 'json-ld', run: () => this.extractFromJsonLd() },
        { name: 'microdata', run: () => this.extractFromMicrodata() },
        { name: 'open-graph', run: () => this.extractFromOpenGraph() },
        { name: 'selectors', run: () => this.extractFromSelectors() }
      ];

      for (const method of methods) {
        try {
          const result = await method.run();
          if (!result) {
            continue;
          }

          const cleanedResult = this.cleanPartialProduct(result);
          this.mergeProductData(product, cleanedResult);

          if (strategy === 'fallback' && this.hasMeaningfulProductData(cleanedResult)) {
            strategy = method.name;
          }

          if (
            method.name === 'site-specific' &&
            this.isAmazonPage() &&
            !cleanedResult.price &&
            (cleanedResult.name || cleanedResult.imageUrl)
          ) {
            amazonSiteSpecificMissingPrice = true;
          }

          if (this.hasHighConfidenceProduct(product)) {
            break;
          }
        } catch (error) {
          warnings.push(`${method.name}: ${error.message}`);
        }
      }

      if (!product.name) {
        product.name = this.extractFallbackTitle();
        warnings.push('Used page title fallback');
      }

      if (!product.imageUrl) {
        const fallbackImage = this.extractFallbackImage();
        if (fallbackImage) {
          product.imageUrl = fallbackImage;
          if (strategy === 'fallback') {
            strategy = 'fallback-image';
          }
        }
      }

      if (amazonSiteSpecificMissingPrice) {
        warnings.push(
          'Amazon product details were found, but the main price was not available from site-specific selectors.'
        );
      }

      const confidence = this.determineConfidence(product, strategy);

      return {
        product: this.cleanPartialProduct(product),
        meta: {
          strategy,
          confidence,
          warnings,
          isProductLike: confidence !== 'none'
        }
      };
    }

    async extractFromSiteSpecific() {
      const hostname = this.currentHostname.toLowerCase();

      if (hostname.includes('amazon.')) {
        return this.scrapeAmazonWithRetry();
      }

      if (hostname.includes('etsy.')) {
        return this.scrapeEtsy();
      }

      if (hostname.includes('ebay.')) {
        return this.scrapeEbay();
      }

      if (hostname.includes('walmart.')) {
        return this.scrapeWalmart();
      }

      return null;
    }

    async scrapeAmazonWithRetry() {
      let result = this.scrapeAmazon();

      if (!result || result.price || (!result.name && !result.imageUrl)) {
        return result;
      }

      const retryDelays = [150, 250, 400];
      for (const delayMs of retryDelays) {
        await this.delay(delayMs);
        this.refresh();
        result = this.scrapeAmazon();

        if (!result || result.price) {
          return result;
        }
      }

      return result;
    }

    extractFromJsonLd() {
      const scripts = this.doc.querySelectorAll(selectors.jsonLd);

      for (const script of scripts) {
        const candidates = this.parseJsonLd(script.textContent);

        for (const candidate of candidates) {
          const productNode = this.findProductNode(candidate);
          if (productNode) {
            const normalized = this.normalizeSchemaProduct(productNode);
            if (normalized.name || normalized.imageUrl || normalized.price) {
              return normalized;
            }
          }
        }
      }

      return null;
    }

    parseJsonLd(text) {
      if (!text) {
        return [];
      }

      try {
        const parsed = JSON.parse(text.trim());
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        return [];
      }
    }

    findProductNode(node) {
      if (!node || typeof node !== 'object') {
        return null;
      }

      if (this.isProductType(node['@type'])) {
        return node;
      }

      if (Array.isArray(node['@graph'])) {
        for (const item of node['@graph']) {
          const found = this.findProductNode(item);
          if (found) {
            return found;
          }
        }
      }

      if (node.mainEntity) {
        const found = this.findProductNode(node.mainEntity);
        if (found) {
          return found;
        }
      }

      if (node.item) {
        const found = this.findProductNode(node.item);
        if (found) {
          return found;
        }
      }

      return null;
    }

    isProductType(type) {
      if (Array.isArray(type)) {
        return type.some((value) => this.isProductType(value));
      }

      if (typeof type !== 'string') {
        return false;
      }

      return /Product$/i.test(type);
    }

    normalizeSchemaProduct(data) {
      const normalized = {};

      if (typeof data.name === 'string') {
        normalized.name = data.name;
      }

      normalized.imageUrl = this.normalizeSchemaImage(data.image);

      const offer = this.getPrimaryOffer(data.offers);
      if (offer) {
        if (offer.price !== undefined && offer.price !== null) {
          normalized.price = String(offer.price);
        }
        if (offer.priceCurrency) {
          normalized.currency = String(offer.priceCurrency);
        }
      }

      if (!normalized.price && data.price !== undefined && data.price !== null) {
        normalized.price = String(data.price);
      }

      return normalized;
    }

    normalizeSchemaImage(image) {
      if (!image) {
        return null;
      }

      if (typeof image === 'string') {
        return this.normalizeImageUrl(image);
      }

      if (Array.isArray(image)) {
        for (const item of image) {
          const normalized = this.normalizeSchemaImage(item);
          if (normalized) {
            return normalized;
          }
        }
      }

      if (typeof image === 'object') {
        return this.normalizeImageUrl(image.url || image.contentUrl || image['@id']);
      }

      return null;
    }

    getPrimaryOffer(offers) {
      if (!offers) {
        return null;
      }

      const offerList = Array.isArray(offers) ? offers : [offers];

      for (const offer of offerList) {
        if (offer && typeof offer === 'object') {
          if (offer.lowPrice !== undefined && offer.lowPrice !== null) {
            return {
              price: offer.lowPrice,
              priceCurrency: offer.priceCurrency
            };
          }

          if (offer.price !== undefined && offer.price !== null) {
            return offer;
          }
        }
      }

      return null;
    }

    extractFromMicrodata() {
      const productElement =
        this.doc.querySelector('[itemtype*="schema.org/Product"]') ||
        this.doc.querySelector('[itemtype*="Product"]');

      if (!productElement) {
        return null;
      }

      const result = {};
      const nameElement = productElement.querySelector('[itemprop="name"]');
      const priceElement = productElement.querySelector('[itemprop="price"]');
      const currencyElement = productElement.querySelector('[itemprop="priceCurrency"]');
      const imageElement = productElement.querySelector('[itemprop="image"]');

      if (nameElement) {
        result.name = this.getElementValue(nameElement);
      }

      if (priceElement) {
        result.price = this.extractPriceValue(this.getElementValue(priceElement));
      }

      if (currencyElement) {
        result.currency = this.getElementValue(currencyElement);
      }

      if (imageElement) {
        result.imageUrl = this.normalizeImageUrl(this.getElementValue(imageElement));
      }

      return result.name || result.price || result.imageUrl ? result : null;
    }

    extractFromOpenGraph() {
      const result = {};
      const title = this.doc.querySelector(selectors.ogTitle);
      const image = this.doc.querySelector(selectors.ogImage);

      if (title) {
        result.name = title.getAttribute('content');
      }

      if (image) {
        result.imageUrl = this.normalizeImageUrl(image.getAttribute('content'));
      }

      for (const selector of selectors.metaPrice) {
        const meta = this.doc.querySelector(selector);
        if (meta && meta.getAttribute('content')) {
          result.price = this.extractPriceValue(meta.getAttribute('content'));
          break;
        }
      }

      return result.name || result.price || result.imageUrl ? result : null;
    }

    extractFromSelectors() {
      const result = {};
      const isAmazon = this.isAmazonPage();

      for (const selector of selectors.productName) {
        const element = this.doc.querySelector(selector);
        const value = this.getElementValue(element);
        if (value) {
          result.name = value;
          break;
        }
      }

      for (const selector of selectors.productPrice) {
        if (isAmazon && ['.priceToPay .a-offscreen', '.a-price .a-offscreen'].includes(selector)) {
          continue;
        }

        const element = this.doc.querySelector(selector);
        const value = this.getElementValue(element);
        const price = this.extractPriceValue(value);
        if (price) {
          result.price = price;
          const currency = this.detectCurrencyFromText(value);
          if (currency) {
            result.currency = currency;
          }
          break;
        }
      }

      for (const selector of selectors.productImage) {
        const element = this.doc.querySelector(selector);
        if (!element) {
          continue;
        }

        if (element.tagName === 'META') {
          result.imageUrl = this.normalizeImageUrl(element.getAttribute('content'));
        } else {
          result.imageUrl = this.normalizeImageUrl(
            element.currentSrc ||
              element.src ||
              element.getAttribute('src') ||
              element.getAttribute('data-src') ||
              element.getAttribute('data-lazy-src') ||
              element.getAttribute('content')
          );
        }

        if (result.imageUrl) {
          break;
        }
      }

      return result.name || result.price || result.imageUrl ? result : null;
    }

    scrapeAmazon() {
      const name = this.getElementValue(
        this.doc.querySelector('#productTitle') || this.doc.querySelector('#title')
      );
      const priceMatch = this.extractAmazonPrice();
      const imageUrl = this.normalizeImageUrl(
        this.getElementValue(
          this.doc.querySelector('#landingImage') || this.doc.querySelector('#imgBlkFront')
        )
      );

      return name || priceMatch?.price || imageUrl
        ? {
            name,
            price: priceMatch?.price || null,
            currency: priceMatch?.currency || this.detectCurrencyFromHostname(),
            imageUrl
          }
        : null;
    }

    extractAmazonPrice() {
      const prioritizedSelectors = [
        '#corePriceDisplay_desktop_feature_div .priceToPay .a-offscreen',
        '#corePrice_feature_div .priceToPay .a-offscreen',
        '#apex_desktop .priceToPay .a-offscreen',
        '#corePriceDisplay_desktop_feature_div .reinventPricePriceToPayMargin .a-offscreen',
        '#corePrice_feature_div .reinventPricePriceToPayMargin .a-offscreen',
        '#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price) .a-offscreen',
        '#corePrice_feature_div .a-price:not(.a-text-price) .a-offscreen',
        '#corePrice_mobile_feature_div .a-price:not(.a-text-price) .a-offscreen',
        '#desktop_buybox .a-price:not(.a-text-price) .a-offscreen',
        '#buybox .a-price:not(.a-text-price) .a-offscreen',
        '#newAccordionRow_0 .a-price:not(.a-text-price) .a-offscreen',
        '#tp_price_block_total_price_ww .a-offscreen',
        '#price_inside_buybox',
        '#priceblock_ourprice',
        '#priceblock_dealprice'
      ];

      for (const selector of prioritizedSelectors) {
        const match = this.findAmazonPriceFromSelector(selector);
        if (match) {
          return match;
        }
      }

      const rootSelectors = [
        '#corePriceDisplay_desktop_feature_div',
        '#corePrice_feature_div',
        '#corePrice_mobile_feature_div',
        '#apex_desktop',
        '#desktop_buybox',
        '#buybox',
        '#centerCol',
        '#ppd',
        '#dp-container'
      ];
      const fallbackSelectors = [
        '.priceToPay .a-offscreen',
        '.a-price:not(.a-text-price) .a-offscreen',
        '[data-a-color="price"] .a-offscreen'
      ];

      for (const rootSelector of rootSelectors) {
        const root = this.doc.querySelector(rootSelector);
        if (!root) {
          continue;
        }

        for (const selector of fallbackSelectors) {
          const match = this.findAmazonPriceFromSelector(selector, root);
          if (match) {
            return match;
          }
        }
      }

      return null;
    }

    findAmazonPriceFromSelector(selector, root = this.doc) {
      const elements = root.querySelectorAll(selector);
      for (const element of elements) {
        const match = this.buildAmazonPriceMatch(element);
        if (match) {
          return match;
        }
      }

      return null;
    }

    buildAmazonPriceMatch(element) {
      if (!element) {
        return null;
      }

      if (element.closest('.a-text-price') || element.closest('[data-a-strike="true"]')) {
        return null;
      }

      const rawValue = this.getElementValue(element);
      const price = this.extractPriceValue(rawValue);
      if (!price) {
        return null;
      }

      const context = this.getAmazonPriceContextText(element);
      if (this.isRejectedAmazonPriceContext(context)) {
        return null;
      }

      return {
        price,
        currency: this.detectCurrencyFromText(rawValue || context) || this.detectCurrencyFromHostname()
      };
    }

    getAmazonPriceContextText(element) {
      const contextElement =
        element.closest(
          '.priceToPay, .apexPriceToPay, #corePriceDisplay_desktop_feature_div, #corePrice_feature_div, #corePrice_mobile_feature_div, #apex_desktop, #desktop_buybox, #buybox, .a-price'
        ) ||
        element.parentElement ||
        element;

      return this.cleanText(contextElement.textContent) || '';
    }

    isRejectedAmazonPriceContext(context) {
      if (!context) {
        return false;
      }

      return /(list price|typical price|was:|you save|with trade-?in|after trade-?in|per month|\/\s*(month|mo|week)|other sellers|starting at|starting from|protection plan|service plan|used from|renewed from|coupon)/i.test(
        context
      );
    }

    scrapeEtsy() {
      const name = this.getElementValue(
        this.doc.querySelector('h1[data-buy-box-listing-title="true"]') ||
          this.doc.querySelector('[data-listing-title]') ||
          this.doc.querySelector('h1')
      );
      const price = this.extractPriceValue(
        this.getElementValue(
          this.doc.querySelector('[data-buy-box-region="price"] p') ||
            this.doc.querySelector('[data-currency-price]') ||
            this.doc.querySelector('.wt-text-title-03')
        )
      );
      const imageUrl = this.normalizeImageUrl(
        this.getElementValue(
          this.doc.querySelector('[data-carousel-image] img') ||
            this.doc.querySelector('.wt-max-width-full img')
        )
      );

      return name || price || imageUrl ? { name, price, imageUrl } : null;
    }

    scrapeEbay() {
      const name = this.getElementValue(
        this.doc.querySelector('#itemTitle') || this.doc.querySelector('.x-item-title__mainTitle')
      )?.replace(/^Details about\s*/i, '');
      const price = this.extractPriceValue(
        this.getElementValue(
          this.doc.querySelector('.x-price-primary') ||
            this.doc.querySelector('#prcIsum') ||
            this.doc.querySelector('.notranslate')
        )
      );
      const imageUrl = this.normalizeImageUrl(
        this.getElementValue(
          this.doc.querySelector('#icImg') || this.doc.querySelector('.ux-image-carousel-item img')
        )
      );

      return name || price || imageUrl ? { name, price, imageUrl } : null;
    }

    scrapeWalmart() {
      const name = this.getElementValue(
        this.doc.querySelector('[data-testid="product-title"]') ||
          this.doc.querySelector('h1[itemprop="name"]') ||
          this.doc.querySelector('h1')
      );
      const price = this.extractPriceValue(
        this.getElementValue(
          this.doc.querySelector('[data-testid="price-wrap"]') ||
            this.doc.querySelector('[data-testid="price"]') ||
            this.doc.querySelector('.price-characteristic')
        )
      );
      const imageUrl = this.normalizeImageUrl(
        this.getElementValue(
          this.doc.querySelector('[data-testid="vertical-carousel-container"] img') ||
            this.doc.querySelector('[data-testid="media-viewer"] img')
        )
      );

      return name || price || imageUrl ? { name, price, imageUrl } : null;
    }

    extractFallbackTitle() {
      const candidates = [
        this.doc.querySelector('meta[property="og:title"]')?.getAttribute('content'),
        this.doc.querySelector('h1')?.textContent,
        this.doc.title
      ];

      for (const candidate of candidates) {
        const cleaned = this.cleanText(candidate);
        if (cleaned) {
          return cleaned;
        }
      }

      return `Product from ${this.currentHostname}`;
    }

    extractFallbackImage() {
      const candidates = this.doc.querySelectorAll('img');
      for (const image of candidates) {
        const src = this.normalizeImageUrl(
          image.currentSrc || image.src || image.getAttribute('src')
        );
        if (src) {
          return src;
        }
      }

      return null;
    }

    getElementValue(element) {
      if (!element) {
        return null;
      }

      const contentValue =
        element.getAttribute('content') ||
        element.getAttribute('src') ||
        element.getAttribute('href') ||
        element.getAttribute('data-src') ||
        element.getAttribute('data-lazy-src') ||
        element.getAttribute('value');

      return this.cleanText(contentValue || element.textContent || element.innerText || '');
    }

    mergeProductData(target, source) {
      for (const [key, value] of Object.entries(source)) {
        if (value === null || value === undefined || value === '') {
          continue;
        }

        target[key] = value;
      }
    }

    hasMeaningfulProductData(product) {
      return Boolean(product?.name || product?.price || product?.imageUrl);
    }

    hasHighConfidenceProduct(product) {
      return Boolean(product?.name && product?.price);
    }

    determineConfidence(product, strategy) {
      if (this.hasHighConfidenceProduct(product)) {
        return 'high';
      }

      if (product.name && (product.imageUrl || product.price) && !String(strategy).startsWith('fallback')) {
        return 'medium';
      }

      if (product.name) {
        return 'low';
      }

      return 'none';
    }

    cleanPartialProduct(product) {
      return {
        name: this.cleanText(product.name),
        price: this.extractPriceValue(product.price),
        currency: this.cleanText(product.currency) || this.detectCurrencyFromHostname(),
        imageUrl: this.normalizeImageUrl(product.imageUrl),
        originalUrl: product.originalUrl || this.currentUrl,
        website: this.cleanText(product.website) || this.extractWebsiteName()
      };
    }

    extractPriceValue(value) {
      if (value === null || value === undefined) {
        return null;
      }

      const text = String(value).replace(/\s+/g, ' ').trim();
      if (!text) {
        return null;
      }

      const match = text.match(/(\d[\d.,]*)/);
      if (!match) {
        return null;
      }

      let numeric = match[1];
      const hasComma = numeric.includes(',');
      const hasDot = numeric.includes('.');

      if (hasComma && hasDot) {
        if (numeric.lastIndexOf(',') > numeric.lastIndexOf('.')) {
          numeric = numeric.replace(/\./g, '').replace(',', '.');
        } else {
          numeric = numeric.replace(/,/g, '');
        }
      } else if (hasComma) {
        const commaParts = numeric.split(',');
        if (commaParts[commaParts.length - 1].length === 2) {
          numeric = numeric.replace(',', '.');
        } else {
          numeric = numeric.replace(/,/g, '');
        }
      }

      const parsed = Number.parseFloat(numeric);
      if (Number.isNaN(parsed)) {
        return null;
      }

      return parsed.toString();
    }

    detectCurrencyFromText(value) {
      if (!value) {
        return null;
      }

      const text = String(value);
      for (const [symbol, currency] of Object.entries(priceCurrencyMap)) {
        if (text.includes(symbol)) {
          return currency;
        }
      }

      return null;
    }

    isAmazonPage() {
      return this.currentHostname.toLowerCase().includes('amazon.');
    }

    detectCurrencyFromHostname() {
      const hostname = this.currentHostname.toLowerCase();
      const map = {
        'amazon.com': 'USD',
        'amazon.ca': 'CAD',
        'amazon.co.uk': 'GBP',
        'amazon.de': 'EUR',
        'amazon.fr': 'EUR',
        'amazon.it': 'EUR',
        'amazon.es': 'EUR',
        'amazon.com.au': 'AUD',
        'etsy.com': 'USD',
        'ebay.com': 'USD',
        'walmart.com': 'USD',
        'target.com': 'USD',
        'bestbuy.com': 'USD'
      };

      return map[hostname] || 'USD';
    }

    extractWebsiteName() {
      return this.currentHostname.replace(/^www\./i, '');
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

      if (value.startsWith('/')) {
        return `${this.currentOrigin}${value}`;
      }

      if (value.startsWith('http://')) {
        return value.replace(/^http:\/\//i, 'https://');
      }

      if (/^https?:\/\//i.test(value)) {
        return value;
      }

      try {
        return new URL(value, this.currentUrl).toString();
      } catch (error) {
        return null;
      }
    }

    cleanText(value) {
      if (value === null || value === undefined) {
        return null;
      }

      const cleaned = String(value).replace(/\s+/g, ' ').trim();
      return cleaned || null;
    }

    delay(ms) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });
    }
  }

  namespace.ProductScraper = ProductScraper;
  global.UniversalProductBoard = namespace;
})(typeof globalThis !== 'undefined' ? globalThis : self);
