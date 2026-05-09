// Shared theme handling for Universal Product Board.
(function initSharedTheme(global) {
  const namespace = global.UniversalProductBoard || {};
  const STORAGE_KEYS = namespace.STORAGE_KEYS;
  const DEFAULT_SETTINGS = namespace.DEFAULT_SETTINGS;

  if (!STORAGE_KEYS || !DEFAULT_SETTINGS) {
    throw new Error('UniversalProductBoard constants must load before theme');
  }

  const THEME_VALUES = new Set(['system', 'light', 'dark']);
  const mediaQuery = typeof global.matchMedia === 'function'
    ? global.matchMedia('(prefers-color-scheme: dark)')
    : null;
  const root = document.documentElement;

  let removeSystemListener = null;

  function normalizeTheme(theme) {
    if (typeof theme !== 'string') {
      return DEFAULT_SETTINGS.theme;
    }

    const normalized = theme.toLowerCase();
    return THEME_VALUES.has(normalized) ? normalized : DEFAULT_SETTINGS.theme;
  }

  function resolveAppliedTheme(theme) {
    const normalized = normalizeTheme(theme);

    if (normalized === 'dark' || normalized === 'light') {
      return normalized;
    }

    return mediaQuery?.matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const resolvedTheme = resolveAppliedTheme(theme);
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    return resolvedTheme;
  }

  async function getStoredTheme() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const storedSettings = result?.[STORAGE_KEYS.SETTINGS] || {};
    return normalizeTheme(storedSettings.theme);
  }

  function syncSystemListener(theme) {
    if (removeSystemListener) {
      removeSystemListener();
      removeSystemListener = null;
    }

    if (theme !== 'system' || !mediaQuery) {
      return;
    }

    const handleChange = () => {
      applyTheme('system');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      removeSystemListener = () => mediaQuery.removeEventListener('change', handleChange);
      return;
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      removeSystemListener = () => mediaQuery.removeListener(handleChange);
    }
  }

  async function applyStoredTheme() {
    const theme = await getStoredTheme();
    applyTheme(theme);
    syncSystemListener(theme);
    return theme;
  }

  namespace.themeManager = {
    normalizeTheme,
    resolveAppliedTheme,
    applyTheme,
    applyStoredTheme,
    syncSystemListener
  };

  global.UniversalProductBoard = namespace;

  applyTheme(DEFAULT_SETTINGS.theme);
  void applyStoredTheme();
})(typeof globalThis !== 'undefined' ? globalThis : self);
