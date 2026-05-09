// Universal Product Board options page logic.
class OptionsController {
  constructor() {
    this.storage = UniversalProductBoard.storageManager;
    this.elements = {
      themeSelect: document.getElementById('theme-select'),
      notifications: document.getElementById('show-notifications'),
      donationReminders: document.getElementById('show-donation-reminders'),
      exportButton: document.getElementById('export-button'),
      importFile: document.getElementById('import-file'),
      clearButton: document.getElementById('clear-button'),
      statusMessage: document.getElementById('status-message'),
      statsText: document.getElementById('stats-text')
    };
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadSettings();
    await this.refreshStats();
  }

  bindEvents() {
    this.elements.themeSelect.addEventListener('change', async () => {
      await this.handleThemeChange();
    });

    this.elements.notifications.addEventListener('change', async () => {
      await this.handleNotificationsToggle();
    });

    this.elements.donationReminders.addEventListener('change', async () => {
      await this.handleDonationRemindersToggle();
    });

    this.elements.exportButton.addEventListener('click', async () => {
      await this.handleExport();
    });

    this.elements.importFile.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      await this.handleImport(file);
      event.target.value = '';
    });

    this.elements.clearButton.addEventListener('click', async () => {
      await this.handleClearProducts();
    });
  }

  async loadSettings() {
    try {
      const settings = await this.storage.getSettings();
      const notificationsGranted = await this.hasNotificationsPermission();

      if (settings.showNotifications && !notificationsGranted) {
        await this.storage.updateSettings({ showNotifications: false });
      }

      this.elements.themeSelect.value = settings.theme;
      this.elements.notifications.checked = settings.showNotifications && notificationsGranted;
      this.elements.donationReminders.checked = settings.showDonationReminders;
    } catch (error) {
      this.showStatus(`Could not load settings: ${error.message}`, 'error');
    }
  }

  async handleThemeChange() {
    const selectedTheme = this.elements.themeSelect.value;

    try {
      const updatedSettings = await this.storage.updateSettings({
        theme: selectedTheme
      });

      UniversalProductBoard.themeManager.applyTheme(updatedSettings.theme);
      UniversalProductBoard.themeManager.syncSystemListener(updatedSettings.theme);

      this.showStatus(`Theme updated to ${updatedSettings.theme}.`, 'success');
    } catch (error) {
      await this.loadSettings();
      this.showStatus(`Could not update theme: ${error.message}`, 'error');
    }
  }

  async handleNotificationsToggle() {
    const wantsNotifications = this.elements.notifications.checked;

    try {
      if (wantsNotifications) {
        const granted = await chrome.permissions.request({
          permissions: ['notifications']
        });

        if (!granted) {
          this.elements.notifications.checked = false;
          await this.storage.updateSettings({ showNotifications: false });
          this.showStatus('Chrome notification access was not granted.', 'warning');
          return;
        }

        await this.storage.updateSettings({ showNotifications: true });
        this.showStatus('Notifications enabled for saved products.', 'success');
        return;
      }

      const removed = await chrome.permissions.remove({
        permissions: ['notifications']
      });

      await this.storage.updateSettings({ showNotifications: false });

      if (removed) {
        this.showStatus('Notifications disabled.', 'success');
      } else {
        this.showStatus('Notifications were turned off in the extension settings.', 'warning');
      }
    } catch (error) {
      this.elements.notifications.checked = !wantsNotifications;
      this.showStatus(`Could not update notification access: ${error.message}`, 'error');
    }
  }

  async handleDonationRemindersToggle() {
    const showDonationReminders = this.elements.donationReminders.checked;

    try {
      await this.storage.updateSettings({ showDonationReminders });
      this.showStatus(
        showDonationReminders
          ? 'Weekly donation reminders enabled.'
          : 'Weekly donation reminders disabled.',
        'success'
      );
    } catch (error) {
      this.elements.donationReminders.checked = !showDonationReminders;
      this.showStatus(`Could not update donation reminders: ${error.message}`, 'error');
    }
  }

  async refreshStats() {
    try {
      const products = await this.storage.getProducts();
      this.elements.statsText.textContent = `${products.length} saved product${products.length === 1 ? '' : 's'} in local storage.`;
    } catch (error) {
      this.elements.statsText.textContent = 'Could not read storage statistics.';
    }
  }

  async handleExport() {
    try {
      const data = await this.storage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `universal-product-board-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      this.showStatus('Board data exported.', 'success');
    } catch (error) {
      this.showStatus(`Could not export data: ${error.message}`, 'error');
    }
  }

  async handleImport(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await this.storage.importData(parsed);
      await this.loadSettings();
      await this.refreshStats();
      const skippedCopy = result.productsSkipped
        ? ` Ignored ${result.productsSkipped} invalid entr${result.productsSkipped === 1 ? 'y' : 'ies'}.`
        : '';
      this.showStatus(
        `Imported ${result.productsImported} product${result.productsImported === 1 ? '' : 's'}.${skippedCopy}`,
        'success'
      );
    } catch (error) {
      this.showStatus(`Could not import data: ${error.message}`, 'error');
    }
  }

  async handleClearProducts() {
    const confirmed = window.confirm(
      'Clear all saved products from this browser? Settings will stay intact.'
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.storage.clearProducts();
      await this.refreshStats();
      this.showStatus('All saved products were removed.', 'warning');
    } catch (error) {
      this.showStatus(`Could not clear products: ${error.message}`, 'error');
    }
  }

  showStatus(message, type) {
    this.elements.statusMessage.hidden = false;
    this.elements.statusMessage.className = `status-message ${type}`;
    this.elements.statusMessage.textContent = message;
  }

  async hasNotificationsPermission() {
    return chrome.permissions.contains({
      permissions: ['notifications']
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.optionsController = new OptionsController();
  });
} else {
  window.optionsController = new OptionsController();
}
