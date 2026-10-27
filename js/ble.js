/**
 * SINILINK XY-C100L WEB BLE AUDIO DASHBOARD - WEB BLUETOOTH CORE LOGIC
 */

/**
 * Memeriksa apakah ada perangkat Sinilink yang sudah diizinkan sebelumnya di browser (getDevices).
 * Jika ada, aktifkan tombol "Sambung Cepat" agar pengguna tidak perlu membuka dialog scan
 * dan tidak terhalang oleh OS yang mengunci paket advertising.
 */
async function checkRememberedDevice() {
  if (!navigator.bluetooth || !navigator.bluetooth.getDevices) return null;
  try {
    const devs = await navigator.bluetooth.getDevices();
    if (devs && devs.length > 0) {
      const remembered = devs.find(d => 
        d.name && (d.name.includes('Sinilink') || d.name.includes('SINILINK') || d.name.includes('XY-') || d.name.includes('xy-'))
      ) || devs[0];

      if (remembered) {
        state.rememberedDevice = remembered;
        const dName = remembered.name || 'Sinilink-APP';
        if (elements.connectedDeviceName) elements.connectedDeviceName.textContent = `${dName} (Tersimpan)`;
        if (elements.btnConnectLabel) elements.btnConnectLabel.textContent = `Sambung Cepat (${dName})`;
        if (elements.btnConnect) {
          elements.btnConnect.classList.add('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-slate-900');
          elements.btnConnect.title = `Klik untuk langsung menghubungkan ke ${dName} tanpa scan ulang`;
        }
        logTerminal('SYS', `⚡ Terdeteksi perangkat tersimpan: "${dName}". Cukup klik "Sambung Cepat" tanpa perlu scan ulang!`, 'success');
        return remembered;
      }
    }
  } catch (err) {
    console.warn('checkRememberedDevice info:', err);
  }
  return null;
}

/**
 * Menghubungkan ke modul Sinilink XY-C100L via Web Bluetooth API
 */
