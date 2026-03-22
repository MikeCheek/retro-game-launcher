// Emulator integration and WebAssembly emulator support
// This uses JSNES (NES emulator) and other web-based emulators

const emulator = {
  currentInstance: null,
  currentRomId: null,
  currentGameId: null,
  canvas: null,
  host: null,
  ctx: null,
  isRunning: false,
  isPaused: false,
  saveStates: {},
  currentBlobUrl: null,
  activeCore: null,
  isCoreStarted: false,
  coreStartPromise: null,
  coreStartResolve: null,

  coreMap: {
    nes: 'nes',
    smc: 'snes',
    snes: 'snes',
    gen: 'segaMD',
    md: 'segaMD',
    gb: 'gb',
    gbc: 'gbc',
    gba: 'gba',
    n64: 'n64',
    z64: 'n64',
    v64: 'n64',
  },

  async init() {
    this.canvas = document.getElementById('gameCanvas');
    this.host = document.getElementById('emulatorHost');
    this.ctx = this.canvas.getContext('2d');

    // Load emulator libraries dynamically
    await this.loadEmulatorLibraries();
  },

  async loadEmulatorLibraries() {
    // In a real implementation, you would load different emulator libraries based on ROM type
    // For now, placeholder for various emulator options:
    // - JSNES (NES games)
    // - similar emulators for SNES, Genesis, Game Boy, etc.

    console.log('Emulator libraries prepared for loading');
  },

  async loadRom(romId, romFile) {
    try {
      this.currentRomId = romId;

      // Detect ROM type
      const ext = getFileExtension(romFile.name).toLowerCase();
      const core = this.coreMap[ext];

      if (!core) {
        this.showCanvasFallback();
        this.drawMessage('UNSUPPORTED ROM\nFORMAT', `${ext.toUpperCase()} is not configured`);
        showNotification(`Unsupported ROM extension: .${ext}`, 'error');
        return false;
      }

      // Initialize appropriate emulator based on file type
      await this.initializeEmulatorForType(ext, romFile, core);

      this.isRunning = true;
      this.isPaused = false;
      this.activeCore = core;
      this.currentGameId = `${this.currentRomId || 'rom'}-${core}`;

      // Load save states for this ROM
      await this.loadSaveStatesForRom(romId);

      return true;
    } catch (err) {
      console.error('Error loading ROM:', err);
      showNotification('Failed to load ROM: ' + err.message, 'error');
      return false;
    }
  },

  async initializeEmulatorForType(fileType, romFile, core) {
    console.log(`Initializing ${fileType} (${core}) emulator with ROM:`, romFile.name);

    try {
      await this.loadWithEmulatorJS(romFile, core);
    } catch (err) {
      console.error('EmulatorJS load failed:', err);
      this.showCanvasFallback();
      this.drawMessage('EMULATOR CORE\nFAILED TO LOAD', `${fileType.toUpperCase()} / ${core}`);
      throw new Error('Emulator core failed to load (network/core issue)');
    }
  },

  showCanvasFallback() {
    if (this.host) {
      this.host.classList.add('hidden');
      this.host.innerHTML = '';
    }
    if (this.canvas) {
      this.canvas.classList.remove('hidden');
    }
  },

  async loadWithEmulatorJS(romFile, core) {
    if (!this.host) {
      throw new Error('Emulator host element not found');
    }

    // Cleanup previous session
    this.stopExternalEmulator();

    this.currentBlobUrl = URL.createObjectURL(romFile);

    // Switch to embedded emulator host
    this.canvas.classList.add('hidden');
    this.host.classList.remove('hidden');
    this.host.innerHTML = '';

    this.isCoreStarted = false;
    this.coreStartPromise = new Promise((resolve) => {
      this.coreStartResolve = resolve;
    });

    await new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'ejs-frame';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.setAttribute('allow', 'autoplay; fullscreen');

      const gameId = `${this.currentRomId || 'rom'}-${core}`;
      const gameName = `rom-${this.currentRomId || 'unknown'}-${core}`;
      const srcDoc = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body, #game { margin: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script>
      window.EJS_player = '#game';
      window.EJS_core = '${core}';
      window.EJS_gameUrl = '${this.currentBlobUrl}';
      window.EJS_gameID = '${gameId}';
      window.EJS_gameName = '${gameName}';
      window.EJS_language = 'en-US';
      window.EJS_disableLocalStorage = true;
      window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
      window.EJS_startOnLoaded = true;
      window.EJS_onGameStart = function () {
        try {
          window.parent.postMessage({ type: 'EJS_GAME_STARTED', gameId: '${gameId}' }, '*');
        } catch (e) {
          // no-op
        }
      };
    </script>
    <script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script>
  </body>
</html>`;

      const onMessage = (event) => {
        if (event.source !== iframe.contentWindow) return;
        if (!event.data || event.data.type !== 'EJS_GAME_STARTED') return;
        if (event.data.gameId !== gameId) return;

        this.isCoreStarted = true;
        if (this.coreStartResolve) {
          this.coreStartResolve(true);
          this.coreStartResolve = null;
        }
        window.removeEventListener('message', onMessage);
      };

      window.addEventListener('message', onMessage);

      const timeout = window.setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('EmulatorJS frame load timeout'));
      }, 20000);

      iframe.onload = () => {
        window.clearTimeout(timeout);
        resolve();
      };

      iframe.srcdoc = srcDoc;
      this.host.appendChild(iframe);
    });
  },

  async waitForCoreStart(timeoutMs = 15000) {
    if (this.isCoreStarted) return true;
    if (!this.coreStartPromise) return false;

    const startedBySignal = await Promise.race([
      this.coreStartPromise.then(() => true),
      new Promise((resolve) => {
        window.setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);

    if (startedBySignal) {
      return true;
    }

    // Fallback: poll for gameManager readiness in case onGameStart hook was missed
    const deadline = Date.now() + 3333;
    while (Date.now() < deadline) {
      const frameWin = this.getEmulatorFrameWindow();
      if (frameWin?.EJS_emulator?.gameManager) {
        this.isCoreStarted = true;
        return true;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    return false;
  },

  stopExternalEmulator() {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    if (this.host) {
      this.host.innerHTML = '';
      this.host.classList.add('hidden');
    }

    this.isCoreStarted = false;
    this.coreStartPromise = null;
    this.coreStartResolve = null;

    if (this.canvas) {
      this.canvas.classList.remove('hidden');
    }
  },

  getEmulatorFrameWindow() {
    const frame = this.host ? this.host.querySelector('#ejs-frame') : null;
    if (!frame || !frame.contentWindow) return null;
    return frame.contentWindow;
  },

  uint8ArrayToBase64(uint8) {
    if (!uint8 || !uint8.length) return '';
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const chunk = uint8.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  },

  base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  drawMessage(message, subtitle) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Fill background
    this.ctx.fillStyle = '#0f3460';
    this.ctx.fillRect(0, 0, w, h);

    // Draw text
    this.ctx.fillStyle = '#00D4FF';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const lines = message.split('\n');
    const startY = h / 2 - (lines.length * 30) / 2;

    lines.forEach((line, i) => {
      this.ctx.fillText(line, w / 2, startY + i * 30);
    });

    if (subtitle) {
      this.ctx.font = '16px Arial';
      this.ctx.fillText(subtitle, w / 2, h - 40);
    }
  },

  async loadSaveStatesForRom(romId) {
    try {
      this.saveStates[romId] = await api.getSaveStates(romId);
    } catch (err) {
      console.error('Error loading save states:', err);
    }
  },

  async saveState(slotNumber, options = {}) {
    if (!this.currentRomId) return false;

    const { silent = false } = options;

    try {
      // Capture current emulator state
      const stateData = this.getCurrentStateData();
      const screenshot = await this.takeScreenshot();

      if (!stateData) {
        if (!silent) {
          showNotification('Emulator state is not ready yet. Try again in a moment.', 'error');
        }
        return false;
      }

      // Save to server
      await api.saveSaveState(this.currentRomId, slotNumber, stateData, screenshot);

      if (!silent) {
        showNotification(`Game saved to slot ${slotNumber}`, 'success');
      }
      return true;
    } catch (err) {
      console.error('Error saving state:', err);
      if (!silent) {
        showNotification('Failed to save game state', 'error');
      }
      return false;
    }
  },

  async loadState(slotNumber) {
    if (!this.currentRomId) return false;

    try {
      const started = await this.waitForCoreStart();
      if (!started) {
        showNotification('Emulator is still starting. Try loading again in a moment.', 'info');
        return false;
      }

      const saveState = await api.getSaveState(this.currentRomId, slotNumber);

      if (!saveState || !saveState.state_data) {
        showNotification('Save slot is empty', 'error');
        return false;
      }

      // Restore emulator state
      this.restoreStateData(saveState.state_data);

      showNotification(`Game loaded from slot ${slotNumber}`, 'success');
      return true;
    } catch (err) {
      console.error('Error loading state:', err);
      showNotification('Failed to load game state', 'error');
      return false;
    }
  },

  restoreStateData(stateData) {
    try {
      const parsed = typeof stateData === 'string' ? JSON.parse(stateData) : stateData;

      // EmulatorJS-integrated save format
      if (parsed && parsed.version === 'ejs-state-v1' && parsed.stateBase64) {
        const frameWin = this.getEmulatorFrameWindow();
        const gameManager = frameWin?.EJS_emulator?.gameManager;

        if (!gameManager || typeof gameManager.loadState !== 'function') {
          throw new Error('EmulatorJS instance not ready for loadState');
        }

        const stateBytes = this.base64ToUint8Array(parsed.stateBase64);
        gameManager.loadState(stateBytes);
        return;
      }

      // Fallback for legacy placeholder states
      console.log('Restoring legacy state:', stateData);
    } catch (err) {
      console.error('Failed to restore state:', err);
      throw err;
    }
  },

  async takeScreenshot() {
    try {
      const frameWin = this.getEmulatorFrameWindow();
      const gameManager = frameWin?.EJS_emulator?.gameManager;

      if (gameManager && typeof gameManager.screenshot === 'function') {
        const pngBytes = await gameManager.screenshot();
        if (pngBytes && pngBytes.length) {
          const blob = new Blob([pngBytes], { type: 'image/png' });
          return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result || null);
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch (err) {
      console.warn('Failed to capture EmulatorJS screenshot, falling back to canvas:', err);
    }

    // Fallback screenshot from canvas
    return this.canvas.toDataURL('image/png');
  },

  pause() {
    this.isPaused = true;
    showNotification('Game paused', 'info');
  },

  resume() {
    this.isPaused = false;
    showNotification('Game resumed', 'info');
  },

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentInstance = null;
    this.currentRomId = null;
    this.currentGameId = null;
    this.activeCore = null;

    this.stopExternalEmulator();

    // Clear canvas
    this.ctx.fillStyle = '#0f3460';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  },

  handleInput(input) {
    // Handle input from keyboard, gamepad, or touch
    // This method is called by the InputManager
    if (!this.isRunning || this.isPaused) return;

    switch (input) {
      case 'up':
      case 'down':
      case 'left':
      case 'right':
      case 'a':
      case 'b':
      case 'x':
      case 'y':
      case 'start':
      case 'select':
        // In a real emulator, you would send this to the emulator core
        // For now, just log it
        console.log(`Input: ${input}`);
        break;
      default:
        console.warn(`Unknown input: ${input}`);
    }
  },

  getCurrentStateData() {
    try {
      const frameWin = this.getEmulatorFrameWindow();
      const gameManager = frameWin?.EJS_emulator?.gameManager;

      // EmulatorJS-integrated save format
      if (gameManager && typeof gameManager.getState === 'function') {
        const stateBytes = gameManager.getState();
        if (!stateBytes || !stateBytes.length) {
          return null;
        }

        return JSON.stringify({
          version: 'ejs-state-v1',
          core: this.activeCore,
          gameId: this.currentGameId,
          timestamp: Date.now(),
          stateBase64: this.uint8ArrayToBase64(stateBytes),
        });
      }

      // Legacy fallback
      return JSON.stringify({
        version: 'legacy-state-v1',
        timestamp: Date.now(),
        romId: this.currentRomId,
        state: 'game_state_data',
      });
    } catch (err) {
      console.error('Failed to capture current state:', err);
      return null;
    }
  },

  getControllerState() {
    // Map keyboard keys to controller buttons
    return {
      up: isKeyPressed('ArrowUp') || isKeyPressed('w'),
      down: isKeyPressed('ArrowDown') || isKeyPressed('s'),
      left: isKeyPressed('ArrowLeft') || isKeyPressed('a'),
      right: isKeyPressed('ArrowRight') || isKeyPressed('d'),
      a: isKeyPressed('z') || isKeyPressed('Enter'),
      b: isKeyPressed('x') || isKeyPressed('Escape'),
      x: isKeyPressed('c'),
      y: isKeyPressed('v'),
      start: isKeyPressed('Enter'),
      select: isKeyPressed('Shift'),
    };
  },

  async handleScreenshot() {
    const image = await this.takeScreenshot();
    const link = document.createElement('a');
    link.href = image;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();
  },
};

// Initialize emulator when page loads
document.addEventListener('DOMContentLoaded', () => {
  emulator.init();
});
