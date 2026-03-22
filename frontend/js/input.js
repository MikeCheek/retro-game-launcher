/**
 * InputManager - Unified input handling for keyboard, gamepad, and touch
 * Detects device type and binds appropriate event handlers
 */
class InputManager {
  constructor(config = {}) {
    this.config = {
      onUp: config.onUp || (() => {}),
      onDown: config.onDown || (() => {}),
      onLeft: config.onLeft || (() => {}),
      onRight: config.onRight || (() => {}),
      onA: config.onA || (() => {}),
      onB: config.onB || (() => {}),
      onSelect: config.onSelect || (() => {}),
      onStart: config.onStart || (() => {}),
      onPause: config.onPause || (() => {}),
      onSave: config.onSave || (() => {}),
      onLoad: config.onLoad || (() => {}),
      onBack: config.onBack || (() => {}),
      ...config,
    };

    // State tracking
    this.keysPressed = {};
    this.gamepadConnected = false;
    this.gamepadIndex = null;
    this.isPortraitMode = window.innerHeight > window.innerWidth;
    this.isTouchDevice = this.detectTouchDevice();

    // Gamepad polling
    this.gamepadPollInterval = null;

    // Initialize
    this.initKeyboardListeners();
    this.initGamepadListeners();
    this.initTouchListeners();
    this.initOrientationListeners();
    this.showTouchControls();
  }

  /**
   * Detect if device supports touch
   */
  detectTouchDevice() {
    return (
      (typeof window !== 'undefined' &&
        ('ontouchstart' in window || (window.DocumentTouch && document instanceof window.DocumentTouch))) ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Initialize keyboard event listeners
   */
  initKeyboardListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  /**
   * Handle keyboard down events
   */
  handleKeyDown(e) {
    if (this.keysPressed[e.key]) return; // Ignore repeat
    this.keysPressed[e.key] = true;

    switch (e.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        e.preventDefault();
        this.config.onUp();
        break;
      case 'arrowdown':
      case 's':
        e.preventDefault();
        this.config.onDown();
        break;
      case 'arrowleft':
      case 'a':
        e.preventDefault();
        this.config.onLeft();
        break;
      case 'arrowright':
      case 'd':
        e.preventDefault();
        this.config.onRight();
        break;
      case 'z':
        e.preventDefault();
        this.config.onA();
        break;
      case 'x':
        e.preventDefault();
        this.config.onB();
        break;
      case 'q':
        e.preventDefault();
        this.config.onSave();
        break;
      case 'w':
        if (e.ctrlKey) e.preventDefault();
        this.config.onLoad();
        break;
      case ' ': // Space for pause/resume
        e.preventDefault();
        this.config.onPause();
        break;
      case 'enter': // Enter for Select
        e.preventDefault();
        this.config.onStart();
        break;
      case 'escape':
        e.preventDefault();
        this.config.onBack();
        break;
    }
  }

  /**
   * Handle keyboard up events
   */
  handleKeyUp(e) {
    this.keysPressed[e.key] = false;
  }

  /**
   * Initialize gamepad event listeners
   */
  initGamepadListeners() {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadConnected = true;
      this.gamepadIndex = e.gamepad.index;
      console.log(`Gamepad connected: ${e.gamepad.id}`);
      this.startGamepadPolling();
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      this.gamepadConnected = false;
      this.gamepadIndex = null;
      console.log(`Gamepad disconnected: ${e.gamepad.id}`);
      this.stopGamepadPolling();
    });
  }

  /**
   * Start polling gamepad input
   */
  startGamepadPolling() {
    if (this.gamepadPollInterval) return;
    this.gamepadPollInterval = setInterval(() => this.pollGamepad(), 60); // ~16ms for 60fps
  }

  /**
   * Stop polling gamepad input
   */
  stopGamepadPolling() {
    if (this.gamepadPollInterval) {
      clearInterval(this.gamepadPollInterval);
      this.gamepadPollInterval = null;
    }
  }

