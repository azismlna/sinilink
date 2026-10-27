/**
 * SINILINK XY-C100L WEB BLE AUDIO DASHBOARD - UI & INTERACTION CONTROLLER
 */

/**
 * Escape HTML special characters for safe terminal logging
 */
function escapeHtml(text) {
  if (typeof text !== 'string') text = String(text);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Live Terminal Log function with timestamps & color badges
 */
function logTerminal(type, message, style = 'normal') {
  if (!elements.terminalConsole) return;

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;

  const row = document.createElement('div');
  row.className = `log-row flex items-start gap-2 text-xs py-0.5 leading-relaxed`;
  row.dataset.type = type;

  // Color mapping
  let typeBadge = '';
  if (type === 'RX') {
    typeBadge = `<span class="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800 shrink-0">RX</span>`;
  } else if (type === 'TX') {
    typeBadge = `<span class="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800 shrink-0">TX</span>`;
  } else if (type === 'AUDIO') {
    typeBadge = `<span class="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-bold border border-indigo-800 shrink-0">AUDIO</span>`;
  } else {
    typeBadge = `<span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-bold shrink-0">SYS</span>`;
  }

  let textClass = 'text-slate-300';
  if (style === 'rx') textClass = 'text-emerald-300';
  else if (style === 'tx') textClass = 'text-cyan-300';
  else if (style === 'success') textClass = 'text-emerald-400 font-semibold';
  else if (style === 'warn') textClass = 'text-amber-400';
  else if (style === 'error') textClass = 'text-rose-400 font-semibold';
  else if (style === 'info') textClass = 'text-slate-300';

  row.innerHTML = `
    <span class="text-slate-600 shrink-0 font-mono text-[10px] select-none">[${timeStr}]</span>
    ${typeBadge}
    <span class="${textClass} break-all font-mono">${escapeHtml(message)}</span>
  `;

  // Apply current filter
  if (state.logFilter !== 'ALL' && state.logFilter !== type) {
    row.style.display = 'none';
  }

  elements.terminalConsole.appendChild(row);

  // Auto scroll to bottom
  if (elements.chkAutoScroll && elements.chkAutoScroll.checked) {
    elements.terminalConsole.scrollTop = elements.terminalConsole.scrollHeight;
  }
}

/**
 * Filter Terminal logs by type (ALL, RX, TX)
 */
function filterLogs(filterType) {
  state.logFilter = filterType;
  if (elements.filterAll) {
    elements.filterAll.className = filterType === 'ALL' ? "px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold" : "px-2 py-0.5 rounded text-slate-400 hover:text-slate-200";
  }
  if (elements.filterRx) {
    elements.filterRx.className = filterType === 'RX' ? "px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800" : "px-2 py-0.5 rounded text-slate-400 hover:text-slate-200";
  }
  if (elements.filterTx) {
    elements.filterTx.className = filterType === 'TX' ? "px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800" : "px-2 py-0.5 rounded text-slate-400 hover:text-slate-200";
  }

  if (elements.terminalConsole) {
    const rows = elements.terminalConsole.querySelectorAll('.log-row');
    rows.forEach(r => {
      if (filterType === 'ALL' || r.dataset.type === filterType) {
        r.style.display = 'flex';
      } else {
        r.style.display = 'none';
      }
    });
  }
}

/**
 * Floating Studio Toast Notification System
 */
function showStudioToast(title, message, type = 'info') {
  const container = elements.toastContainer || document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'glass-panel p-3.5 rounded-2xl shadow-2xl border flex items-start gap-3 transition-all duration-300 transform translate-y-3 opacity-0 pointer-events-auto backdrop-blur-xl';
  
  let borderClass = 'border-cyan-500/50 bg-[#0f172a]/95 text-cyan-200';
  let iconSvg = `<svg class="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  if (type === 'success') {
    borderClass = 'border-emerald-500/60 bg-[#0b1b1b]/95 text-emerald-200';
    iconSvg = `<svg class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
  } else if (type === 'warn') {
    borderClass = 'border-amber-500/60 bg-[#1c150b]/95 text-amber-200';
    iconSvg = `<svg class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
  }

  toast.className += ` ${borderClass}`;
  toast.innerHTML = `
    ${iconSvg}
    <div class="flex-1">
      <div class="text-xs font-bold text-white">${escapeHtml(title)}</div>
      <div class="text-[11px] text-slate-300 mt-0.5">${escapeHtml(message)}</div>
    </div>
  `;

  container.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-6');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3800);
}

/**
 * Menampilkan peringatan browser jika tidak mendukung Web Bluetooth
 */
function showBrowserWarning() {
  if (elements.browserWarningBanner) elements.browserWarningBanner.classList.remove('hidden');
  if (elements.browserWarningText && location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    elements.browserWarningText.textContent = 'Web Bluetooth API mewajibkan konteks aman HTTPS atau Localhost (bukan file:// atau HTTP mentah). Anda dapat menggunakan localhost web server atau menyalakan Demo Mode.';
  }
}

/**
 * Update Connection UI
 */
function updateConnectionUI(connected, deviceName = 'Sinilink-APP') {
  if (connected) {
    if (elements.statusLedDot) elements.statusLedDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]";
    if (elements.statusLedRing) elements.statusLedRing.classList.remove('hidden');
    if (elements.connectionStateLabel) {
      elements.connectionStateLabel.textContent = 'CONNECTED';
      elements.connectionStateLabel.className = 'text-xs font-semibold uppercase tracking-wider text-emerald-400';
    }
    if (elements.connectedDeviceName) elements.connectedDeviceName.textContent = deviceName;

    if (elements.btnConnect) elements.btnConnect.classList.add('hidden');
    if (elements.btnDisconnect) elements.btnDisconnect.classList.remove('hidden');
  } else {
    if (elements.statusLedDot) elements.statusLedDot.className = "w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]";
    if (elements.statusLedRing) elements.statusLedRing.classList.add('hidden');
    if (elements.connectionStateLabel) {
      elements.connectionStateLabel.textContent = 'DISCONNECTED';
      elements.connectionStateLabel.className = 'text-xs font-semibold uppercase tracking-wider text-slate-400';
    }

    if (state.rememberedDevice) {
      const remName = state.rememberedDevice.name || 'Sinilink-APP';
      if (elements.connectedDeviceName) elements.connectedDeviceName.textContent = `${remName} (Siap)`;
      if (elements.btnConnectLabel) elements.btnConnectLabel.textContent = `Sambung Cepat (${remName})`;
      if (elements.btnConnect) {
        elements.btnConnect.classList.add('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-slate-900');
        elements.btnConnect.title = `Klik untuk langsung menghubungkan kembali ke ${remName} tanpa scan`;
      }
    } else {
      if (elements.connectedDeviceName) elements.connectedDeviceName.textContent = 'No Device';
      if (elements.btnConnectLabel) elements.btnConnectLabel.textContent = 'Connect BLE';
      if (elements.btnConnect) {
        elements.btnConnect.classList.remove('ring-2', 'ring-cyan-400', 'ring-offset-2', 'ring-offset-slate-900');
        elements.btnConnect.title = 'Koneksikan ke perangkat BLE';
      }
    }

    if (elements.btnConnect) elements.btnConnect.classList.remove('hidden');
    if (elements.btnDisconnect) elements.btnDisconnect.classList.add('hidden');
  }
}

/**
 * Update Volume in State and UI
 */
function updateVolumeUI(vol, sendCommand = true) {
  const maxVol = (typeof MAX_VOLUME !== 'undefined' ? MAX_VOLUME : 29);
  const clampedVol = Math.max(0, Math.min(maxVol, parseInt(vol)));
  state.volume = clampedVol;

  if (clampedVol > 0) {
    state.savedVolume = clampedVol;
    state.isMuted = false;
    if (elements.btnMuteToggle) elements.btnMuteToggle.classList.remove('bg-rose-500/30', 'border-rose-500', 'text-rose-300');
    if (elements.muteBtnLabel) elements.muteBtnLabel.textContent = 'MUTE';
  } else {
    state.isMuted = true;
    if (elements.btnMuteToggle) elements.btnMuteToggle.classList.add('bg-rose-500/30', 'border-rose-500', 'text-rose-300');
    if (elements.muteBtnLabel) elements.muteBtnLabel.textContent = 'MUTED';
  }

  // Update Digital Displays
  if (elements.knobVolVal) elements.knobVolVal.textContent = clampedVol;
  if (elements.volumeSlider) elements.volumeSlider.value = clampedVol;
  const percent = Math.round((clampedVol / maxVol) * 100);
  if (elements.volPercentLabel) elements.volPercentLabel.textContent = `${percent}%`;
  if (elements.volHexLabel) elements.volHexLabel.textContent = `0x${clampedVol.toString(16).padStart(2, '0').toUpperCase()}`;
  
  // Approximate dB Gain display (0.0 dB at 29 MAX / 0x1D)
  const db = clampedVol === maxVol ? '0.0 dB' : (clampedVol === 0 ? '-∞ dB' : `${((clampedVol - maxVol) * 1.5).toFixed(1)} dB`);
  if (elements.volDbLabel) elements.volDbLabel.textContent = db;

  // Update Rotary Knob Needle & SVG Arc (-135deg to +135deg)
  const angle = -135 + (clampedVol / maxVol) * 270;
  if (elements.knobBody) elements.knobBody.style.transform = `rotate(${angle}deg)`;

  // SVG Arc stroke-dashoffset: 447.67 is 0%, 0 is 100%
  const maxOffset = 447.67;
  const progressFraction = clampedVol / maxVol;
  const currentOffset = maxOffset - (progressFraction * maxOffset);
  if (elements.knobSvgProgress) elements.knobSvgProgress.style.strokeDashoffset = currentOffset;

  // Send to Bluetooth Amplifier (Debounced)
  if (sendCommand) {
    clearTimeout(state.writeDebounceTimer);
    state.writeDebounceTimer = setTimeout(() => {
      const packet = buildVolumePacket(clampedVol);
      sendPacketToAmp(packet, `Set Volume ${clampedVol}/${maxVol}`);
    }, 35);
  }
}

/**
 * Mute / Unmute Toggle
 */
function toggleMute() {
  if (state.volume > 0) {
    state.savedVolume = state.volume;
    updateVolumeUI(0, true);
  } else {
    const restore = state.savedVolume > 0 ? state.savedVolume : 15;
    updateVolumeUI(restore, true);
  }
}

/**
 * Update Active Source
 */
function updateSourceUI(sourceKey, sendCommand = true) {
  state.source = sourceKey;
  const nameMap = {
    'BT': 'BLUETOOTH',
    'AUX': 'AUX INPUT',
    'USB': 'USB DISK',
    'PC': 'PC SOUNDCARD'
  };
  if (elements.activeSourceBadge) elements.activeSourceBadge.textContent = nameMap[sourceKey] || sourceKey;

  if (elements.sourceButtons) {
    elements.sourceButtons.forEach(btn => {
      if (btn.dataset.source === sourceKey) {
        btn.className = "src-btn active tactile-btn h-11 sm:h-12 py-1 px-1 rounded-xl bg-cyan-950/80 border-2 border-cyan-400 text-cyan-200 flex flex-col items-center justify-center gap-0.5 shadow-glow-cyan";
        const svg = btn.querySelector('svg');
        if (svg) svg.className = "w-4 h-4 text-cyan-300";
      } else {
        btn.className = "src-btn tactile-btn h-11 sm:h-12 py-1 px-1 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 flex flex-col items-center justify-center gap-0.5";
        const svg = btn.querySelector('svg');
        if (svg) svg.className = "w-4 h-4 text-slate-400";
      }
    });
  }

  if (sendCommand) {
    const sourceByteMap = { 'BT': 0x14, 'AUX': 0x16, 'USB': 0x04, 'PC': 0x15 };
    const cmdByte = sourceByteMap[sourceKey] || 0x14;
    const packet = build5BytePacket(cmdByte, 0x00);
    sendPacketToAmp(packet, `Switch Source -> ${nameMap[sourceKey]}`);
  }
}

/**
 * Update Equalizer Preset & Dynamic Curve Preview
 */
function updateEqUI(eqName, sendCommand = true) {
  state.eqMode = eqName;
  if (elements.activeEqBadge) elements.activeEqBadge.textContent = eqName.toUpperCase();

  const presetCurves = {
    'Normal': [0, 0, 0, 0, 0, 0, 0],
    'Rock': [5, 3, -1, -2, 1, 4, 6],
    'Pop': [1, 3, 5, 4, 2, -1, -2],
    'Classic': [4, 3, 2, 0, 1, 4, 5],
    'Jazz': [4, 3, 1, 2, -1, 2, 3],
    'Country': [2, 1, 0, 1, 3, 4, 4]
  };

  if (presetCurves[eqName]) {
    state.eqBands = [...presetCurves[eqName]];
    renderEqCurve();
    for (let i = 0; i < 7; i++) {
      const slider = document.getElementById(`eqBand${i}`);
      const label = document.getElementById(`eqLabel${i}`);
      if (slider) slider.value = state.eqBands[i];
      if (label) {
        label.textContent = state.eqBands[i] > 0 ? `+${state.eqBands[i]}dB` : (state.eqBands[i] === 0 ? '0dB' : `${state.eqBands[i]}dB`);
        label.className = state.eqBands[i] > 0 
          ? 'text-[9px] font-mono font-bold text-cyan-300' 
          : (state.eqBands[i] < 0 ? 'text-[9px] font-mono font-bold text-rose-400' : 'text-[9px] font-mono text-slate-400');
      }
    }
  }

  if (elements.eqButtons) {
    elements.eqButtons.forEach(btn => {
      if (btn.dataset.eq.toLowerCase() === eqName.toLowerCase()) {
        btn.className = "eq-btn active tactile-btn h-12 p-1.5 rounded-xl bg-emerald-950/70 border-2 border-emerald-400 text-white flex flex-col items-center justify-center gap-0.5 transition shadow-glow-emerald";
        const svg = btn.querySelector('svg');
        if (svg) svg.classList.add('text-emerald-300');
      } else {
        btn.className = "eq-btn tactile-btn h-12 p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 flex flex-col items-center justify-center gap-0.5 transition";
        const svg = btn.querySelector('svg');
        if (svg) svg.classList.remove('text-emerald-300');
      }
    });
  }

  if (sendCommand) {
    const eqByteMap = {
      'Normal': 0x09,
      'Rock': 0x0A,
      'Pop': 0x0B,
      'Classic': 0x0C,
      'Jazz': 0x0D,
      'Country': 0x0E
    };
    const eqByte = eqByteMap[eqName] || 0x09;
    const packet = (state.eqPacketFormat === '15byte') 
      ? build15BytePacket(eqByte, 0x00)
      : build5BytePacket(eqByte, 0x00);
    sendPacketToAmp(packet, `Set EQ Preset -> ${eqName} (${state.eqPacketFormat === '15byte' ? '15-Byte' : '5-Byte'})`);
  }
}

/**
 * Switch Equalizer Mode: 'presets' or 'manual'
 */
function switchEqView(mode) {
  state.eqViewMode = mode;
  if (!elements.btnEqTabPresets || !elements.btnEqTabManual || !elements.eqPresetsView || !elements.eqManualView) return;

  if (mode === 'presets') {
    elements.btnEqTabPresets.className = "px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-700/60 transition shadow-glow-emerald";
    elements.btnEqTabManual.className = "px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 transition";
    elements.eqPresetsView.classList.remove('hidden');
    elements.eqManualView.classList.add('hidden');
    if (elements.activeEqBadge) elements.activeEqBadge.textContent = state.eqMode.toUpperCase();
  } else {
    elements.btnEqTabPresets.className = "px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-200 transition";
    elements.btnEqTabManual.className = "px-2.5 py-1 rounded-lg bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-700/60 transition shadow-glow-cyan";
    elements.eqPresetsView.classList.add('hidden');
    elements.eqManualView.classList.remove('hidden');
    renderEqCurve();
    evaluateManualEqToHardware(false);
  }
}

/**
 * Render smooth SVG frequency response curve and filled area
 */
function renderEqCurve() {
  if (!elements.eqCurvePath || !elements.eqCurveArea) return;

  const points = [];
  const xCoords = [20, 66.7, 113.3, 160, 206.7, 253.3, 300];

  for (let i = 0; i < 7; i++) {
    const val = (state.eqBands && typeof state.eqBands[i] === 'number') ? state.eqBands[i] : 0;
    const y = 30 - (val / 12) * 22;
    points.push({ x: xCoords[i], y });
  }

  // Generate smooth cubic bezier curve
  let dCurve = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX1 = p0.x + (p1.x - p0.x) / 2;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (p1.x - p0.x) / 2;
    const cpY2 = p1.y;
    dCurve += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }

  elements.eqCurvePath.setAttribute('d', dCurve);

  // Generate area path closed to bottom baseline (y = 58)
  const dArea = `${dCurve} L ${points[points.length - 1].x} 58 L ${points[0].x} 58 Z`;
  elements.eqCurveArea.setAttribute('d', dArea);
}

/**
 * Evaluates manual EQ curve and maps to closest hardware DSP profile on the amplifier
 * Terkalibrasi untuk Woofer 3" LG-6015 (roll-off 6kHz) + Tweeter Silk Dome 1.5" dalam Box 1.62L
 */
function evaluateManualEqToHardware(sendCommand = true) {
  const bands = state.eqBands || [0, 0, 0, 0, 0, 0, 0];

  // 1. Kalibrasi Akustik Titik Crossover Speaker Rakitan:
  // - Bass: 60Hz - 200Hz (Bands 0 & 1, resonansi Box MDF 1.62L)
  // - Mid: 250Hz - 5.5kHz (Bands 2, 3, & 4, rentang kerja utama woofer 3" LG-6015)
  // - Treble: 6kHz - 16kHz (Bands 5 & 6, rentang kerja murni Tweeter Silk Dome 1.5" HiFi Fever)
  const bass = (bands[0] + bands[1]) / 2;
  const mid = (bands[2] + bands[3] + bands[4]) / 3;
  const treble = (bands[5] + bands[6]) / 2;

  // 2. Deteksi Overlap Warning 3kHz - 5kHz (Antara Band 4 @ 2.4k dan Band 5 @ 6k)
  const overlapWarningEl = document.getElementById('eqAcousticOverlapWarning');
  const isOverlapHarsh = (bands[4] >= 6 || bands[5] >= 6 || (bands[4] >= 4 && bands[5] >= 4));
  if (overlapWarningEl) {
    if (isOverlapHarsh) {
      overlapWarningEl.classList.remove('hidden');
    } else {
      overlapWarningEl.classList.add('hidden');
    }
  }

  let bestPreset = 'Normal';
  if (bass >= 3 && treble >= 3 && mid <= 1) {
    bestPreset = 'Rock';
  } else if (mid >= 3 && treble <= 2) {
    bestPreset = 'Pop';
  } else if (bass >= 4 && treble <= 0) {
    bestPreset = 'Jazz';
  } else if (treble >= 4 && bass <= 0) {
    bestPreset = 'Classic';
  } else if (mid >= 2 && treble >= 2) {
    bestPreset = 'Country';
  } else {
    bestPreset = 'Normal';
  }

  if (elements.activeEqBadge && state.eqViewMode === 'manual') {
    elements.activeEqBadge.textContent = `MANUAL: ${bestPreset.toUpperCase()} DSP`;
  }
  if (elements.eqHardwareSyncText) {
    elements.eqHardwareSyncText.textContent = `⚡ Auto-Synced ke Hardware DSP: ${bestPreset.toUpperCase()}`;
  }

  if (sendCommand) {
    clearTimeout(state.eqDebounceTimer);
    state.eqDebounceTimer = setTimeout(() => {
      const eqByteMap = { 'Normal': 0x09, 'Rock': 0x0A, 'Pop': 0x0B, 'Classic': 0x0C, 'Jazz': 0x0D, 'Country': 0x0E };
      const cmdByte = eqByteMap[bestPreset] || 0x09;
      const packet = (state.eqPacketFormat === '15byte')
        ? build15BytePacket(cmdByte, 0x00)
        : build5BytePacket(cmdByte, 0x00);
      sendPacketToAmp(packet, `Manual EQ -> Sync DSP ${bestPreset} (${state.eqPacketFormat === '15byte' ? '15-Byte' : '5-Byte'})`);
      logTerminal('AUDIO', `🎚️ Manual EQ terkalibrasi: [Bass(60-200Hz): ${bass > 0 ? '+' : ''}${bass.toFixed(1)}dB, Mid(250Hz-5.5k): ${mid > 0 ? '+' : ''}${mid.toFixed(1)}dB, Treble(6-16k): ${treble > 0 ? '+' : ''}${treble.toFixed(1)}dB] -> DSP: ${bestPreset}`, 'info');
    }, 350);
  }
}

/**
 * Update single manual EQ band
 */
function updateManualEqBand(bandIdx, val, sendCommand = true) {
  const clamped = Math.max(-12, Math.min(12, parseInt(val) || 0));
  state.eqBands[bandIdx] = clamped;

  const labelEl = document.getElementById(`eqLabel${bandIdx}`);
  if (labelEl) {
    labelEl.textContent = clamped > 0 ? `+${clamped}dB` : (clamped === 0 ? '0dB' : `${clamped}dB`);
    labelEl.className = clamped > 0 
      ? 'text-[10px] font-mono font-bold text-cyan-300' 
      : (clamped < 0 ? 'text-[10px] font-mono font-bold text-rose-400' : 'text-[10px] font-mono text-slate-400');
  }

  const sliderEl = document.getElementById(`eqBand${bandIdx}`);
  if (sliderEl && parseInt(sliderEl.value) !== clamped) {
    sliderEl.value = clamped;
  }

  renderEqCurve();

  try {
    localStorage.setItem('sinilink_manual_eq', JSON.stringify(state.eqBands));
  } catch (_) {}

  evaluateManualEqToHardware(sendCommand);
}

/**
 * Apply curated quick curve (flat, bass, treble, vshape, vocal)
 */
function applyQuickEqCurve(curveKey) {
  const curves = typeof QUICK_EQ_CURVES !== 'undefined' ? QUICK_EQ_CURVES : {
    'flat': [0, 0, 0, 0, 0, 0, 0],
    'bass': [8, 6, 3, 0, 0, 0, 0],
    'treble': [0, 0, 0, 1, 3, 6, 8],
    'vshape': [7, 4, -1, -2, 0, 4, 7],
    'vocal': [1, 2, 5, 6, 4, 1, 0]
  };

  const curve = curves[curveKey] || curves['flat'];
  for (let i = 0; i < 7; i++) {
    updateManualEqBand(i, curve[i], false);
  }
  evaluateManualEqToHardware(true);
  showStudioToast('🎚️ Curve Applied', `Preset EQ manual "${curveKey.toUpperCase()}" aktif.`, 'info');
}

/**
 * Restore saved manual EQ from localStorage
 */
function restoreManualEq() {
  try {
    const saved = localStorage.getItem('sinilink_manual_eq');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 7) {
        state.eqBands = parsed;
        for (let i = 0; i < 7; i++) {
          updateManualEqBand(i, parsed[i], false);
        }
      }
    }
  } catch (_) {}
  renderEqCurve();
}

/**
 * Update Now Playing Metadata (from MediaSessionBridge or BLE)
 */
function updateNowPlayingUI(metadata) {
  if (!metadata) return;
  const titleEl = elements.nowPlayingTitle || document.getElementById('nowPlayingTitle');
  const artistEl = elements.nowPlayingArtist || document.getElementById('nowPlayingArtist');
  const artImg = elements.nowPlayingArt || document.getElementById('nowPlayingArt');
  const disc = elements.nowPlayingDisc || document.getElementById('nowPlayingDisc');

  if (titleEl && metadata.title) titleEl.textContent = metadata.title;
  if (artistEl && metadata.artist) artistEl.textContent = metadata.artist;
  if (artImg && metadata.artwork) {
    artImg.src = metadata.artwork;
    artImg.classList.remove('hidden');
    if (disc) disc.classList.add('hidden');
  }
}

/**
 * Update Playback State UI (Animations & Badges)
 */
function updatePlaybackUI(isPlaying) {
  state.isPlaying = isPlaying;
  
  if (elements.playbackStatusBadge) {
    if (isPlaying) {
      elements.playbackStatusBadge.textContent = 'PLAYING';
      elements.playbackStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-glow-emerald';
    } else {
      elements.playbackStatusBadge.textContent = 'PAUSED';
      elements.playbackStatusBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700';
    }
  }

  if (elements.playPauseLabel) {
    elements.playPauseLabel.textContent = isPlaying ? 'PAUSE' : 'PLAY';
  }

  // Animate spinning vinyl disc & soundbar visualizer
  const disc = elements.nowPlayingDisc || document.getElementById('nowPlayingDisc');
  if (disc) {
    if (isPlaying) {
      disc.classList.add('animate-spin-slow');
    } else {
      disc.classList.remove('animate-spin-slow');
    }
  }

  const bars = document.querySelectorAll('.now-playing-bar');
  bars.forEach((bar, idx) => {
    if (isPlaying) {
      bar.classList.add(`bar-anim-${(idx % 4) + 1}`);
    } else {
      bar.classList.remove(`bar-anim-${(idx % 4) + 1}`);
      bar.style.height = '4px';
    }
  });
}


/**
 * Setup Rotary Knob Drag, Touch, and Wheel listeners
 */
function setupRotaryKnob() {
  const knob = elements.rotaryKnob;
  if (!knob) return;

  let startAngle = 0;
  let startVol = state.volume;

  function getAngleFromCenter(clientX, clientY) {
    const rect = knob.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    let deg = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    deg = deg + 90;
    if (deg > 180) deg -= 360;
    return deg;
  }

  function onPointerDown(e) {
    if (e.cancelable) e.preventDefault();
    state.isDraggingKnob = true;
    const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    startAngle = getAngleFromCenter(clientX, clientY);
    startVol = state.volume;

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);
  }

  function onPointerMove(e) {
    if (!state.isDraggingKnob) return;
    if (e.cancelable) e.preventDefault();

    const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    if (clientX === undefined || clientY === undefined) return;

    const currentAngle = getAngleFromCenter(clientX, clientY);

    let deltaAngle = currentAngle - startAngle;
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    const maxVol = state.maxVolume || 29;
    const degPerStep = 270 / maxVol;
    const stepChange = Math.round(deltaAngle / degPerStep);
    const newVol = Math.max(0, Math.min(maxVol, startVol + stepChange));

    if (newVol !== state.volume) {
      updateVolumeUI(newVol, true);
    }
  }

  function onPointerUp() {
    state.isDraggingKnob = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('touchmove', onPointerMove);
    window.removeEventListener('touchend', onPointerUp);
    window.removeEventListener('touchcancel', onPointerUp);
  }

  knob.addEventListener('pointerdown', onPointerDown);
  knob.addEventListener('touchstart', onPointerDown, { passive: false });

  // Mouse Wheel Support on Knob
  knob.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    updateVolumeUI(state.volume + delta, true);
  }, { passive: false });
}

/**
 * Setup 16-segment VU Meter bars
 */
function setupVuMeters() {
  if (!elements.vuLeftTrack || !elements.vuRightTrack) return;

  const segmentColors = [
    'bg-emerald-500', 'bg-emerald-500', 'bg-emerald-500', 'bg-emerald-500',
    'bg-emerald-400', 'bg-emerald-400', 'bg-emerald-400', 'bg-emerald-400',
    'bg-cyan-400',    'bg-cyan-400',    'bg-cyan-400',    'bg-amber-400',
    'bg-amber-400',   'bg-amber-500',   'bg-rose-500',    'bg-rose-500'
  ];

  function renderChannelSegments(container) {
    container.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const seg = document.createElement('div');
      seg.className = `flex-1 rounded-sm opacity-20 transition-opacity duration-75 ${segmentColors[i]}`;
      seg.dataset.index = i;
      container.appendChild(seg);
    }
  }

  renderChannelSegments(elements.vuLeftTrack);
  renderChannelSegments(elements.vuRightTrack);

  setInterval(() => {
    const maxVol = state.maxVolume || 29;
    const isLive = (state.isConnected || state.isDemoMode) && state.volume > 0;
    const maxLevel = isLive ? Math.ceil((state.volume / maxVol) * 16) : 0;

    const leftCount = isLive ? Math.max(1, Math.min(16, maxLevel - Math.floor(Math.random() * 4))) : 0;
    const rightCount = isLive ? Math.max(1, Math.min(16, maxLevel - Math.floor(Math.random() * 4))) : 0;

    const leftSegs = elements.vuLeftTrack.children;
    for (let i = 0; i < 16; i++) {
      if (i < leftCount) {
        leftSegs[i].classList.remove('opacity-20');
        leftSegs[i].classList.add('opacity-100');
      } else {
        leftSegs[i].classList.add('opacity-20');
        leftSegs[i].classList.remove('opacity-100');
      }
    }

    const rightSegs = elements.vuRightTrack.children;
    for (let i = 0; i < 16; i++) {
      if (i < rightCount) {
        rightSegs[i].classList.remove('opacity-20');
        rightSegs[i].classList.add('opacity-100');
      } else {
        rightSegs[i].classList.add('opacity-20');
        rightSegs[i].classList.remove('opacity-100');
      }
    }

    if (elements.vuPeakL && elements.vuPeakR) {
      if (isLive) {
        elements.vuPeakL.textContent = `${(-24 + leftCount * 1.5).toFixed(0)}dB`;
        elements.vuPeakR.textContent = `${(-24 + rightCount * 1.5).toFixed(0)}dB`;
      } else {
        elements.vuPeakL.textContent = '-∞ dB';
        elements.vuPeakR.textContent = '-∞ dB';
      }
    }
  }, 90);
}

/**
 * Preview kalkulasi checksum dan byte length untuk kolom Custom Hex
 */
function updateHexInputPreview() {
  if (!elements.customHexInput) return;
  try {
    const inputStr = elements.customHexInput.value.trim();
    const bytes = hexToBytes(inputStr);
    if (elements.rawByteCount) elements.rawByteCount.textContent = `${bytes.length} Bytes`;

    if (elements.chkAutoChecksum && elements.chkAutoChecksum.checked) {
      const checksum = calculateSinilinkChecksum(bytes);
      if (elements.previewChecksumBadge) {
        elements.previewChecksumBadge.textContent = `+ 0x${checksum.toString(16).padStart(2, '0').toUpperCase()}`;
        elements.previewChecksumBadge.classList.remove('hidden');
      }

      const finalArray = new Uint8Array(bytes.length + 1);
      finalArray.set(bytes, 0);
      finalArray[bytes.length] = checksum;
      if (elements.finalPayloadPreview) elements.finalPayloadPreview.textContent = bytesToHex(finalArray);
    } else {
      if (elements.previewChecksumBadge) elements.previewChecksumBadge.classList.add('hidden');
      if (elements.finalPayloadPreview) elements.finalPayloadPreview.textContent = bytesToHex(bytes);
    }
  } catch (e) {
    if (elements.rawByteCount) elements.rawByteCount.textContent = 'Invalid Hex';
    if (elements.finalPayloadPreview) elements.finalPayloadPreview.textContent = 'Format Hex Salah!';
  }
}

/**
 * Toggle Virtual Demo Mode
 */
function toggleDemoMode() {
  state.isDemoMode = !state.isDemoMode;
  if (state.isDemoMode) {
    updateConnectionUI(true, 'Sinilink-APP (DEMO)');
    if (elements.demoBadge) elements.demoBadge.classList.remove('hidden');
    logTerminal('SYS', 'Virtual Demo Mode diaktifkan. Anda dapat menguji seluruh UI dan paket!', 'success');
    
    // Kirim simulasi status frame awal
    setTimeout(() => {
      const sampleNotify = new Uint8Array([
        0x7E, 0x10, 0x1F, 0x01, 0x00, 0x1B, 0x31, 0x32, 0x33, 0x34, 0x00, 0x00, 0x00, 0x00, 0x01, 0x93
      ]);
      decodePacket(sampleNotify);
    }, 300);
  } else {
    updateConnectionUI(false);
    if (elements.demoBadge) elements.demoBadge.classList.add('hidden');
    logTerminal('SYS', 'Demo Mode dimatikan.', 'warn');
  }
}

/**
 * Simulasi respons perangkat pada mode Virtual Demo
 */
function simulateDemoResponse(txPacket) {
  setTimeout(() => {
    // If volume write
    if (txPacket[1] === 0x0F && txPacket[2] === 0x1D) {
      const newVol = txPacket[3];
      const responsePacket = [
        0x7E, 0x10, 0x1F, 0x01, 0x00, newVol, 0x31, 0x32, 0x33, 0x34, 0x00, 0x00, 0x00, 0x00, 0x01
      ];
      responsePacket.push(calculateSinilinkChecksum(responsePacket));
      decodePacket(new Uint8Array(responsePacket));
    }
    // If source change
    else if (txPacket[1] === 0x05 && [0x14, 0x16, 0x04, 0x15].includes(txPacket[2])) {
      const sourceByte = txPacket[2];
      const responsePacket = [
        0x7E, 0x0F, 0x1E, 0x00, sourceByte, 0x02, state.volume, 0x00, 0x09, 0x00, 0x00, 0x00, 0x00, 0x00
      ];
      responsePacket.push(calculateSinilinkChecksum(responsePacket));
      decodePacket(new Uint8Array(responsePacket));
    }
    // If query status
    else if (txPacket[2] === 0x1F) {
      const responsePacket = [
        0x7E, 0x10, 0x1F, 0x01, 0x00, state.volume, 0x31, 0x32, 0x33, 0x34, 0x00, 0x00, 0x00, 0x00, 0x01
      ];
      responsePacket.push(calculateSinilinkChecksum(responsePacket));
      decodePacket(new Uint8Array(responsePacket));
    }
  }, 120);
}