async function connectBLE(forceNewScan = false) {
  // 0. Support Capacitor Android Native BLE if running inside APK
  if (window.BLETransportAdapter && window.BLETransportAdapter.isCapacitor()) {
    try {
      logTerminal('SYS', '⚡ Membuka dialog pencarian Bluetooth LE (Android Native)...', 'info');
      state.isHandshaking = true;
      if (elements.btnConnectLabel) elements.btnConnectLabel.textContent = 'Scanning...';
      const nativeSession = await window.BLETransportAdapter.connectCapacitor(
        (dataView) => {
          handleIncomingNotification({ target: { value: dataView } });
        },
        () => {
          onDisconnected();
        }
      );
      state.nativeSession = nativeSession;
      state.isConnected = true;
      state.isHandshaking = false;
      const devName = nativeSession.name || `Sinilink [${nativeSession.deviceId.slice(-5)}]`;
      if (elements.connectedDeviceName) elements.connectedDeviceName.textContent = devName;
      updateConnectionUI(true);
      logTerminal('SYS', `Tersambung ke ${devName} via Native Capacitor BLE!`, 'success');
      showStudioToast('Tersambung (Native BLE)', devName, 'success');
      return;
    } catch (capErr) {
      logTerminal('SYS', `Capacitor BLE: ${capErr.message || capErr}`, 'warn');
      showStudioToast('Bluetooth BLE', capErr.message || 'Pencarian perangkat dibatalkan', 'warn');
      state.isHandshaking = false;
      if (elements.btnConnectLabel) elements.btnConnectLabel.textContent = 'Connect BLE';
      return; // Do not fall through to navigator.bluetooth inside APK
    }
  }

  // Check Web Bluetooth support
  if (!navigator.bluetooth) {
    logTerminal('SYS', 'Browser Anda tidak mendukung Web Bluetooth API. Gunakan Chrome atau Edge.', 'error');
    showBrowserWarning();
    return;
  }


  try {
    let chosenDevice = null;

    // 1. Cek apakah ada perangkat yang sudah tersimpan sebelumnya (Direct Connect / Sambung Cepat)
    if (!forceNewScan) {
      if (state.rememberedDevice) {
        chosenDevice = state.rememberedDevice;
      } else if (navigator.bluetooth.getDevices) {
        try {
          const rememberedDevices = await navigator.bluetooth.getDevices();
          if (rememberedDevices && rememberedDevices.length > 0) {
            chosenDevice = rememberedDevices.find(d => 
              d.name && (d.name.includes('Sinilink') || d.name.includes('SINILINK') || d.name.includes('XY-') || d.name.includes('xy-'))
            ) || rememberedDevices[0];
          }
        } catch (getDevErr) {
          logTerminal('SYS', `Info getDevices: ${getDevErr.message}`, 'info');
        }
      }

      if (chosenDevice) {
        logTerminal('SYS', `⚡ Menghubungkan langsung ke perangkat tersimpan: "${chosenDevice.name || 'Sinilink-APP'}" (Tanpa scan)...`, 'info');
      }
    }

    // 2. Jika tidak ada perangkat tersimpan atau pengguna menekan "Scan Baru", buka dialog scan browser
    if (!chosenDevice) {
      logTerminal('SYS', 'Membuka dialog pencarian perangkat Bluetooth BLE...', 'info');

      const scanMode = elements.selScanMode ? elements.selScanMode.value : 'all';
      const scanOptions = {
        optionalServices: [
          0xae00, '0000ae00-0000-1000-8000-00805f9b34fb',
          0xae10, '0000ae10-0000-1000-8000-00805f9b34fb',
          0xae01, '0000ae01-0000-1000-8000-00805f9b34fb',
          0xae03, '0000ae03-0000-1000-8000-00805f9b34fb'
        ]
      };

      if (scanMode === 'all') {
        scanOptions.acceptAllDevices = true;
        logTerminal('SYS', 'Membuka dialog pencarian BLE: acceptAllDevices: true...', 'info');
      } else {
        scanOptions.filters = [
          { name: 'Sinilink-APP' },
          { name: 'SINILINK-APP' },
          { name: 'sinilink-app' },
          { namePrefix: 'Sinilink' },
          { namePrefix: 'SINILINK' },
          { namePrefix: 'sinilink' },
          { namePrefix: 'XY-' },
          { namePrefix: 'xy-' }
        ];
        logTerminal('SYS', 'Membuka dialog pencarian BLE dengan filter: Sinilink-APP / SINILINK-APP / XY-*...', 'info');
      }

      try {
        chosenDevice = await navigator.bluetooth.requestDevice(scanOptions);
      } catch (scanErr) {
        if (scanErr.name === 'NotFoundError') {
          logTerminal('SYS', 'Pencarian dibatalkan atau perangkat tidak ditemukan.', 'warn');
          logTerminal('SYS', '💡 TIP: Jika Sinilink-APP tidak muncul saat scan, chip JieLi tidak memancarkan sinyal saat masih ter-pair di Windows atau terhubung ke HP. Klik tombol (?) di atas untuk panduan lengkap.', 'info');
        } else {
          logTerminal('SYS', `Error scan: ${scanErr.message}`, 'error');
        }
        return;
      }
    }

    state.device = chosenDevice;
    state.rememberedDevice = chosenDevice;
    logTerminal('SYS', `Perangkat dipilih: "${state.device.name || 'Sinilink-APP'}" (ID: ${state.device.id ? state.device.id.substring(0, 8) : 'device'}...)`, 'info');

    // Setup Disconnect Listener
    state.device.removeEventListener('gattserverdisconnected', onDisconnected);
    state.device.addEventListener('gattserverdisconnected', onDisconnected);

    // Handshake & Discovery dengan Jeda 300ms & Auto-Retry 2 Kali
    state.isHandshaking = true;
    const maxRetries = 2; // Total percobaan: 1 awal + 2 retry = 3 kali
    let handshakeOk = false;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        if (elements.connectionStateLabel) {
          elements.connectionStateLabel.textContent = attempt === 1 ? 'CONNECTING...' : `RETRYING (${attempt - 1}/${maxRetries})...`;
        }
        logTerminal('SYS', `Menghubungkan ke GATT Server (Percobaan ${attempt}/${maxRetries + 1})...`, 'info');

        // 1. Hubungkan ke GATT Server
        if (state.device.gatt.connected) {
          state.server = state.device.gatt;
        } else {
          state.server = await state.device.gatt.connect();
        }
        logTerminal('SYS', 'GATT Server terhubung. Menunggu jeda stabilisasi (delay 300ms)...', 'info');

        // Jeda waktu (delay 300ms) sebelum mengambil service agar peripheral siap
        await new Promise(r => setTimeout(r, 300));

        // Pastikan GATT masih terhubung setelah jeda
        if (!state.device.gatt.connected) {
          throw new Error("Koneksi GATT terputus mendadak saat inisialisasi");
        }

        // 2. Ambil Primary Service 0xAE00
        logTerminal('SYS', 'Mengambil Primary Service 0xAE00...', 'info');
        state.service = await state.server.getPrimaryService(BLE_SERVICE_UUID);
        logTerminal('SYS', 'Service 0xAE00 berhasil ditemukan!', 'success');

        // Jeda singkat antar proses discovery
        await new Promise(r => setTimeout(r, 100));

        // 3. Enumerasi SEMUA karakteristik yang ada pada Service 0xAE00
        const allChars = await state.service.getCharacteristics();
        state.charMap = {};
        state.writableChars = [];

        logTerminal('SYS', `Ditemukan ${allChars.length} karakteristik pada Service 0xAE00:`, 'info');

        allChars.forEach((c) => {
          const shortUuid = getShortUuid(c.uuid);
          const p = c.properties;
          state.charMap[shortUuid] = c;

          logTerminal('SYS', `  • ${shortUuid} [Write: ${p.write}, NoResp: ${p.writeWithoutResponse}, Notify: ${p.notify}]`, 'info');

          if (p.write || p.writeWithoutResponse) {
            state.writableChars.push(c);
          }
          if (shortUuid === '0xAE04' || p.notify) {
            state.notifyChar = c;
          }
        });

        // 4. Pilih Write Characteristic: Prioritaskan 0xAE10 (Standar Sinilink / ha-sinilink / ESP32)
        if (state.charMap['0xAE10']) {
          state.writeChar = state.charMap['0xAE10'];
          if (elements.selWriteChar) elements.selWriteChar.value = '0xAE10';
          if (elements.selManualChar) elements.selManualChar.value = '0xAE10';
          logTerminal('SYS', 'Dipilih Write Characteristic utama: 0xAE10 (Sinilink Standard)', 'success');
        } else if (state.charMap['0xAE03']) {
          state.writeChar = state.charMap['0xAE03'];
          if (elements.selWriteChar) elements.selWriteChar.value = '0xAE03';
          if (elements.selManualChar) elements.selManualChar.value = '0xAE03';
          logTerminal('SYS', 'Dipilih Write Characteristic: 0xAE03', 'success');
        } else if (state.charMap['0xAE01']) {
          state.writeChar = state.charMap['0xAE01'];
          if (elements.selWriteChar) elements.selWriteChar.value = '0xAE01';
          if (elements.selManualChar) elements.selManualChar.value = '0xAE01';
          logTerminal('SYS', 'Dipilih Write Characteristic: 0xAE01', 'success');
        } else if (state.writableChars.length > 0) {
          state.writeChar = state.writableChars[0];
          const name = getShortUuid(state.writeChar.uuid);
          logTerminal('SYS', `Dipilih Write Characteristic pertama: ${name}`, 'success');
        }

        // Jeda singkat sebelum mengaktifkan notify
        await new Promise(r => setTimeout(r, 100));

        // 5. Aktifkan Notifikasi pada 0xAE04
        if (state.notifyChar) {
          try {
            await state.notifyChar.startNotifications();
            state.notifyChar.removeEventListener('characteristicvaluechanged', handleBleNotification);
            state.notifyChar.addEventListener('characteristicvaluechanged', handleBleNotification);
            logTerminal('SYS', `Notify Characteristic ${getShortUuid(state.notifyChar.uuid)} aktif & mendengarkan data real-time!`, 'success');
          } catch (notifyErr) {
            logTerminal('SYS', `Peringatan: Gagal startNotifications: ${notifyErr.message}`, 'warn');
          }
        } else {
          logTerminal('SYS', 'Peringatan: Karakteristik notify 0xAE04 tidak ditemukan', 'warn');
        }

        handshakeOk = true;
        break; // Handshake sukses! Keluar dari loop retry

      } catch (handshakeErr) {
        logTerminal('SYS', `Handshake percobaan ${attempt} gagal: ${handshakeErr.message}`, 'warn');
        if (attempt <= maxRetries) {
          logTerminal('SYS', `Mencoba auto-retry ke-${attempt} dalam 500ms...`, 'info');
          try {
            if (state.device.gatt.connected) {
              state.device.gatt.disconnect();
            }
          } catch (_) {}
          await new Promise(r => setTimeout(r, 500));
        } else {
          // Jika ini koneksi dari getDevices() dan gagal, fallback ke fresh scan
          if (!forceNewScan && chosenDevice) {
            logTerminal('SYS', 'Koneksi langsung ke perangkat tersimpan tidak merespons. Membuka dialog scan baru...', 'warn');
            return connectBLE(true);
          }
          throw handshakeErr; // Lempar error jika semua retry habis
        }
      }
    }

    state.isHandshaking = false;

    if (handshakeOk) {
      // Set state to Connected
      state.isConnected = true;
      state.isDemoMode = false;
      updateConnectionUI(true, state.device.name || 'Sinilink-APP');

      // Request initial status poll setelah koneksi stabil
      setTimeout(() => {
        queryDeviceStatus();
      }, 500);
    }

  } catch (err) {
    state.isHandshaking = false;
    logTerminal('SYS', `Koneksi dibatalkan atau gagal: ${err.message}`, 'error');
    updateConnectionUI(false);
  }
}

