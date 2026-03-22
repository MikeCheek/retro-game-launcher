// Utility functions

// Device ID management
function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'device-' + generateUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Local storage helpers
function setUserData(key, value) {
  localStorage.setItem('user_' + key, JSON.stringify(value));
}

function getUserData(key, defaultValue = null) {
  const data = localStorage.getItem('user_' + key);
  return data ? JSON.parse(data) : defaultValue;
}

function clearUserData() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('user_')) {
      localStorage.removeItem(key);
    }
  });
}

// Array utilities
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Get file extension
function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

// Convert blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Play sound effect
function playSoundEffect(type = 'select') {
  const audioElement = document.getElementById('selectSound');
  if (audioElement) {
    audioElement.currentTime = 0;
    audioElement.play().catch((err) => console.log('Audio play error:', err));
  }
}

// Notification system
function showNotification(message, type = 'info', duration = 3333) {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // Could be expanded to show visual notifications
}

// Check if array is empty
function isEmpty(arr) {
  return !arr || arr.length === 0;
}

// Get unique array values
function getUnique(arr) {
  return [...new Set(arr)];
}

// Keyboard key press helper
function isKeyPressed(key) {
  return window.pressedKeys && window.pressedKeys[key];
}

// Initialize pressed keys tracking
window.pressedKeys = {};
document.addEventListener('keydown', (e) => {
  window.pressedKeys[e.key] = true;
});
document.addEventListener('keyup', (e) => {
  window.pressedKeys[e.key] = false;
});
