/**
 * SINILINK XY-C100L WEB BLE AUDIO DASHBOARD - DOM ELEMENTS CACHE
 */

const elements = {};

function initElements() {
  // BLE Header & Connection
  elements.btnConnect = document.getElementById('btnConnect');
  elements.btnConnectLabel = document.getElementById('btnConnectLabel');
  elements.btnScanNew = document.getElementById('btnScanNew');
  elements.btnBleHelp = document.getElementById('btnBleHelp');
  elements.btnMenuHelp = document.getElementById('btnMenuHelp');
  elements.bleHelpModal = document.getElementById('bleHelpModal');
  elements.btnCloseBleHelp = document.getElementById('btnCloseBleHelp');
  elements.btnDismissBleHelp = document.getElementById('btnDismissBleHelp');
  elements.btnDisconnect = document.getElementById('btnDisconnect');
  elements.btnForgetDevice = document.getElementById('btnForgetDevice');
  elements.statusLedDot = document.getElementById('statusLedDot');
  elements.statusLedRing = document.getElementById('statusLedRing');
  elements.connectionStateLabel = document.getElementById('connectionStateLabel');
  elements.connectedDeviceName = document.getElementById('connectedDeviceName');
  elements.btnBleOptions = document.getElementById('btnBleOptions');
  elements.bleSettingsMenu = document.getElementById('bleSettingsMenu');
  elements.selScanMode = document.getElementById('selScanMode');
  elements.selWriteChar = document.getElementById('selWriteChar');
  elements.selMaxVolume = document.getElementById('selMaxVolume');
  elements.selManualChar = document.getElementById('selManualChar');
  elements.btnToggleDemoMode = document.getElementById('btnToggleDemoMode');
  elements.demoBadge = document.getElementById('demoBadge');

  elements.toastContainer = document.getElementById('toastContainer');

  // Volume & Rotary Knob Elements
  elements.rotaryKnob = document.getElementById('rotaryKnob');
  elements.knobBody = document.getElementById('knobBody');
  elements.knobSvgProgress = document.getElementById('knobSvgProgress');
  elements.knobVolVal = document.getElementById('knobVolVal');
  elements.knobVolMax = document.getElementById('knobVolMax');
  elements.volumeSlider = document.getElementById('volumeSlider');
  elements.volPercentLabel = document.getElementById('volPercentLabel');
  elements.volHexLabel = document.getElementById('volHexLabel');
  elements.volDbLabel = document.getElementById('volDbLabel');
  elements.syncBadge = document.getElementById('syncBadge');
  elements.syncPulse = document.getElementById('syncPulse');
  elements.syncText = document.getElementById('syncText');

  // Step & Mute
  elements.btnVolStepMinus5 = document.getElementById('btnVolStepMinus5');
  elements.btnVolStepMinus1 = document.getElementById('btnVolStepMinus1');
  elements.btnVolStepPlus1 = document.getElementById('btnVolStepPlus1');
  elements.btnVolStepPlus5 = document.getElementById('btnVolStepPlus5');
  elements.btnMuteToggle = document.getElementById('btnMuteToggle');
  elements.muteBtnLabel = document.getElementById('muteBtnLabel');

  // Transport & VU
  elements.btnPlayPause = document.getElementById('btnPlayPause');
  elements.playPauseLabel = document.getElementById('playPauseLabel');
  elements.btnPrevTrack = document.getElementById('btnPrevTrack');
  elements.btnNextTrack = document.getElementById('btnNextTrack');
  elements.playbackStatusBadge = document.getElementById('playbackStatusBadge');
  elements.vuLeftTrack = document.getElementById('vuLeftTrack');
  elements.vuRightTrack = document.getElementById('vuRightTrack');
  elements.vuPeakL = document.getElementById('vuPeakL');
  elements.vuPeakR = document.getElementById('vuPeakR');

  // Now Playing Deck
  elements.nowPlayingTitle = document.getElementById('nowPlayingTitle');
  elements.nowPlayingArtist = document.getElementById('nowPlayingArtist');
  elements.nowPlayingDisc = document.getElementById('nowPlayingDisc');
  elements.nowPlayingVisualizer = document.getElementById('nowPlayingVisualizer');
  elements.nowPlayingArt = document.getElementById('nowPlayingArt');


  // Source & EQ
  elements.sourceButtons = document.querySelectorAll('.src-btn');
  elements.activeSourceBadge = document.getElementById('activeSourceBadge');
  elements.eqButtons = document.querySelectorAll('.eq-btn');
  elements.activeEqBadge = document.getElementById('activeEqBadge');

  // Manual Graphic Equalizer Elements
  elements.btnEqTabPresets = document.getElementById('btnEqTabPresets');
  elements.btnEqTabManual = document.getElementById('btnEqTabManual');
  elements.eqPresetsView = document.getElementById('eqPresetsView');
  elements.eqManualView = document.getElementById('eqManualView');
  elements.eqCurveSvg = document.getElementById('eqCurveSvg');
  elements.eqCurvePath = document.getElementById('eqCurvePath');
  elements.eqCurveArea = document.getElementById('eqCurveArea');
  elements.btnEqReset = document.getElementById('btnEqReset');
  elements.btnEqBassBoost = document.getElementById('btnEqBassBoost');
  elements.btnEqTrebleBoost = document.getElementById('btnEqTrebleBoost');
  elements.btnEqVShape = document.getElementById('btnEqVShape');
  elements.btnEqVocal = document.getElementById('btnEqVocal');
  elements.eqHardwareSyncText = document.getElementById('eqHardwareSyncText');
  elements.eqAcousticOverlapWarning = document.getElementById('eqAcousticOverlapWarning');
  elements.selEqPacketFormat = document.getElementById('selEqPacketFormat');


  // Telemetry
  elements.telemetryPassword = document.getElementById('telemetryPassword');
  elements.telemetryTone = document.getElementById('telemetryTone');
  elements.telemetryPacketLen = document.getElementById('telemetryPacketLen');
  elements.telemetryChecksumStatus = document.getElementById('telemetryChecksumStatus');
  elements.btnQueryStatus = document.getElementById('btnQueryStatus');

  // Custom Hex Payload
  elements.customHexInput = document.getElementById('customHexInput');
  elements.rawByteCount = document.getElementById('rawByteCount');
  elements.chkAutoChecksum = document.getElementById('chkAutoChecksum');
  elements.previewChecksumBadge = document.getElementById('previewChecksumBadge');
  elements.finalPayloadPreview = document.getElementById('finalPayloadPreview');
  elements.btnSendHex = document.getElementById('btnSendHex');
  elements.presetChips = document.querySelectorAll('.preset-chip');

  // Terminal & Console Logs
  elements.terminalConsole = document.getElementById('terminalConsole');
  elements.filterAll = document.getElementById('filterAll');
  elements.filterRx = document.getElementById('filterRx');
  elements.filterTx = document.getElementById('filterTx');
  elements.chkAutoScroll = document.getElementById('chkAutoScroll');
  elements.btnCopyLog = document.getElementById('btnCopyLog');
  elements.btnClearLog = document.getElementById('btnClearLog');
  elements.rxPacketCount = document.getElementById('rxPacketCount');
  elements.txPacketCount = document.getElementById('txPacketCount');

  // Browser Warning Banner
  elements.browserWarningBanner = document.getElementById('browserWarningBanner');
  elements.browserWarningText = document.getElementById('browserWarningText');
  elements.btnDemoModeToggle = document.getElementById('btnDemoModeToggle');
}

// Auto-run if DOM is already loaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initElements();
}
