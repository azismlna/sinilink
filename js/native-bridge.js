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
  const CHAR_AE10 = '0000ae10-0000-1000-8000-00805f9b34fb'; // Primary Write (Sinilink Standard)
  const CHAR_AE01 = '0000ae01-0000-1000-8000-00805f9b34fb'; // Auxiliary Write (Serial passthrough)
  const CHAR_AE03 = '0000ae03-0000-1000-8000-00805f9b34fb'; // Alternate
  const NOTIFY_CHAR_UUID = '0000ae04-0000-1000-8000-00805f9b34fb'; // Real-time Telemetry Notify

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
        await ble.initialize({ androidNeverForLocation: true });
        return true;
      } catch (e) {
        console.warn('[BLEAdapter] Capacitor BLE init failed:', e);
        return false;
      }
    },

    async connectCapacitor(onNotify, onDisconnect) {
      const ble = this.getBlePlugin();
      if (!ble) throw new Error('Capacitor Bluetooth LE plugin tidak tersedia');

      // 0. Nonaktifkan antrean blocking agar tidak terjadi freeze jika ada panggilan timeout
      if (typeof ble.disableQueue === 'function') {
        try { ble.disableQueue(); } catch (_) {}
      }

      // 1. Inisialisasi stack Bluetooth LE (androidNeverForLocation: true)
      try {
        await ble.initialize({ androidNeverForLocation: true });
      } catch (initErr) {
        console.warn('[BLEAdapter] initialize info:', initErr);
      }

      // 2. Pastikan Bluetooth aktif di HP
      try {
        const isEnabled = await ble.isEnabled();
        if (isEnabled === false || (isEnabled && isEnabled.value === false)) {
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
            '0000ae02-0000-1000-8000-00805f9b34fb',
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
      await ble.connect(targetDeviceId, (disconnectedId) => {
        console.log('[BLEAdapter] Perangkat terputus:', disconnectedId);
        if (onDisconnect) onDisconnect();
      }, { timeout: 10000 });

      // 5. Discovery Service & Karakteristik yang benar-benar ada di modul
      let writableTargets = [];
      let notifyTarget = null;
      try {
        const services = await ble.getServices(targetDeviceId);
        console.log('[BLEAdapter] Services ditemukan:', JSON.stringify(services));

        for (const s of (services || [])) {
          for (const c of (s.characteristics || [])) {
            const u = (c.uuid || '').toLowerCase();
            const shortName = u.includes('0000ae') ? '0x' + u.substring(4, 8).toUpperCase() : u.substring(0, 8);
            const props = c.properties || {};

            if (props.notify) {
              notifyTarget = { serviceUuid: s.uuid, charUuid: c.uuid, shortName };
            }
            if (props.write || props.writeWithoutResponse) {
              writableTargets.push({
                serviceUuid: s.uuid,
                charUuid: c.uuid,
                shortName,
                canWrite: !!props.write,
                canNoResp: !!props.writeWithoutResponse
              });
            }
          }
        }
      } catch (svcErr) {
        console.warn('[BLEAdapter] getServices info:', svcErr);
      }

      // Fallback jika discovery kosong
      if (writableTargets.length === 0) {
        writableTargets = [
          { serviceUuid: SERVICE_UUID, charUuid: CHAR_AE10, shortName: '0xAE10', canWrite: true, canNoResp: true },
          { serviceUuid: SERVICE_UUID, charUuid: CHAR_AE03, shortName: '0xAE03', canWrite: false, canNoResp: true },
          { serviceUuid: SERVICE_UUID, charUuid: CHAR_AE01, shortName: '0xAE01', canWrite: true, canNoResp: true }
        ];
      }

      // Log port yang berhasil terdeteksi ke UI terminal log
      if (typeof logTerminal === 'function') {
        const foundStr = writableTargets.map(t => `${t.shortName} [${t.canWrite ? 'Write' : ''}${t.canNoResp ? ' NoResp' : ''}]`).join(', ');
        logTerminal('SYS', `📡 Port Hardware Terdeteksi: ${foundStr}`, 'success');
      }

      // 6. Jalankan notifikasi karakteristik 0xAE04
      const actualNotifyService = notifyTarget ? notifyTarget.serviceUuid : SERVICE_UUID;
      const actualNotifyChar = notifyTarget ? notifyTarget.charUuid : NOTIFY_CHAR_UUID;

      try {
        await ble.startNotifications(
          targetDeviceId,
          actualNotifyService,
          actualNotifyChar,
          (value) => {
            if (!onNotify) return;
            let dataView;
            if (value instanceof DataView) {
              dataView = value;
            } else if (value && value.buffer && value.buffer instanceof ArrayBuffer) {
              dataView = new DataView(value.buffer, value.byteOffset || 0, value.byteLength || value.buffer.byteLength);
            } else if (typeof value === 'string') {
              dataView = new DataView(Uint8Array.from(atob(value), c => c.charCodeAt(0)).buffer);
            }
            if (dataView) onNotify(dataView);
          }
        );
        console.log('[BLEAdapter] startNotifications aktif pada', actualNotifyChar);
      } catch (notifErr) {
        console.warn('[BLEAdapter] startNotifications info:', notifErr);
      }

      return {
        deviceId: targetDeviceId,
        name: targetDeviceName,
        writableTargets,
        async write(bytes) {
          const uint8 = new Uint8Array(bytes);
          const framesToSend = [uint8];

          // Kompatibilitas Dual Frame:
          // Jika perintah volume 15-byte (7E 0F 1D <vol> ...), kirim juga frame ringkas 5-byte (7E 05 1D <vol> <cs>)
          if (uint8.length === 15 && uint8[0] === 0x7E && uint8[1] === 0x0F && uint8[2] === 0x1D) {
            const vol = uint8[3];
            const raw5 = [0x7E, 0x05, 0x1D, vol];
            let cs5 = 0;
            for (let i = 0; i < raw5.length; i++) cs5 = (cs5 + raw5[i]) & 0xFF;
            raw5.push(cs5);
            framesToSend.push(new Uint8Array(raw5));
          }
          // Jika perintah transport 5-byte (7E 05 <cmd> 00 <cs>), kirim juga frame extended 15-byte
          else if (uint8.length === 5 && uint8[0] === 0x7E && uint8[1] === 0x05) {
            const cmd = uint8[2];
            const param = uint8[3];
            const raw15 = [0x7E, 0x0F, cmd, param, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            let cs15 = 0;
            for (let i = 0; i < raw15.length; i++) cs15 = (cs15 + raw15[i]) & 0xFF;
            raw15.push(cs15);
            framesToSend.push(new Uint8Array(raw15));
          }

          // Cek pilihan dropdown Target Write di UI
          const userChoice = (window.elements && window.elements.selWriteChar) ? window.elements.selWriteChar.value : 'ALL';
          let targets = writableTargets;

          if (userChoice && userChoice !== 'ALL') {
            const matched = writableTargets.filter(t => t.shortName === userChoice || t.charUuid.toLowerCase().includes(userChoice.toLowerCase().replace('0x', '')));
            if (matched.length > 0) targets = matched;
          }

          let anySuccess = false;
          for (const frame of framesToSend) {
            const dataView = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);

            for (const target of targets) {
              try {
                if (target.canNoResp) {
                  await ble.writeWithoutResponse(targetDeviceId, target.serviceUuid, target.charUuid, dataView);
                  anySuccess = true;
                } else if (target.canWrite) {
                  await ble.write(targetDeviceId, target.serviceUuid, target.charUuid, dataView, { timeout: 800 });
                  anySuccess = true;
                }
              } catch (err1) {
                // Fallback otomatis ke mode sebaliknya jika gagal
                try {
                  if (target.canWrite) {
                    await ble.write(targetDeviceId, target.serviceUuid, target.charUuid, dataView, { timeout: 800 });
                    anySuccess = true;
                  } else if (target.canNoResp) {
                    await ble.writeWithoutResponse(targetDeviceId, target.serviceUuid, target.charUuid, dataView);
                    anySuccess = true;
                  }
                } catch (err2) {
                  console.warn(`[BLEAdapter] Write ke ${target.shortName} error:`, err2);
                }
              }
            }
          }

          if (!anySuccess && typeof logTerminal === 'function') {
            logTerminal('SYS', '⚠️ Gagal mengirim data ke port Bluetooth modul', 'warn');
          }
        },
        async disconnect() {
          try {
            await ble.disconnect(targetDeviceId);
          } catch (e) {
            console.warn('[BLEAdapter] disconnect err:', e);
          }
          if (onDisconnect) onDisconnect();
        }
      };
    }
  };

  // Expose to window
  window.MediaSessionBridge = MediaSessionBridge;
  window.BLETransportAdapter = BLETransportAdapter;

})(window);