const connect = connectBLE;

async function disconnectBLE() {
  logTerminal('SYS', 'Memutuskan koneksi Bluetooth...', 'info');

  if (state.nativeSession && state.nativeSession.disconnect) {
    try { await state.nativeSession.disconnect(); } catch (_) {}
    state.nativeSession = null;
    onDisconnected();
    return;
  }

  // 1. Matikan notifikasi terlebih dahulu agar OS melepaskan listener CCCD
  if (state.notifyChar) {
    try {
      state.notifyChar.removeEventListener('characteristicvaluechanged', handleBleNotification);
      await state.notifyChar.stopNotifications();
      logTerminal('SYS', 'Notifikasi 0xAE04 dihentikan.', 'info');
    } catch (_) {}
  }

  // 2. Putus GATT Client
  if (state.device && state.device.gatt && state.device.gatt.connected) {
    try {
      state.device.gatt.disconnect();
    } catch (_) {}
  }

  onDisconnected();
  setTimeout(checkRememberedDevice, 300);
}

/**
 * Lupakan perangkat dari cache browser & OS (device.forget)
 * Mengatasi modul yang tidak terdeteksi ulang saat di-scan
 */
async function forgetDevice() {
  try {
    logTerminal('SYS', 'Memutuskan koneksi dan menghapus izin cache perangkat di browser...', 'info');

    // Matikan notifikasi
    if (state.notifyChar) {
      try {
        state.notifyChar.removeEventListener('characteristicvaluechanged', handleBleNotification);
        await state.notifyChar.stopNotifications();
      } catch (_) {}
    }

    // Putus koneksi GATT terlebih dahulu
    if (state.device && state.device.gatt && state.device.gatt.connected) {
      try {
        state.device.gatt.disconnect();
      } catch (_) {}
    }

    // Panggil device.forget() untuk mencabut izin di browser
    if (state.device && typeof state.device.forget === 'function') {
      try {
        await state.device.forget();
        logTerminal('SYS', `Perangkat ${state.device.name || 'Sinilink-APP'} berhasil dilupakan via device.forget().`, 'success');
      } catch (e1) {
        logTerminal('SYS', `Info forget: ${e1.message}`, 'info');
      }
    }

    // Bersihkan seluruh perangkat yang ada di getDevices()
    if (navigator.bluetooth && navigator.bluetooth.getDevices) {
      try {
        const devs = await navigator.bluetooth.getDevices();
        for (const d of devs) {
          if (typeof d.forget === 'function') {
            await d.forget();
          }
        }
      } catch (_) {}
    }

    state.device = null;
    state.rememberedDevice = null;
    onDisconnected();
    if (elements.btnConnectLabel) elements.btnConnectLabel.textContent = 'Connect BLE';
    if (elements.btnConnect) {
      elements.btnConnect.classList.remove('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-slate-900');
    }
    if (elements.connectedDeviceName) elements.connectedDeviceName.textContent = 'No Device';

    logTerminal('SYS', 'Cache izin BLE di browser berhasil dibersihkan! Modul siap untuk scan baru.', 'success');
    logTerminal('SYS', '💡 Jika Sinilink-APP masih belum muncul saat Scan Baru, restart power amplifier (matikan 3 detik lalu hidupkan) atau remove Sinilink-APP di Settings Bluetooth Windows.', 'info');
  } catch (err) {
    logTerminal('SYS', `Error saat reset perangkat: ${err.message}`, 'warn');
    onDisconnected();
  }
}

