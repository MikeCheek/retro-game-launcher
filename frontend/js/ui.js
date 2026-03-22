// UI Controller - handles all UI interactions

const ui = {
  currentRom: null,
  currentView: 'menu',
  saveSlotMenu: null,
  loadSlotMenu: null,
  isStartingGame: false,
  pendingResumeResolver: null,
  autosavePreferenceKey: 'autosaveEnabled',
  autosaveEnabled: false,
  autosavePreferenceKnown: false,
  autosaveIntervalMs: 60_000,
  autosaveSlotNumber: 0,
  autosaveTimerId: null,

  setStatus(message) {
    const statusLine = document.getElementById('statusLine');
    if (statusLine && typeof message === 'string' && message.trim()) {
      statusLine.textContent = message;
    }
  },

  initAutosaveSettings() {
    const raw = localStorage.getItem(this.autosavePreferenceKey);
    if (raw === 'true' || raw === 'false') {
      this.autosaveEnabled = raw === 'true';
      this.autosavePreferenceKnown = true;
    }

    const toggle = document.getElementById('autosaveToggle');
    if (toggle) {
      toggle.checked = this.autosaveEnabled;
      toggle.addEventListener('change', (event) => {
        this.setAutosaveEnabled(Boolean(event.target.checked), { persist: true, notify: true });
      });
    }
  },

  async ensureAutosavePreference() {
    if (this.autosavePreferenceKnown) {
      return;
    }

    const wantsAutosave = window.confirm(
      'Enable autosave every 1 minute while you play?\n\nYou can change this anytime from the in-game menu.',
    );

    this.autosavePreferenceKnown = true;
    this.setAutosaveEnabled(wantsAutosave, { persist: true, notify: true });
  },

  setAutosaveEnabled(enabled, options = {}) {
    const { persist = true, notify = false } = options;
    this.autosaveEnabled = Boolean(enabled);
    this.syncAutosaveToggleUI();

    if (persist) {
      localStorage.setItem(this.autosavePreferenceKey, String(this.autosaveEnabled));
      this.autosavePreferenceKnown = true;
    }

    if (this.autosaveEnabled) {
      this.startAutosaveTimer();
    } else {
      this.stopAutosaveTimer();
    }

    if (notify) {
      showNotification(
        this.autosaveEnabled ? 'Autosave enabled (every 1 minute)' : 'Autosave disabled',
        this.autosaveEnabled ? 'success' : 'info',
      );
    }
  },

  syncAutosaveToggleUI() {
    const toggle = document.getElementById('autosaveToggle');
    if (toggle) {
      toggle.checked = this.autosaveEnabled;
    }
  },

  startAutosaveTimer() {
    this.stopAutosaveTimer();

    if (!this.autosaveEnabled) {
      return;
    }

    if (!emulator.isRunning || this.currentView !== 'player') {
      return;
    }

    this.autosaveTimerId = window.setInterval(async () => {
      if (!this.autosaveEnabled || !emulator.isRunning || this.currentView !== 'player' || emulator.isPaused) {
        return;
      }

      const saved = await emulator.saveState(this.autosaveSlotNumber, { silent: true });
      if (saved) {
        this.setStatus('AUTOSAVE COMPLETE // SLOT 0 UPDATED');
      }
    }, this.autosaveIntervalMs);
  },

  stopAutosaveTimer() {
    if (this.autosaveTimerId) {
      window.clearInterval(this.autosaveTimerId);
      this.autosaveTimerId = null;
    }
  },

  switchView(viewName) {
    // Normalize logical names to actual DOM ids
    const viewIdMap = {
      menu: 'mainView',
      library: 'libraryView',
      player: 'playerView',
    };

    const targetId = viewIdMap[viewName] || `${viewName}View`;

    // Hide all views
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.add('hidden');
      v.classList.remove('active');
    });

    // Show requested view
    const view = document.getElementById(targetId);
    if (view) {
      view.classList.remove('hidden');
      view.classList.add('active');
      this.currentView = viewName;
      const statusByView = {
        menu: 'READY // PRESS START OR OPEN LIBRARY',
        library: 'LIBRARY ONLINE // SELECT A CARTRIDGE',
        player: 'PLAY MODE ACTIVE // INPUT ROUTED TO EMULATOR',
      };
      this.setStatus(statusByView[viewName] || 'SYSTEM READY');
      console.log('Switched to view:', viewName);
    } else {
      console.warn('View not found:', viewName, '->', targetId);
    }
  },

  async loadLibrary() {
    try {
      const roms = await api.getRoms();
      if (roms === null) {
        const grid = document.getElementById('gamesGrid');
        if (grid) {
          grid.innerHTML =
            '<p class="pixel-text" style="grid-column: 1 / -1; text-align: center; padding: 40px;">LIBRARY OFFLINE. START THE SERVER AND REFRESH.</p>';
        }
        this.updateRomCount(0);
        this.setStatus('LIBRARY OFFLINE // API UNREACHABLE');
        return;
      }

      this.displayRoms(roms);
      this.updateRomCount(roms.length);
      this.setStatus(`LIBRARY SYNCED // ${roms.length} GAME${roms.length === 1 ? '' : 'S'} AVAILABLE`);
    } catch (err) {
      console.error('Error loading library:', err);
      this.setStatus('LIBRARY ERROR // COULD NOT LOAD CATALOG');
      showNotification('Failed to load game library', 'error');
    }
  },

  displayRoms(roms) {
    const grid = document.getElementById('gamesGrid');
    grid.innerHTML = '';

    if (!roms || roms.length === 0) {
      grid.innerHTML =
        '<p class="pixel-text" style="grid-column: 1 / -1; text-align: center; padding: 40px;">NO GAMES IN LIBRARY. UPLOAD A ROM TO START!</p>';
      return;
    }

    roms.forEach((rom) => {
      const card = this.createGameCard(rom);
      grid.appendChild(card);
    });
  },

  createGameCard(rom) {
    const card = document.createElement('div');
    card.className = 'game-card';

    // Create local SVG placeholder if no cover image
    const placeholderSvg = this.createPlaceholderImage(rom.game_type);
    const imgSrc = rom.cover_image || placeholderSvg;

    card.innerHTML = `
            <img src="${imgSrc}" alt="${rom.title}">
            <div class="game-card-title" title="${rom.title}">${rom.title}</div>
            <small style="color: var(--color-accent); font-size: 11px;">${rom.game_type}</small>
        `;

    card.addEventListener('click', () => {
      this.selectRom(rom);
      playSoundEffect('select');
    });

    return card;
  },

  createPlaceholderImage(gameType) {
    // Create a local SVG placeholder instead of using external URLs
    const colors = {
      NES: '#FF1744',
      SNES: '#9C27B0',
      Genesis: '#00BCD4',
      'Game Boy': '#4CAF50',
      'Game Boy Advance': '#FF9800',
      N64: '#2196F3',
      GameCube: '#F44336',
      PlayStation: '#1A73E8',
      Arcade: '#FFC107',
    };

    const color = colors[gameType] || '#00D4FF';
    const label = gameType.substring(0, 6); // Shorten label for space

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100">
      <rect width="120" height="100" fill="#1a1a2e"/>
      <rect width="120" height="100" fill="${color}" opacity="0.2"/>
      <text x="60" y="45" font-family="monospace" font-size="12" fill="${color}" text-anchor="middle" font-weight="bold">${label}</text>
      <text x="60" y="65" font-family="monospace" font-size="10" fill="${color}" text-anchor="middle" opacity="0.7">ROM</text>
    </svg>`;

    return 'data:image/svg+xml;base64,' + btoa(svg);
  },

  selectRom(rom) {
    this.currentRom = rom;
    document.getElementById('gameTitle').textContent = rom.title;
    this.setStatus(`SELECTED // ${rom.title.toUpperCase()}`);
    console.log('ROM selected:', rom.title);
  },

  updateRomCount(count) {
    document.getElementById('romCount').textContent = count;
  },

  // Upload Modal
  setupUploadModal() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.handleFileUpload(e.target.files[0]);
      }
    });
  },

  async handleFileUpload(file) {
    try {
      const uploadProgress = document.getElementById('uploadProgress');
      const progressFill = document.getElementById('progressFill');
      const uploadStatus = document.getElementById('uploadStatus');

      uploadProgress.removeAttribute('hidden');

      const result = await api.uploadRom(file, (percent) => {
        progressFill.style.width = percent + '%';
        uploadStatus.textContent = `Uploading: ${Math.round(percent)}%`;
      });

      uploadStatus.textContent = 'Upload successful!';
      showNotification('ROM uploaded successfully!', 'success');

      setTimeout(() => {
        closeUploadModal();
        this.loadLibrary();
      }, 1000);
    } catch (err) {
      console.error('Upload error:', err);
      showNotification('Upload failed: ' + err.message, 'error');
    }
  },

  // Save/Load Slot Menus
  async setupSaveSlotMenu() {
    if (!this.currentRom) return;

    const container = document.getElementById('saveSlotsContainer');
    container.innerHTML = '';

    const saves = await api.getSaveStates(this.currentRom.id);
    const saveMap = {};
    saves.forEach((s) => (saveMap[s.slot_number] = s));

    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement('button');
      btn.className = 'slot-button' + (saveMap[i] ? ' filled' : '');
      btn.innerHTML = `Slot ${i}` + (saveMap[i] ? '<br><small>' + formatDate(saveMap[i].updated_at) + '</small>' : '');
      btn.onclick = () => {
        emulator.saveState(i);
        ui.toggleSaveMenu();
      };
      container.appendChild(btn);
    }
  },

  async setupLoadSlotMenu() {
    if (!this.currentRom) return;

    const container = document.getElementById('loadSlotsContainer');
    container.innerHTML = '';

    const saves = await api.getSaveStates(this.currentRom.id);

    for (let i = 1; i <= 9; i++) {
      const save = saves.find((s) => s.slot_number === i);
      const btn = document.createElement('button');
      btn.className = 'slot-button' + (save ? ' filled' : '');
      btn.innerHTML = `Slot ${i}` + (save ? '<br><small>' + formatDate(save.updated_at) + '</small>' : '');
      btn.disabled = !save;
      btn.onclick = () => {
        if (save) {
          emulator.loadState(i);
          ui.toggleLoadMenu();
        }
      };
      container.appendChild(btn);
    }
  },

  toggleSaveMenu() {
    const menu = document.getElementById('saveSlotMenu');
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
      this.setupSaveSlotMenu();
      menu.classList.remove('hidden');
    } else {
      menu.classList.add('hidden');
    }
  },

  toggleLoadMenu() {
    const menu = document.getElementById('loadSlotMenu');
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
      this.setupLoadSlotMenu();
      menu.classList.remove('hidden');
    } else {
      menu.classList.add('hidden');
    }
  },

  toggleGameOverlayMenu() {
    const overlay = document.getElementById('gameOverlayMenu');
    if (!overlay) return;

    const isHidden = overlay.classList.contains('hidden');
    if (isHidden) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  },

  closeGameOverlayMenu() {
    const overlay = document.getElementById('gameOverlayMenu');
    if (!overlay) return;
    overlay.classList.add('hidden');
  },

  async promptResumeChoice() {
    if (!this.currentRom) {
      return { mode: 'cancel' };
    }

    const saves = await api.getSaveStates(this.currentRom.id);
    const manualSaves = (saves || []).filter((save) => save.slot_number >= 1);
    if (manualSaves.length === 0) {
      return { mode: 'new' };
    }

    const modal = document.getElementById('resumePromptModal');
    const container = document.getElementById('resumeSlotsContainer');
    if (!modal || !container) {
      return { mode: 'new' };
    }

    container.innerHTML = '';
    manualSaves
      .sort((a, b) => a.slot_number - b.slot_number)
      .forEach((save) => {
        const btn = document.createElement('button');
        btn.className = 'resume-slot-btn';
        btn.innerHTML = `SLOT ${save.slot_number}<span class="resume-slot-meta">${formatDate(save.updated_at)}</span>`;
        btn.onclick = () => {
          this.resolveResumePrompt({ mode: 'load', slotNumber: save.slot_number });
        };
        container.appendChild(btn);
      });

    modal.classList.remove('hidden');

    modal.onclick = (event) => {
      if (event.target === modal) {
        this.resolveResumePrompt({ mode: 'cancel' });
      }
    };

    return new Promise((resolve) => {
      this.pendingResumeResolver = resolve;
    });
  },

  resolveResumePrompt(result) {
    const modal = document.getElementById('resumePromptModal');
    if (modal) {
      modal.classList.add('hidden');
    }

    if (this.pendingResumeResolver) {
      this.pendingResumeResolver(result);
      this.pendingResumeResolver = null;
    }
  },

  // Settings Modal
  async setupSettingsModal() {
    const deviceId = document.getElementById('deviceId');
    const deviceName = document.getElementById('deviceName');

    deviceId.value = getOrCreateDeviceId();
    deviceName.value = localStorage.getItem('deviceName') || 'My Device';

    // Load stats
    const stats = await api.getUserStats();
    if (stats) {
      document.getElementById('statTotalRoms').textContent = `Total ROMs: ${stats.total_roms}`;
      document.getElementById('statTotalSize').textContent =
        `Total Size: ${formatFileSize(stats.total_size * 1024 * 1024)}`;
      document.getElementById('statTotalSaves').textContent = `Total Saves: ${stats.total_saves}`;
    }

    deviceName.addEventListener('change', () => {
      localStorage.setItem('deviceName', deviceName.value);
    });
  },

  // Search
  setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const debouncedSearch = debounce(async (query) => {
      if (query.length < 2) {
        this.loadLibrary();
        return;
      }
      const results = await api.searchRoms(query);
      this.displayRoms(results);
    }, 300);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  },

  // Keyboard controls
  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
          if (this.currentView === 'menu') {
            this.startGame();
          }
          break;
        case ' ':
          if (this.currentView === 'player') {
            if (emulator.isPaused) {
              emulator.resume();
            } else {
              emulator.pause();
            }
          }
          break;
        case 'Escape':
          if (this.currentView === 'player') {
            this.backToLibrary();
          }
          break;
      }
    });
  },

  async startGame() {
    if (!this.currentRom) {
      this.switchView('library');
      showNotification('Select a game from the library first', 'info');
      return;
    }

    if (this.isStartingGame) {
      return;
    }

    if (emulator.isRunning && emulator.currentRomId === this.currentRom.id && this.currentView === 'player') {
      return;
    }

    this.isStartingGame = true;

    try {
      await this.ensureAutosavePreference();

      const resumeChoice = await this.promptResumeChoice();
      if (!resumeChoice || resumeChoice.mode === 'cancel') {
        this.setStatus('LAUNCH CANCELED // AWAITING COMMAND');
        return;
      }

      const loadSlotNumber = resumeChoice.mode === 'load' ? resumeChoice.slotNumber : null;

      this.switchView('player');
      this.closeGameOverlayMenu();
      playSoundEffect('select');
      console.log('Starting game:', this.currentRom.title);
      this.setStatus(`BOOTING // ${this.currentRom.title.toUpperCase()}`);

      showNotification('Loading ROM...', 'info');

      // Fetch the ROM file from the server
      const response = await fetch(`/api/roms/${this.currentRom.id}/file`);
      if (!response.ok) {
        throw new Error('Failed to download ROM');
      }

      const blob = await response.blob();

      // Create a File object from the blob
      const romFile = new File([blob], this.currentRom.filename, { type: 'application/octet-stream' });

      // Load ROM into emulator
      const loaded = await emulator.loadRom(this.currentRom.id, romFile);

      if (loaded) {
        this.setStatus(`RUNNING // ${this.currentRom.title.toUpperCase()}`);
        showNotification(`Now playing: ${this.currentRom.title}`, 'success');
        this.syncAutosaveToggleUI();
        this.startAutosaveTimer();

        if (loadSlotNumber) {
          this.setStatus(`RESTORING SLOT ${loadSlotNumber} // ${this.currentRom.title.toUpperCase()}`);
          showNotification(`Restoring save slot ${loadSlotNumber}...`, 'info');
          const restored = await emulator.loadState(loadSlotNumber);
          if (!restored) {
            this.setStatus(`RUNNING // ${this.currentRom.title.toUpperCase()} (FRESH)`);
            showNotification(`Could not load slot ${loadSlotNumber}. Started fresh.`, 'info');
          } else {
            this.setStatus(`RUNNING // ${this.currentRom.title.toUpperCase()} (SLOT ${loadSlotNumber})`);
          }
        }
      } else {
        this.setStatus('EMULATOR ERROR // RETURNING TO LIBRARY');
        showNotification('Failed to load emulator', 'error');
        this.backToLibrary();
      }
    } catch (err) {
      console.error('Game start error:', err);
      this.setStatus('BOOT ERROR // RETURNING TO LIBRARY');
      showNotification('Failed to start game: ' + err.message, 'error');
      this.backToLibrary();
    } finally {
      this.isStartingGame = false;
    }
  },

  backToLibrary() {
    this.stopAutosaveTimer();
    emulator.stop();
    this.closeGameOverlayMenu();
    this.switchView('library');
    this.setStatus('SESSION CLOSED // BACK IN LIBRARY');
    playSoundEffect('select');
  },
};

// Global UI functions
function toggleLibrary() {
  if (ui.currentView !== 'library') {
    ui.switchView('library');
    ui.loadLibrary();
  } else {
    ui.switchView('menu');
  }
  playSoundEffect('select');
}

function openUploadModal() {
  document.getElementById('uploadModal').classList.remove('hidden');
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.add('hidden');
  document.getElementById('fileInput').value = '';
  document.getElementById('uploadProgress').setAttribute('hidden', '');
  document.getElementById('progressFill').style.width = '0%';
}

function openSettingsModal() {
  ui.setupSettingsModal();
  document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function toggleSaveMenu() {
  ui.toggleSaveMenu();
}

function toggleLoadMenu() {
  ui.toggleLoadMenu();
}

function startGame() {
  ui.startGame();
}

function backToLibrary() {
  ui.backToLibrary();
}

function toggleGameOverlayMenu() {
  ui.toggleGameOverlayMenu();
}

function closeResumePrompt() {
  ui.resolveResumePrompt({ mode: 'cancel' });
}

function startNewGameFromPrompt() {
  ui.resolveResumePrompt({ mode: 'new' });
}

function handleDpadInput(direction) {
  console.log('D-Pad:', direction);
  playSoundEffect('select');
}
