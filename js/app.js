/**
 * SINILINK XY-C100L WEB BLE AUDIO DASHBOARD - MAIN APPLICATION ENTRY POINT
 */

function init() {
  // 1. Inisialisasi cache DOM Elements
  initElements();

  // 2. Periksa kompatibilitas Web Bluetooth browser
  if (!navigator.bluetooth) {
    showBrowserWarning();
  }

  // 3. Setup Rotary Knob & VU Meters
  setupRotaryKnob();
  setupVuMeters();

  // 4. Inisialisasi UI state awal (0–100 Scale)
  updateVolumeUI(93, false);
  updateHexInputPreview();
  if (typeof restoreManualEq === 'function') {
    restoreManualEq();
  }

  // Connect Android / Web MediaSession Bridge
  if (window.MediaSessionBridge) {
    window.MediaSessionBridge.init();
    window.MediaSessionBridge.subscribe((meta) => {
      if (typeof updateNowPlayingUI === 'function') {
        updateNowPlayingUI(meta);
      }
    });
  }

  // Global helper for native action callbacks & MediaSession
  window.bleApp = {
    togglePlay: () => {
      const packet = build5BytePacket(0x01, 0x00);
      sendPacketToAmp(packet, 'Toggle Play / Pause (0x01)');
      updatePlaybackUI(!state.isPlaying);
    },
    prevTrack: () => {
      const packet = build5BytePacket(0x07, 0x00);
      sendPacketToAmp(packet, 'Previous Track (0x07)');
    },
    nextTrack: () => {
      const packet = build5BytePacket(0x08, 0x00);
      sendPacketToAmp(packet, 'Next Track (0x08)');
    }
  };


  // 5. BLE Connection buttons
  if (elements.btnConnect) {
    elements.btnConnect.addEventListener('click', () => connectBLE(false));
  }
  if (elements.btnScanNew) {
    elements.btnScanNew.addEventListener('click', () => connectBLE(true));
  }
  if (elements.btnDisconnect) {
    elements.btnDisconnect.addEventListener('click', disconnectBLE);
  }
  if (elements.btnForgetDevice) {
    elements.btnForgetDevice.addEventListener('click', forgetDevice);
  }

  // 6. Help Modal triggers
  const openHelp = () => {
    if (elements.bleHelpModal) elements.bleHelpModal.classList.remove('hidden');
  };
  const closeHelp = () => {
    if (elements.bleHelpModal) elements.bleHelpModal.classList.add('hidden');
  };

  if (elements.btnBleHelp) elements.btnBleHelp.addEventListener('click', openHelp);
  if (elements.btnMenuHelp) elements.btnMenuHelp.addEventListener('click', openHelp);
  if (elements.btnCloseBleHelp) elements.btnCloseBleHelp.addEventListener('click', closeHelp);
  if (elements.btnDismissBleHelp) elements.btnDismissBleHelp.addEventListener('click', closeHelp);
  if (elements.bleHelpModal) {
    elements.bleHelpModal.addEventListener('click', (e) => {
      if (e.target === elements.bleHelpModal) closeHelp();
    });
  }

  // 7. Auto-disconnect pada window unload / refresh agar Bluetooth stack OS tidak mengunci koneksi
  window.addEventListener('beforeunload', () => {
    if (state.notifyChar) {
      try { state.notifyChar.stopNotifications(); } catch (_) {}
    }
    if (state.device && state.device.gatt && state.device.gatt.connected) {
      try { state.device.gatt.disconnect(); } catch (_) {}
    }
  });

  // 8. Cek perangkat tersimpan saat aplikasi dimuat
  checkRememberedDevice();

  // 9. Developer Mode Modal & BLE Settings
  const devModal = document.getElementById('devToolsModal');
  const btnCloseDevModal = document.getElementById('btnCloseDevModal');

  if (elements.btnBleOptions && devModal) {
    elements.btnBleOptions.addEventListener('click', (e) => {
      e.stopPropagation();
      devModal.classList.toggle('hidden');
    });
  }

  if (btnCloseDevModal && devModal) {
    btnCloseDevModal.addEventListener('click', () => {
      devModal.classList.add('hidden');
    });
  }

  if (devModal) {
    devModal.addEventListener('click', (e) => {
      if (e.target === devModal) {
        devModal.classList.add('hidden');
      }
    });
  }

  if (elements.selWriteChar) {
    elements.selWriteChar.addEventListener('change', () => {
      const val = elements.selWriteChar.value;
      if (state.charMap && state.charMap[val]) {
        state.writeChar = state.charMap[val];
        logTerminal('SYS', `Target Write Characteristic diubah ke: ${val}`, 'info');
      } else if (val === 'ALL') {
        logTerminal('SYS', `Target Write Characteristic diubah ke: Broadcast ALL`, 'info');
      }
    });
  }

  if (elements.selMaxVolume) {
    elements.selMaxVolume.addEventListener('change', () => {
      const newMax = parseInt(elements.selMaxVolume.value) || 29;
      state.maxVolume = newMax;
      if (elements.knobVolMax) elements.knobVolMax.textContent = newMax;
      if (elements.volumeSlider) elements.volumeSlider.max = newMax;
      updateVolumeUI(state.volume, false);
      logTerminal('SYS', `Skala volume maksimal diatur ke: ${newMax} (Standar mentok 0x${newMax.toString(16).toUpperCase()})`, 'info');
    });
  }

  if (elements.selEqPacketFormat) {
    elements.selEqPacketFormat.addEventListener('change', () => {
      state.eqPacketFormat = elements.selEqPacketFormat.value;
      logTerminal('SYS', `Format transmisi perintah EQ diubah ke: ${state.eqPacketFormat === '15byte' ? '15-Byte Extended Frame' : '5-Byte Short Command'}`, 'info');
    });
  }

  // 12. Demo Mode buttons
  if (elements.btnToggleDemoMode) elements.btnToggleDemoMode.addEventListener('click', toggleDemoMode);
  if (elements.btnDemoModeToggle) elements.btnDemoModeToggle.addEventListener('click', toggleDemoMode);

  // 13. Volume Slider & Step Buttons
  if (elements.volumeSlider) {
    elements.volumeSlider.addEventListener('input', (e) => {
      updateVolumeUI(parseInt(e.target.value), true);
    });
  }

  if (elements.btnVolStepMinus5) elements.btnVolStepMinus5.addEventListener('click', () => updateVolumeUI(state.volume - 5, true));
  if (elements.btnVolStepMinus1) elements.btnVolStepMinus1.addEventListener('click', () => updateVolumeUI(state.volume - 1, true));
  if (elements.btnVolStepPlus1) elements.btnVolStepPlus1.addEventListener('click', () => updateVolumeUI(state.volume + 1, true));
  if (elements.btnVolStepPlus5) elements.btnVolStepPlus5.addEventListener('click', () => updateVolumeUI(state.volume + 5, true));
  if (elements.btnMuteToggle) elements.btnMuteToggle.addEventListener('click', toggleMute);

  // 14. Transport Buttons
  if (elements.btnPlayPause) {
    elements.btnPlayPause.addEventListener('click', () => {
      const packet = build5BytePacket(0x01, 0x00);
      sendPacketToAmp(packet, 'Toggle Play / Pause (0x01)');
      updatePlaybackUI(!state.isPlaying);
    });
  }
  if (elements.btnPrevTrack) {
    elements.btnPrevTrack.addEventListener('click', () => {
      const packet = build5BytePacket(0x07, 0x00);
      sendPacketToAmp(packet, 'Previous Track (0x07)');
    });
  }
  if (elements.btnNextTrack) {
    elements.btnNextTrack.addEventListener('click', () => {
      const packet = build5BytePacket(0x08, 0x00);
      sendPacketToAmp(packet, 'Next Track (0x08)');
    });
  }

  // 15. Source Buttons
  if (elements.sourceButtons) {
    elements.sourceButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        updateSourceUI(btn.dataset.source, true);
      });
    });
  }

  // 16. EQ Buttons & Manual Graphic EQ
  if (elements.eqButtons) {
    elements.eqButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        updateEqUI(btn.dataset.eq, true);
      });
    });
  }

  // EQ View Mode Tabs
  if (elements.btnEqTabPresets) {
    elements.btnEqTabPresets.addEventListener('click', () => switchEqView('presets'));
  }
  if (elements.btnEqTabManual) {
    elements.btnEqTabManual.addEventListener('click', () => switchEqView('manual'));
  }

  // 7-Band Manual EQ Sliders
  for (let i = 0; i < 7; i++) {
    const slider = document.getElementById(`eqBand${i}`);
    if (slider) {
      slider.addEventListener('input', (e) => {
        updateManualEqBand(i, e.target.value, true);
      });
    }
  }

  // Quick Curve Presets
  if (elements.btnEqReset) elements.btnEqReset.addEventListener('click', () => applyQuickEqCurve('flat'));
  if (elements.btnEqBassBoost) elements.btnEqBassBoost.addEventListener('click', () => applyQuickEqCurve('bass'));
  if (elements.btnEqTrebleBoost) elements.btnEqTrebleBoost.addEventListener('click', () => applyQuickEqCurve('treble'));
  if (elements.btnEqVShape) elements.btnEqVShape.addEventListener('click', () => applyQuickEqCurve('vshape'));
  if (elements.btnEqVocal) elements.btnEqVocal.addEventListener('click', () => applyQuickEqCurve('vocal'));

  // 17. Poll Status
  if (elements.btnQueryStatus) {
    elements.btnQueryStatus.addEventListener('click', queryDeviceStatus);
  }

  // 18. Custom Hex Input Listeners & Presets
  if (elements.customHexInput) {
    elements.customHexInput.addEventListener('input', updateHexInputPreview);
    elements.customHexInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendCustomHexCommand();
    });
  }
  if (elements.chkAutoChecksum) {
    elements.chkAutoChecksum.addEventListener('change', updateHexInputPreview);
  }
  if (elements.btnSendHex) {
    elements.btnSendHex.addEventListener('click', sendCustomHexCommand);
  }

  if (elements.presetChips) {
    elements.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (elements.customHexInput) {
          elements.customHexInput.value = chip.dataset.hex;
          updateHexInputPreview();
          sendCustomHexCommand();
        }
      });
    });
  }

  // 19. Terminal Logs Controls
  if (elements.filterAll) elements.filterAll.addEventListener('click', () => filterLogs('ALL'));
  if (elements.filterRx) elements.filterRx.addEventListener('click', () => filterLogs('RX'));
  if (elements.filterTx) elements.filterTx.addEventListener('click', () => filterLogs('TX'));

  if (elements.btnClearLog) {
    elements.btnClearLog.addEventListener('click', () => {
      if (elements.terminalConsole) {
        elements.terminalConsole.innerHTML = `
          <div class="text-slate-500 text-[11px] pb-1 border-b border-slate-900">
            [SYS] Log dibersihkan.
          </div>
        `;
      }
      state.rxCount = 0;
      state.txCount = 0;
      if (elements.rxPacketCount) elements.rxPacketCount.textContent = '0';
      if (elements.txPacketCount) elements.txPacketCount.textContent = '0';
    });
  }

  if (elements.btnCopyLog) {
    elements.btnCopyLog.addEventListener('click', () => {
      if (!elements.terminalConsole) return;
      const rows = Array.from(elements.terminalConsole.querySelectorAll('.log-row'))
        .map(r => r.textContent.trim().replace(/\s+/g, ' '))
        .join('\n');
      navigator.clipboard.writeText(rows).then(() => {
        logTerminal('SYS', 'Seluruh log berhasil disalin ke clipboard!', 'success');
      });
    });
  }
}

// Inisialisasi saat DOM sudah siap
window.addEventListener('DOMContentLoaded', init);
