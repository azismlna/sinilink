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
      if (window.capacitorCommunityBluetoothLe && window.capacitorCommunityBluetoothLe.BleClient) {
        return window.capacitorCommunityBluetoothLe.BleClient;
      }
      if (window.BleClient) return window.BleClient;
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BluetoothLe) {
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
        await ble.initialize({ androidNeverForLocation: false });
        return true;
      } catch (e) {
        console.warn('[BLEAdapter] Capacitor BLE init failed:', e);
        return false;
      }
    },

    async connectCapacitor(onNotify, onDisconnect) {
      const ble = this.getBlePlugin();
      if (!ble) throw new Error('Capacitor Bluetooth LE plugin tidak tersedia');

      // 1. Inisialisasi stack Bluetooth LE dan minta izin runtime jika belum
      try {
        await ble.initialize({ androidNeverForLocation: false });
      } catch (initErr) {
        console.warn('[BLEAdapter] initialize info:', initErr);
      }

      // 2. Pastikan Bluetooth aktif di HP
      try {
        const isEnabledResult = await ble.isEnabled();
        if (isEnabledResult && isEnabledResult.value === false) {
          await ble.requestEnable();
        }
      } catch (enableErr) {
        console.warn('[BLEAdapter] requestEnable check:', enableErr);
      }

      // 3. Scan & Tampilkan Dialog Pemilih Perangkat Native Android
      let targetDevice = null;
      try {
        console.log('[BLEAdapter] Membuka scan dialog perangkat Bluetooth...');
        targetDevice = await ble.requestDevice({
          optionalServices: [
            SERVICE_UUID,
            '0000ae10-0000-1000-8000-00805f9b34fb',
            '0000ae01-0000-1000-8000-00805f9b34fb',
            '0000ae03-0000-1000-8000-00805f9b34fb',
            '0000ae04-0000-1000-8000-00805f9b34fb'
          ]
        });
      } catch (scanErr) {
        console.warn('[BLEAdapter] requestDevice error/cancel:', scanErr);
        throw new Error(scanErr.message || 'Pencarian perangkat dibatalkan');
      }

      if (!targetDevice || !targetDevice.deviceId) {
        throw new Error('Tidak ada perangkat yang dipilih');
      }

      const targetDeviceId = targetDevice.deviceId;
      const targetDeviceName = targetDevice.name || 'Sinilink-APP';
      this.saveMac(targetDeviceId);
      console.log(`[BLEAdapter] Menghubungkan ke ${targetDeviceName} (${targetDeviceId})...`);

      // 4. Hubungkan ke perangkat
      await ble.connect({ deviceId: targetDeviceId, timeout: 10000 });

      // 5. Jalankan notifikasi karakteristik 0xAE04
      try {
        await ble.startNotifications({
          deviceId: targetDeviceId,
          service: SERVICE_UUID,
          characteristic: NOTIFY_CHAR_UUID
        }, (result) => {
          if (result && result.value) {
            let dataView;
            if (result.value instanceof DataView) {
              dataView = result.value;
            } else if (typeof result.value === 'string') {
              dataView = new DataView(Uint8Array.from(atob(result.value), c => c.charCodeAt(0)).buffer);
            } else if (result.value.buffer) {
              dataView = new DataView(result.value.buffer);
            }
            if (onNotify && dataView) onNotify(dataView);
          }
        });
      } catch (notifErr) {
        console.warn('[BLEAdapter] startNotifications info:', notifErr);
      }

      return {
        deviceId: targetDeviceId,
        name: targetDeviceName,
        async write(bytes) {
          const uint8 = new Uint8Array(bytes);
          try {
            await ble.write({
              deviceId: targetDeviceId,
              service: SERVICE_UUID,
              characteristic: WRITE_CHAR_UUID,
              value: new DataView(uint8.buffer)
            });
          } catch (writeErr) {
            const base64 = btoa(String.fromCharCode.apply(null, uint8));
            await ble.write({
              deviceId: targetDeviceId,
              service: SERVICE_UUID,
              characteristic: WRITE_CHAR_UUID,
              value: base64
            });
          }
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