  /**
   * Poll gamepad state
   */
  pollGamepad() {
    if (!this.gamepadConnected) return;

    const gamepad = navigator.getGamepads()[this.gamepadIndex];
    if (!gamepad) return;

    // Analog sticks (axes 0-3: LX, LY, RX, RY)
    // D-Pad or buttons (buttons 12-15)
    const buttons = gamepad.buttons;
    const axes = gamepad.axes;

    // D-Pad buttons
    if (buttons[12]?.pressed) this.config.onUp(); // Up
    if (buttons[13]?.pressed) this.config.onDown(); // Down
    if (buttons[14]?.pressed) this.config.onLeft(); // Left
    if (buttons[15]?.pressed) this.config.onRight(); // Right

    // Analog stick threshold
    const stickThreshold = 0.5;
    if (axes[1] < -stickThreshold) this.config.onUp(); // LY up
    if (axes[1] > stickThreshold) this.config.onDown(); // LY down
    if (axes[0] < -stickThreshold) this.config.onLeft(); // LX left
    if (axes[0] > stickThreshold) this.config.onRight(); // LX right

    // Action buttons
    if (buttons[0]?.pressed) this.config.onA(); // A button (bottom of diamond)
    if (buttons[1]?.pressed) this.config.onB(); // B button (right of diamond)
    if (buttons[2]?.pressed) this.config.onLoad(); // X button (left of diamond)
    if (buttons[3]?.pressed) this.config.onSave(); // Y button (top of diamond)
    if (buttons[8]?.pressed) this.config.onSelect(); // Select (left menu button)
    if (buttons[9]?.pressed) this.config.onStart(); // Start (right menu button)
  }

  /**
   * Initialize touch event listeners
   */
  initTouchListeners() {
    const touchControls = document.getElementById('touch-controls');
    if (!touchControls) return;

    // D-Pad buttons
    touchControls.querySelector('.touch-dpad .up')?.addEventListener('pointerdown', () => this.config.onUp());
    touchControls.querySelector('.touch-dpad .down')?.addEventListener('pointerdown', () => this.config.onDown());
    touchControls.querySelector('.touch-dpad .left')?.addEventListener('pointerdown', () => this.config.onLeft());
    touchControls.querySelector('.touch-dpad .right')?.addEventListener('pointerdown', () => this.config.onRight());

    // Action buttons
    touchControls.querySelector('.touch-btn-a')?.addEventListener('pointerdown', () => this.config.onA());
    touchControls.querySelector('.touch-btn-b')?.addEventListener('pointerdown', () => this.config.onB());

    // Menu buttons
    touchControls.querySelector('.touch-menu-buttons')?.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      switch (action) {
        case 'save':
          this.config.onSave();
          break;
        case 'load':
          this.config.onLoad();
          break;
        case 'back':
          this.config.onBack();
          break;
      }
    });
  }

  /**
   * Initialize orientation change listeners
   */
  initOrientationListeners() {
    window.addEventListener('orientationchange', () => {
      this.isPortraitMode = window.innerHeight > window.innerWidth;
      this.showTouchControls();
    });

    window.addEventListener('resize', () => {
      this.isPortraitMode = window.innerHeight > window.innerWidth;
    });
  }

  /**
   * Show/hide touch controls based on device and orientation
   */
  showTouchControls() {
    const touchControls = document.getElementById('touch-controls');
    if (!touchControls) return;

    // Show touch controls only on:
    // 1. Touch devices
    // 2. Not in fullscreen player mode
    // 3. Portrait orientation OR mobile
    const playerView = document.getElementById('player-view');
    const isPlayerViewActive = playerView?.classList.contains('active');

    if (this.isTouchDevice && !isPlayerViewActive) {
      touchControls.classList.add('show');
    } else {
      touchControls.classList.remove('show');
    }
  }

  /**
   * Update input callbacks dynamically
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Disable all input handlers
   */
  disable() {
    this.stopGamepadPolling();
    document.removeEventListener('keydown', (e) => this.handleKeyDown(e));
    document.removeEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  /**
   * Re-enable input handlers
   */
  enable() {
    this.initKeyboardListeners();
    this.initGamepadListeners();
    if (this.gamepadConnected) {
      this.startGamepadPolling();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InputManager;
}