function onDisconnected() {
  if (state.isHandshaking) {
    logTerminal('SYS', 'Terputus saat handshake GATT berlangsung, auto-retry sedang berjalan...', 'warn');
    return;
  }

  state.isConnected = false;
  state.server = null;
  state.service = null;
  state.writeChar = null;
  state.notifyChar = null;
  state.charMap = {};
  state.writableChars = [];
  state.isDemoMode = false;

  updateConnectionUI(false);
  logTerminal('SYS', 'Perangkat Bluetooth terputus (Disconnected)', 'warn');
}

/**
 * Tulis byte ke GATT characteristic dengan prioritas write with response (writeValue)
 */
async function safeWriteCharacteristic(char, packetBytes) {
  const p = char.properties;
  if (p.write) {
    try {
      if (char.writeValueWithResponse) {
        await char.writeValueWithResponse(packetBytes);
      } else {
        await char.writeValue(packetBytes);
      }
      return 'withResponse';
    } catch (eWithResp) {
      if (p.writeWithoutResponse && char.writeValueWithoutResponse) {
        await char.writeValueWithoutResponse(packetBytes);
        return 'withoutResponseFallback';
      }
      throw eWithResp;
    }
  } else if (p.writeWithoutResponse) {
    if (char.writeValueWithoutResponse) {
      await char.writeValueWithoutResponse(packetBytes);
    } else {
      await char.writeValue(packetBytes);
    }
    return 'withoutResponse';
  } else {
    if (char.writeValueWithResponse) {
      await char.writeValueWithResponse(packetBytes);
      return 'withResponse';
    } else {
      await char.writeValue(packetBytes);
      return 'default';
    }
  }
}

