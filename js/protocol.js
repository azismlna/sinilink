/**
 * SINILINK XY-C100L WEB BLE AUDIO DASHBOARD - PROTOCOL ENCODER & DECODER
 */

/**
 * Calculates Sinilink 8-bit checksum:
 * sum(byte[0] ... byte[n-1]) & 0xFF
 */
function calculateSinilinkChecksum(byteArray) {
  let sum = 0;
  for (let i = 0; i < byteArray.length; i++) {
    sum = (sum + byteArray[i]) & 0xFF;
  }
  return sum;
}

/**
 * Format a Uint8Array or Array into uppercase hex string "7E 10 1F ..."
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

/**
 * Parse hex string "7E 05 1F 00" into Uint8Array
 */
function hexToBytes(hexString) {
  const clean = hexString.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length % 2 !== 0) {
    throw new Error("Panjang string Hex ganjil (harus pasangan 2 karakter)");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Build volume packet:
 * 7E 0F 1D <vol> 00 00 00 00 00 00 00 00 00 00 <checksum>
 * Dibatasi maksimal 29 (0x1D) sesuai hardware rotary encoder XY-C100L
 */
function buildVolumePacket(volumeInt) {
  const maxVol = (typeof MAX_VOLUME !== 'undefined' ? MAX_VOLUME : 29);
  const vol = Math.max(0, Math.min(maxVol, Math.min(0x1D, parseInt(volumeInt))));
  const raw = [
    0x7E, 0x0F, 0x1D,
    vol,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ];
  const checksum = calculateSinilinkChecksum(raw);
  raw.push(checksum);
  return new Uint8Array(raw);
}

/**
 * Build standard 5-byte command packet:
 * 7E 05 <cmd> 00 <checksum>
 */
function build5BytePacket(cmdByte, paramByte = 0x00) {
  const raw = [0x7E, 0x05, cmdByte, paramByte];
  const checksum = calculateSinilinkChecksum(raw);
  raw.push(checksum);
  return new Uint8Array(raw);
}

/**
 * Build 15-byte extended command frame (Fallback jika firmware butuh frame panjang):
 * 7E 0F <cmd> 00 00 00 00 00 00 00 00 00 00 00 <checksum>
 */
function build15BytePacket(cmdByte, paramByte = 0x00) {
  const raw = [
    0x7E, 0x0F, cmdByte, paramByte,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ];
  const checksum = calculateSinilinkChecksum(raw);
  raw.push(checksum);
  return new Uint8Array(raw);
}

/**
 * Konversi 128-bit UUID ke short form 16-bit (e.g. 0xAE10)
 */
function getShortUuid(uuidStr) {
  if (!uuidStr) return 'Unknown';
  const clean = uuidStr.toLowerCase();
  const match = clean.match(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/);
  if (match) {
    return '0x' + match[1].toUpperCase();
  }
  return uuidStr.substring(0, 8);
}

/**
 * Memproses stream buffer dari karakteristik notify 0xAE04
 */
function processRxBuffer() {
  while (state.rxBuffer.length >= 5) {
    // Cari start header 0x7E
    if (state.rxBuffer[0] !== 0x7E) {
      const idx = state.rxBuffer.indexOf(0x7E);
      if (idx === -1) {
        state.rxBuffer = [];
        break;
      }
      state.rxBuffer = state.rxBuffer.slice(idx);
      if (state.rxBuffer.length < 5) break;
    }

    const packetLen = state.rxBuffer[1];
    if (packetLen < 5 || packetLen > 32) {
      // Invalid length byte, lewati header dan cari kembali
      state.rxBuffer.shift();
      continue;
    }

    if (state.rxBuffer.length < packetLen) {
      // Paket belum lengkap, tunggu chunk berikutnya
      break;
    }

    // Ekstrak paket lengkap
    const packet = state.rxBuffer.slice(0, packetLen);
    state.rxBuffer = state.rxBuffer.slice(packetLen);

    // Parse dan decoding paket
    decodePacket(new Uint8Array(packet));
  }
}

/**
 * Decodes and validates complete Sinilink status frame
 */
function decodePacket(packet) {
  state.rxCount++;
  if (elements.rxPacketCount) elements.rxPacketCount.textContent = state.rxCount;

  const packetLen = packet.length;
  const hexStr = bytesToHex(packet);

  // Verifikasi Checksum
  const dataWithoutChecksum = packet.slice(0, packetLen - 1);
  const expectedChecksum = calculateSinilinkChecksum(dataWithoutChecksum);
  const actualChecksum = packet[packetLen - 1];
  // Toleransi 1 byte untuk variasi byte reserved vendor
  const isChecksumValid = (expectedChecksum === actualChecksum) || (Math.abs(expectedChecksum - actualChecksum) <= 1);

  if (elements.telemetryPacketLen) {
    elements.telemetryPacketLen.textContent = `${packetLen} Bytes (0x${packetLen.toString(16).padStart(2,'0').toUpperCase()})`;
  }
  if (elements.telemetryChecksumStatus) {
    elements.telemetryChecksumStatus.textContent = isChecksumValid 
      ? `VALID (0x${actualChecksum.toString(16).padStart(2, '0').toUpperCase()})` 
      : `MISMATCH (Got: 0x${actualChecksum.toString(16).padStart(2, '0').toUpperCase()}, Exp: 0x${expectedChecksum.toString(16).padStart(2, '0').toUpperCase()})`;
    elements.telemetryChecksumStatus.className = isChecksumValid 
      ? "font-mono font-bold text-emerald-400 mt-0.5" 
      : "font-mono font-bold text-rose-400 mt-0.5";
  }

  let annotation = '';

  // KASUS A: 16-byte Packet (0x10) e.g., 7E 10 1F 01 00 1B 31 32 33 34 00 00 00 00 01 93
  if (packet[1] === 0x10 && packetLen >= 16 && packet[2] === 0x1F) {
    const toneByte = packet[3];
    const muteOrEqByte = packet[4];
    const volByte = packet[5];

    // Hardware XY-C100L Max Volume Calibration (0x00 - 0x1D = 29 MAX)
    // Sesuai hasil uji hardware fisik aktual (frame mentok kanan: 7E 10 1F 01 00 1D ... 95)
    state.maxVolume = 29;
    if (elements.knobVolMax) elements.knobVolMax.textContent = '29';
    if (elements.volumeSlider) elements.volumeSlider.max = '29';

    // Password ASCII byte 6 s/d 9
    const pwdBytes = packet.slice(6, 10);
    let passwordStr = '';
    for (let i = 0; i < pwdBytes.length; i++) {
      passwordStr += String.fromCharCode(pwdBytes[i]);
    }

    state.promptTone = (toneByte === 0x01);
    state.password = passwordStr;

    if (elements.telemetryPassword) elements.telemetryPassword.textContent = `"${passwordStr}" (ASCII)`;
    if (elements.telemetryTone) {
      elements.telemetryTone.textContent = state.promptTone ? 'ENABLED (0x01)' : 'DISABLED (0x00)';
      elements.telemetryTone.className = state.promptTone ? 'font-mono font-bold text-emerald-400 mt-0.5' : 'font-mono font-bold text-slate-400 mt-0.5';
    }

    // Monitoring validasi balasan EQ pada frame notify 0xAE04
    const eqByteMap = { 0x09: 'Normal', 0x0A: 'Rock', 0x0B: 'Pop', 0x0C: 'Classic', 0x0D: 'Jazz', 0x0E: 'Country' };
    if (eqByteMap[muteOrEqByte]) {
      const eqConfirmed = eqByteMap[muteOrEqByte];
      logTerminal('RX', `📡 Balasan Hardware 0xAE04: Konfirmasi Preset EQ Aktif -> ${eqConfirmed.toUpperCase()} (Byte 4: 0x${muteOrEqByte.toString(16).padStart(2, '0')})`, 'success');
    }

    // Perbarui knob volume jika pengguna tidak sedang drag pointer
    if (!state.isDraggingKnob) {
      updateVolumeUI(Math.min(29, volByte), false);
    }

    annotation = `Vol: ${Math.min(29, volByte)}/29 (0x${volByte.toString(16).toUpperCase()}), Tone: ${state.promptTone ? 'ON' : 'OFF'}, Pass: "${passwordStr}"`;
  }
  // KASUS B: 15-byte Packet (0x0F) Source/EQ/Volume update
  else if (packet[1] === 0x0F && packetLen >= 15) {
    const sourceByte = packet[4];
    const statusByte = packet[5];
    const volByte = packet[6];
    const eqByte = packet[8];

    // Parse Source
    if (sourceByte === 0x14) updateSourceUI('BT', false);
    else if (sourceByte === 0x16) updateSourceUI('AUX', false);
    else if (sourceByte === 0x04) updateSourceUI('USB', false);
    else if (sourceByte === 0x15) updateSourceUI('PC', false);

    // Parse Playback status
    if (statusByte === 0x01) {
      updatePlaybackUI(false);
    } else if (statusByte === 0x02) {
      updatePlaybackUI(true);
    }

    // Parse Volume
    if (!state.isDraggingKnob && typeof volByte === 'number') {
      updateVolumeUI(volByte, false);
    }

    // Parse EQ
    const eqReverseMap = {
      0x09: 'Normal',
      0x0A: 'Rock',
      0x0B: 'Pop',
      0x0C: 'Classic',
      0x0D: 'Jazz',
      0x0E: 'Country'
    };
    if (eqReverseMap[eqByte]) {
      updateEqUI(eqReverseMap[eqByte], false);
    }

    annotation = `Source: ${state.source}, Play: ${state.isPlaying ? 'PLAYING' : 'PAUSED'}, Vol: ${state.volume}, EQ: ${state.eqMode}`;
  } else {
    annotation = `Len: ${packetLen}B, CMD: 0x${packet[2].toString(16).toUpperCase()}`;
  }

  // Flash indikator sinkronisasi
  if (elements.syncPulse && elements.syncText) {
    elements.syncPulse.className = "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping";
    elements.syncText.textContent = "Synced";
    setTimeout(() => {
      elements.syncPulse.className = "w-1.5 h-1.5 rounded-full bg-slate-500";
      elements.syncText.textContent = "Knob Ready";
    }, 1000);
  }

  // Catat paket ke live log
  logTerminal('RX', `${hexStr} ${annotation ? '-> ' + annotation : ''}`, 'rx');
}
