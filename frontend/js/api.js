// API Client

const API_BASE_URL = '/api';

const api = {
  userId: 'default-user',

  setUserId(id) {
    this.userId = id;
  },

  // ROM APIs
  async getRoms() {
    try {
      const response = await fetch(`${API_BASE_URL}/roms?userId=${this.userId}`);
      if (!response.ok) throw new Error('Failed to fetch ROMs');
      return await response.json();
    } catch (err) {
      console.error('Error fetching ROMs:', err);
      return null;
    }
  },

  async getRomById(romId) {
    try {
      const response = await fetch(`${API_BASE_URL}/roms/${romId}`);
      if (!response.ok) throw new Error('ROM not found');
      return await response.json();
    } catch (err) {
      console.error('Error fetching ROM:', err);
      return null;
    }
  },

  async uploadRom(file, onProgress) {
    try {
      const formData = new FormData();
      formData.append('rom', file);
      formData.append('userId', this.userId);

      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      return new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', `${API_BASE_URL}/roms/upload`);
        xhr.send(formData);
      });
    } catch (err) {
      console.error('Error uploading ROM:', err);
      throw err;
    }
  },

  async updateRom(romId, data) {
    try {
      const response = await fetch(`${API_BASE_URL}/roms/${romId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update ROM');
      return await response.json();
    } catch (err) {
      console.error('Error updating ROM:', err);
      return null;
    }
  },

  async deleteRom(romId) {
    try {
      const response = await fetch(`${API_BASE_URL}/roms/${romId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete ROM');
      return await response.json();
    } catch (err) {
      console.error('Error deleting ROM:', err);
      return null;
    }
  },

  async searchRoms(query) {
    try {
      const response = await fetch(`${API_BASE_URL}/roms/search/${encodeURIComponent(query)}?userId=${this.userId}`);
      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (err) {
      console.error('Error searching ROMs:', err);
      return [];
    }
  },

  async downloadRom(romId) {
    window.location.href = `${API_BASE_URL}/roms/${romId}/download`;
  },

  // Save State APIs
  async getSaveStates(romId) {
    try {
      const response = await fetch(`${API_BASE_URL}/saves/${romId}?userId=${this.userId}`);
      if (!response.ok) throw new Error('Failed to fetch saves');
      return await response.json();
    } catch (err) {
      console.error('Error fetching save states:', err);
      return [];
    }
  },

  async getSaveState(romId, slotNumber) {
    try {
      const response = await fetch(`${API_BASE_URL}/saves/${romId}/${slotNumber}?userId=${this.userId}`);
      if (!response.ok) throw new Error('Save state not found');
      return await response.json();
    } catch (err) {
      console.error('Error fetching save state:', err);
      return null;
    }
  },

  async saveSaveState(romId, slotNumber, stateData, screenshot) {
    try {
      const response = await fetch(`${API_BASE_URL}/saves/${romId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          slotNumber,
          stateData,
          screenshot,
        }),
      });
      if (!response.ok) {
        let details = '';
        try {
          const body = await response.json();
          details = body?.message || body?.error || '';
        } catch {
          details = await response.text();
        }
        throw new Error(`Failed to save state (${response.status})${details ? `: ${details}` : ''}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Error saving state:', err);
      throw err;
    }
  },

  async deleteSaveState(romId, slotNumber) {
    try {
      const response = await fetch(`${API_BASE_URL}/saves/${romId}/${slotNumber}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId }),
      });
      if (!response.ok) throw new Error('Failed to delete save');
      return await response.json();
    } catch (err) {
      console.error('Error deleting save:', err);
      return null;
    }
  },

  async getAllSaveStates() {
    try {
      const response = await fetch(`${API_BASE_URL}/saves/user/all?userId=${this.userId}`);
      if (!response.ok) throw new Error('Failed to fetch all saves');
      return await response.json();
    } catch (err) {
      console.error('Error fetching all saves:', err);
      return [];
    }
  },

  // User/Session APIs
  async createSession(deviceName) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          deviceId: getOrCreateDeviceId(),
          deviceName,
        }),
      });
      if (!response.ok) throw new Error('Failed to create session');
      return await response.json();
    } catch (err) {
      console.error('Error creating session:', err);
      return null;
    }
  },

  async getSessions() {
    try {
      const response = await fetch(`${API_BASE_URL}/users/sessions?userId=${this.userId}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return await response.json();
    } catch (err) {
      console.error('Error fetching sessions:', err);
      return [];
    }
  },

  async getUserStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/users/stats?userId=${this.userId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return await response.json();
    } catch (err) {
      console.error('Error fetching stats:', err);
      return null;
    }
  },

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (err) {
      console.error('Health check failed:', err);
      return false;
    }
  },
};