/**
 * Send raw Uint8Array packet to write characteristic
 */
async function sendPacketToAmp(packetBytes, description = '', targetOverride = null) {
  const hexStr = bytesToHex(packetBytes);

  // If in Demo Mode, simulate local echo and response
  if (state.isDemoMode) {
    state.txCount++;
    if (elements.txPacketCount) elements.txPacketCount.textContent = state.txCount;
    logTerminal('TX', `${hexStr} ${description ? '-> ' + description : ''}`, 'tx');
    simulateDemoResponse(packetBytes);
    return;
  }

  if (!state.isConnected) {
    if (!state._lastDisconnectWarn || Date.now() - state._lastDisconnectWarn > 4000) {
      state._lastDisconnectWarn = Date.now();
      logTerminal('SYS', `⚠️ Kontrol dashboard belum terhubung via Bluetooth BLE. Klik "Connect BLE" di atas untuk menghubungkan remote kontrol.`, 'warn');
    }
    return;
  }

  // If connected via Native Capacitor BLE
  if (state.nativeSession && state.nativeSession.write) {
    state.txCount++;
    if (elements.txPacketCount) elements.txPacketCount.textContent = state.txCount;
    logTerminal('TX', `${hexStr} ${description ? '-> ' + description : ''}`, 'tx');
    try {
      await state.nativeSession.write(packetBytes);
    } catch (err) {
      logTerminal('SYS', `Error write Native BLE: ${err.message}`, 'error');
    }
    return;
  }


  try {
    state.txCount++;
    if (elements.txPacketCount) elements.txPacketCount.textContent = state.txCount;

    const targetSetting = targetOverride || (elements.selWriteChar ? elements.selWriteChar.value : '0xAE10');
    let writeTargets = [];

    if (targetSetting === 'ALL') {
      writeTargets = (state.writableChars && state.writableChars.length > 0)
        ? state.writableChars
        : [state.writeChar].filter(Boolean);
    } else if (state.charMap && state.charMap[targetSetting]) {
      writeTargets = [state.charMap[targetSetting]];
    } else if (state.writeChar) {
      writeTargets = [state.writeChar];
    } else if (state.writableChars && state.writableChars.length > 0) {
      writeTargets = [state.writableChars[0]];
    }

    if (writeTargets.length === 0) {
      logTerminal('SYS', `Tidak ditemukan target characteristic untuk ${targetSetting}`, 'error');
      return;
    }

    let sentCount = 0;
    let lastMethod = '';
    let targetLabels = [];

    for (const targetChar of writeTargets) {
      try {
        const shortName = getShortUuid(targetChar.uuid);
        lastMethod = await safeWriteCharacteristic(targetChar, packetBytes);
        sentCount++;
        targetLabels.push(`${shortName} (${lastMethod})`);
      } catch (writeErr) {
        logTerminal('SYS', `Gagal tulis ke ${getShortUuid(targetChar.uuid)}: ${writeErr.message}`, 'warn');
      }
    }

    if (sentCount > 0) {
      logTerminal('TX', `[-> ${targetLabels.join(', ')}] ${hexStr} ${description ? '-> ' + description : ''}`, 'tx');
    } else {
      throw new Error('Semua target characteristic gagal menerima penulisan data');
    }

  } catch (err) {
    logTerminal('SYS', `Error write characteristic: ${err.message}`, 'error');
  }
}

