// Main application initialization and orchestration

const app = {
  initialized: false,

  async init() {
    console.log('🎮 Retro Game Launcher initializing...');

    try {
      // Check server health
      const isHealthy = await api.healthCheck();
      if (!isHealthy) {
        console.error('Server is not responding');
        showNotification('Server connection failed', 'error');
        return;
      }

      // Initialize device session
      const deviceName = localStorage.getItem('deviceName') || `Device-${Date.now()}`;
      await api.createSession(deviceName);

      // Setup UI
      this.setupUI();

      // Setup event listeners
      this.setupEventListeners();

      // Load initial data
      await ui.loadLibrary();

      // End boot visual state after startup animation window
      setTimeout(() => {
        const appShell = document.getElementById('appShell');
        if (appShell) {
          appShell.classList.remove('booting');
        }
      }, 1900);

      ui.setStatus('SYSTEM READY // PRESS START');

      this.initialized = true;
      console.log('✓ Application initialized successfully');
      showNotification('Retro Game Launcher Ready! Press START', 'info');
    } catch (err) {
      console.error('Initialization error:', err);
      showNotification('Failed to initialize application', 'error');
    }
  },

  setupUI() {
    // Initialize upload modal
    ui.setupUploadModal();

    // Initialize touch controls show/hide toggle
    ui.initTouchControlsToggle();

    // Initialize autosave settings and toggle wiring
    ui.initAutosaveSettings();

    // Setup search
    ui.setupSearch();

    // Initialize Input Manager for unified input handling
    this.initializeInputManager();

    // Show initial view
    ui.switchView('menu');
  },

  initializeInputManager() {
    // Create input configuration
    const inputConfig = {
      onUp: () => emulator.isRunning && emulator.handleInput('up'),
      onDown: () => emulator.isRunning && emulator.handleInput('down'),
      onLeft: () => emulator.isRunning && emulator.handleInput('left'),
      onRight: () => emulator.isRunning && emulator.handleInput('right'),
      onA: () => emulator.isRunning && emulator.handleInput('a'),
      onB: () => emulator.isRunning && emulator.handleInput('b'),
      onSelect: () => {
        const playerView = document.getElementById('playerView');
        if (playerView?.classList.contains('active')) {
          toggleGameOverlayMenu();
        } else {
          toggleLibrary();
        }
      },
      onStart: () => {
        const playerView = document.getElementById('playerView');
        if (playerView?.classList.contains('active')) {
          emulator.handleInput('start');
        } else {
          startGame();
        }
      },
      onPause: () => {
        const playerView = document.getElementById('playerView');
        if (playerView?.classList.contains('active') && emulator.isRunning) {
          if (emulator.isPaused) {
            emulator.resume();
          } else {
            emulator.pause();
          }
        }
      },
      onSave: () => {
        const playerView = document.getElementById('playerView');
        if (playerView?.classList.contains('active')) {
          toggleSaveMenu();
        }
      },
      onLoad: () => {
        const playerView = document.getElementById('playerView');
        if (playerView?.classList.contains('active')) {
          toggleLoadMenu();
        }
      },
      onBack: () => {
        // Close modals first
        const uploadModal = document.getElementById('uploadModal');
        const settingsModal = document.getElementById('settingsModal');
        const gameOverlayMenu = document.getElementById('gameOverlayMenu');
        const playerView = document.getElementById('playerView');

        if (!uploadModal?.classList.contains('hidden')) {
          closeUploadModal();
        } else if (!settingsModal?.classList.contains('hidden')) {
          closeSettingsModal();
        } else if (
          playerView?.classList.contains('active') &&
          gameOverlayMenu &&
          !gameOverlayMenu.classList.contains('hidden')
        ) {
          toggleGameOverlayMenu();
        } else {
          backToLibrary();
        }
      },
    };

    // Initialize global input manager
    window.inputManager = new InputManager(inputConfig);
    console.log('✓ Input Manager initialized (keyboard, gamepad, touch)');
  },

  setupEventListeners() {
    // Modal close buttons
    document.addEventListener('click', (e) => {
      // Close upload modal on escape key
      if (e.key === 'Escape') {
        closeUploadModal();
        closeSettingsModal();
      }
    });

    // Window events
    window.addEventListener('beforeunload', () => {
      // Save settings on page unload
      this.saveSettings();
    });

    // Handle visibility change (pause/resume)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (emulator.isRunning && !emulator.isPaused) {
          emulator.pause();
        }
      } else {
        // Could auto-resume if needed
      }
    });

    // Add keyboard shortcuts help
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        this.showHelp();
      }
    });
  },

  saveSettings() {
    const settings = {
      lastView: ui.currentView,
      deviceName: document.getElementById('deviceName')?.value || localStorage.getItem('deviceName'),
      timestamp: Date.now(),
    };
    localStorage.setItem('appSettings', JSON.stringify(settings));
  },

  async restoreSettings() {
    const settings = localStorage.getItem('appSettings');
    if (settings) {
      try {
        const data = JSON.parse(settings);
        console.log('Restored settings:', data);
      } catch (err) {
        console.error('Error restoring settings:', err);
      }
    }
  },

  showHelp() {
    const helpText = `
🎮 RETRO GAME LAUNCHER - KEYBOARD SHORTCUTS

NAVIGATION:
  Enter / Start Button  - Play selected game / Confirm
  Escape / Back Button  - Back to previous screen
  Tab / Select Button   - Toggle library/menu

GAME CONTROLS:
  Arrow Keys / WASD     - D-Pad movement
  Z / Enter             - A Button (Action)
  X / Escape            - B Button (Back)
  C                     - X Button
  V                     - Y Button
  Space                 - Pause/Resume
  Alt+S                 - Take screenshot

OTHER:
  Ctrl+H                - Show this help
  Settings Button       - Access settings

Press OK to continue playing!
        `;
    console.log(helpText);
    alert(helpText);
  },

  async syncSaveStates() {
    // Cross-device sync functionality
    try {
      const deviceId = getOrCreateDeviceId();
      const sessions = await api.getSessions();

      console.log('Available devices:', sessions);

      // In production, you would:
      // 1. Detect new save states on backend
      // 2. Sync them to current device
      // 3. Merge conflicts based on timestamp
    } catch (err) {
      console.error('Error syncing save states:', err);
    }
  },

  // Export/Import functionality
  async exportLibrary() {
    try {
      const roms = await api.getRoms();
      const saves = await api.getAllSaveStates();

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        roms: roms,
        saveStates: saves,
        stats: await api.getUserStats(),
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `retro-launcher-backup-${Date.now()}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      showNotification('Library exported successfully', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showNotification('Failed to export library', 'error');
    }
  },

  async importLibrary(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.version !== '1.0') {
        throw new Error('Invalid backup file version');
      }

      console.log('Imported library data:', data);
      showNotification('Library imported successfully', 'success');

      // Could restore ROMs and save states here
    } catch (err) {
      console.error('Import error:', err);
      showNotification('Failed to import library', 'error');
    }
  },

  getAppStats() {
    return {
      romsLoaded: document.querySelectorAll('.game-card').length,
      currentGame: ui.currentRom?.title || 'None',
      sessionTime: Math.floor((Date.now() - (sessionStorage.getItem('sessionStart') || Date.now())) / 1000),
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A',
    };
  },
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    app.init();
    sessionStorage.setItem('sessionStart', Date.now());
  });
} else {
  app.init();
  sessionStorage.setItem('sessionStart', Date.now());
}

// Handle errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  const message = event?.error?.message || event?.message || 'Unknown error';
  showNotification('An error occurred: ' + message, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showNotification('An error occurred: ' + event.reason, 'error');
});
