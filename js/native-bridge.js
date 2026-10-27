/**
 * SINILINK XY-C100L - ANDROID CAPACITOR & WEB NATIVE BRIDGE
 * 
 * Provides:
 * 1. MediaSessionBridge: Real-time track metadata (Spotify, YouTube Music) & Transport Controls
 * 2. BLETransportAdapter: Capacitor Bluetooth LE for Android Native (.APK) + Web Bluetooth Fallback
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_MAC = 'sinilink_ble_mac';
  const DEFAULT_MAC = '49:25:2B:E5:25:56';
  const SERVICE_UUID = '0000ae00-0000-1000-8000-00805f9b34fb';
  const WRITE_CHAR_UUID = '0000ae03-0000-1000-8000-00805f9b34fb';
  const NOTIFY_CHAR_UUID = '0000ae04-0000-1000-8000-00805f9b34fb';

  // =========================================================================
  // 1. MediaSessionBridge (Android & Web Now Playing Sync)
  // =========================================================================
  const MediaSessionBridge = {
    currentMetadata: {
      title: 'XY-C100L Bluetooth Stream',
      artist: 'Sinilink Audio Engine',
      album: 'Hi-Fi Stereo',
      artwork: ''
    },
    listeners: new Set(),

    init() {
      // Setup Web MediaSession API if available
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: this.currentMetadata.title,
            artist: this.currentMetadata.artist,
            album: this.currentMetadata.album
          });

          navigator.mediaSession.setActionHandler('play', () => {
            if (window.bleApp?.togglePlay) window.bleApp.togglePlay();
          });
          navigator.mediaSession.setActionHandler('pause', () => {
            if (window.bleApp?.togglePlay) window.bleApp.togglePlay();
          });
          navigator.mediaSession.setActionHandler('previoustrack', () => {
            if (window.bleApp?.prevTrack) window.bleApp.prevTrack();
          });
          navigator.mediaSession.setActionHandler('nexttrack', () => {
            if (window.bleApp?.nextTrack) window.bleApp.nextTrack();
          });
        } catch (e) {
          console.warn('[MediaSession] Native action handler setup skipped:', e);
        }
      }

      // Capacitor Android BroadcastReceiver / NotificationListener bridge
      window.addEventListener('sinilink:media_update', (e) => {
        if (e.detail) {
          this.setMetadata(e.detail.title, e.detail.artist, e.detail.albumArt);
        }
      });

      // Android WebView Javascript Interface (if injected by Native APK)
      if (window.AndroidMediaBridge) {
        try {
          const info = JSON.parse(window.AndroidMediaBridge.getCurrentTrack() || '{}');
          if (info.title) {
            this.setMetadata(info.title, info.artist, info.artwork);
          }
        } catch (e) {
          console.warn('[MediaSession] AndroidMediaBridge parsing error:', e);
        }
      }
    },

    setMetadata(title, artist, artwork = '') {
      this.currentMetadata.title = title || 'XY-C100L Audio Stream';
      this.currentMetadata.artist = artist || 'Bluetooth Source';
      this.currentMetadata.artwork = artwork;

      if ('mediaSession' in navigator && window.MediaMetadata) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: this.currentMetadata.title,
            artist: this.currentMetadata.artist,
            album: 'Sinilink XY-C100L'
          });
        } catch (e) {}
      }

      this.notifyListeners();
    },

    subscribe(fn) {
      if (typeof fn === 'function') {
        this.listeners.add(fn);
        fn(this.currentMetadata);
      }
    },

    unsubscribe(fn) {
      this.listeners.delete(fn);
    },

    notifyListeners() {
      for (const fn of this.listeners) {
        try {
          fn(this.currentMetadata);
        } catch (err) {
          console.error('[MediaSession] Listener error:', err);
        }
      }
    }
  };

  // =========================================================================
  // 2. BLETransportAdapter (Capacitor Bluetooth LE + Web Bluetooth)
  // =========================================================================
  const BLETransportAdapter = {
    isCapacitor() {
      return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    },

    getBlePlugin() {
      if (this.isCapacitor() && window.Capacitor.Plugins && window.Capacitor.Plugins.BluetoothLe) {
        return window.Capacitor.Plugins.BluetoothLe;
      }
      return null;
    },

    getSavedMac() {
      try {
        return localStorage.getItem(STORAGE_KEY_MAC) || DEFAULT_MAC;
      } catch (e) {
        return DEFAULT_MAC;
      }
    },

    saveMac(mac) {
      try {
        if (mac) localStorage.setItem(STORAGE_KEY_MAC, mac.trim().toUpperCase());
      } catch (e) {}
    },

    async initCapacitorBle() {
      const ble = this.getBlePlugin();
      if (!ble) return false;
      try {
        await ble.initialize();
        return true;
      } catch (e) {
        console.warn('[BLEAdapter] Capacitor BLE init failed:', e);
        return false;
      }
    },

    async connectCapacitor(onNotify, onDisconnect) {
      const ble = this.getBlePlugin();
      if (!ble) throw new Error('Capacitor BluetoothLe plugin not available');

      const targetDeviceId = this.getSavedMac();
      console.log(`[BLEAdapter] Connecting via Capacitor BLE to ${targetDeviceId}...`);

      await ble.connect({ deviceId: targetDeviceId });

      // Start Notifications on 0xAE04
      await ble.startNotifications({
        deviceId: targetDeviceId,
        service: SERVICE_UUID,
        characteristic: NOTIFY_CHAR_UUID
      }, (result) => {
        if (result && result.value) {
          // result.value is a DataView or Base64 string depending on plugin version
          const dataView = typeof result.value === 'string'
            ? new DataView(Uint8Array.from(atob(result.value), c => c.charCodeAt(0)).buffer)
            : result.value;
          if (onNotify) onNotify(dataView);
        }
      });

      return {
        deviceId: targetDeviceId,
        async write(bytes) {
          const uint8 = new Uint8Array(bytes);
          const base64 = btoa(String.fromCharCode.apply(null, uint8));
          await ble.write({
            deviceId: targetDeviceId,
            service: SERVICE_UUID,
            characteristic: WRITE_CHAR_UUID,
            value: base64
          });
        },
        async disconnect() {
          try {
            await ble.disconnect({ deviceId: targetDeviceId });
          } catch (e) {}
          if (onDisconnect) onDisconnect();
        }
      };
    }
  };

  // Expose to window
  window.MediaSessionBridge = MediaSessionBridge;
  window.BLETransportAdapter = BLETransportAdapter;

})(window);