/**
 * Event listener saat karakteristik notifikasi menerima data baru
 */
function handleBleNotification(event) {
  const dataView = event.target.value;
  const rawBytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);

  for (let i = 0; i < rawBytes.length; i++) {
    state.rxBuffer.push(rawBytes[i]);
  }

  processRxBuffer();
}

/**
 * Send Status Poll Query (7E 05 1F 00 A2)
 */
function queryDeviceStatus() {
  const packet = build5BytePacket(0x1F, 0x00);
  sendPacketToAmp(packet, 'Query Status Frame (0x1F)');
}

/**
 * Send Custom Hex payload from input box
 */
function sendCustomHexCommand() {
  if (!elements.customHexInput) return;
  try {
    const inputStr = elements.customHexInput.value.trim();
    const baseBytes = hexToBytes(inputStr);

    let finalBytes;
    if (elements.chkAutoChecksum && elements.chkAutoChecksum.checked) {
      const checksum = calculateSinilinkChecksum(baseBytes);
      finalBytes = new Uint8Array(baseBytes.length + 1);
      finalBytes.set(baseBytes, 0);
      finalBytes[baseBytes.length] = checksum;
    } else {
      finalBytes = baseBytes;
    }

    const targetChar = elements.selManualChar ? elements.selManualChar.value : '0xAE10';
    sendPacketToAmp(finalBytes, `Custom Hex [${targetChar}]`, targetChar);
  } catch (err) {
    logTerminal('SYS', `Error input Hex: ${err.message}`, 'error');
  }
}
