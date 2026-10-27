/**
 * SINILINK XY-C100L WEB BLE AUDIO DASHBOARD - CONSTANTS & UUID SPECIFICATIONS
 */

// Hardware Maximum Volume Specification (XY-C100L: 0x00 - 0x1D = 29 MAX, 30 discrete steps)
const MAX_VOLUME = 29;

// Speaker Hardware Acoustic Specifications (Woofer 3" LG-6015 + Tweeter Silk Dome 1.5" in 1.62L MDF Box)
const SPEAKER_SPECS = {
  boxVolumeLiters: 1.62,
  boxMaterial: 'MDF',
  wooferModel: 'LG-6015 3-inch',
  wooferRollOffHz: 6000,
  tweeterModel: 'Silk Dome 1.5-inch HiFi Fever',
  crossoverBandBass: [60, 200],       // Resonansi Box MDF 1.62L
  crossoverBandMid: [250, 5500],      // Rentang kerja utama woofer LG-6015
  crossoverBandTreble: [6000, 16000], // Rentang kerja murni tweeter Silk Dome
  overlapCriticalRange: [3000, 5000]  // Titik temu / potensi harsh
};

// Bluetooth Low Energy (BLE) GATT Service & Characteristic UUIDs
const BLE_SERVICE_UUID = '0000ae00-0000-1000-8000-00805f9b34fb';
const BLE_WRITE_AE10_UUID = '0000ae10-0000-1000-8000-00805f9b34fb'; // Primary Write (Write With Response)
const BLE_WRITE_AE03_UUID = '0000ae03-0000-1000-8000-00805f9b34fb'; // Alternative Write (No Response)
const BLE_WRITE_AE01_UUID = '0000ae01-0000-1000-8000-00805f9b34fb'; // Auxiliary Write
const BLE_NOTIFY_AE04_UUID = '0000ae04-0000-1000-8000-00805f9b34fb'; // Real-time Telemetry Notify

// Sinilink Command Byte Definitions
const CMD = {
  HEADER: 0x7E,
  PLAY_PAUSE: 0x01,
  PREV_TRACK: 0x07,
  NEXT_TRACK: 0x08,
  VOLUME: 0x1D,
  QUERY_STATUS: 0x1F,
  SOURCE_BT: 0x14,
  SOURCE_AUX: 0x16,
  SOURCE_USB: 0x04,
  SOURCE_PC: 0x15,
};

// Input Source Byte Mapping
const SOURCE_MAP = {
  'BT': { byte: 0x14, label: 'BLUETOOTH' },
  'AUX': { byte: 0x16, label: 'AUX INPUT' },
  'USB': { byte: 0x04, label: 'USB DISK' },
  'PC': { byte: 0x15, label: 'PC SOUNDCARD' }
};

// Equalizer Preset Byte Mapping
const EQ_MAP = {
  'Normal': 0x09,
  'Rock': 0x0A,
  'Pop': 0x0B,
  'Classic': 0x0C,
  'Jazz': 0x0D,
  'Country': 0x0E
};

// 7-Band Graphic Equalizer Frequencies & Filter Specs
const EQ_BANDS_CONFIG = [
  { freq: 60, label: '60Hz', sub: 'Sub-Bass', type: 'lowshelf' },
  { freq: 150, label: '150Hz', sub: 'Bass', type: 'peaking' },
  { freq: 400, label: '400Hz', sub: 'Low-Mid', type: 'peaking' },
  { freq: 1000, label: '1kHz', sub: 'Mid', type: 'peaking' },
  { freq: 2400, label: '2.4kHz', sub: 'Upper-Mid', type: 'peaking' },
  { freq: 6000, label: '6kHz', sub: 'High', type: 'peaking' },
  { freq: 15000, label: '15kHz', sub: 'Air', type: 'highshelf' }
];

// Curated Quick Curves for Manual Equalizer
const QUICK_EQ_CURVES = {
  'flat': [0, 0, 0, 0, 0, 0, 0],
  'bass': [8, 6, 3, 0, 0, 0, 0],
  'treble': [0, 0, 0, 1, 3, 6, 8],
  'vshape': [7, 4, -1, -2, 0, 4, 7],
  'vocal': [1, 2, 5, 6, 4, 1, 0]
};

