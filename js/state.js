/**
 * SINILINK XY-C100L WEB BLE AUDIO DASHBOARD - APPLICATION STATE
 */

const state = {
  // Bluetooth Connection & GATT Objects
  device: null,
  rememberedDevice: null,
  server: null,
  service: null,
  writeChar: null,
  notifyChar: null,
  charMap: {},
  writableChars: [],
  isConnected: false,
  isDemoMode: false,
  isHandshaking: false,

  // Audio & Hardware Parameters
  volume: 27,          // Current volume (0 to maxVolume)
  maxVolume: 29,       // Hardware limit for XY-C100L (0x00 - 0x1D = 29 max)
  savedVolume: 27,     // Preserved level for unmute restoration
  isMuted: false,
  source: 'BT',        // 'BT', 'AUX', 'USB', 'PC'
  eqMode: 'Normal',    // 'Normal', 'Rock', 'Pop', 'Classic', 'Jazz', 'Country'
  isPlaying: false,
  promptTone: true,
  password: '1234',

  // Telemetry, Buffers & Counters
  rxBuffer: [],
  rxCount: 0,
  txCount: 0,
  logFilter: 'ALL',
  autoScroll: true,

  // Interaction & UI Timers
  vuInterval: null,
  isDraggingKnob: false,
  writeDebounceTimer: null,
  _lastDisconnectWarn: 0,

  // 7-Band Graphic Manual Equalizer State
  eqBands: [0, 0, 0, 0, 0, 0, 0], // 60Hz, 150Hz, 400Hz, 1kHz, 2.4kHz, 6kHz, 15kHz in dB
  eqViewMode: 'presets',          // 'presets' or 'manual'
  eqDebounceTimer: null,
  eqPacketFormat: '5byte'         // '5byte' (short 7E 05) or '15byte' (extended 7E 0F)
};

