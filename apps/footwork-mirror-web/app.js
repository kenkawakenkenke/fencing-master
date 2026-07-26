/**
 * Footwork Mirror AI - Web Application Engine
 * Real-time MediaPipe Pose 3D Z-Depth & Extension Strike Detection
 */

// Presets & Cues Config with authentic Martial Arts Terminology
const DRILL_PRESETS = {
  karate: {
    idleTitle: '構え (KAMAE)',
    idleSub: 'Maintain Kamae stance',
    cues: [
      { id: 'fwd', name: '前', sub: 'Mae - Step Forward', symbol: '⬆️', badge: '前 (MAE)', colorClass: 'cue-forward' },
      { id: 'bwd', name: '後', sub: 'Ushiro - Step Back', symbol: '⬇️', badge: '後 (USHIRO)', colorClass: 'cue-backward' },
      { id: 'gyaku', name: '逆突き', sub: 'Gyaku-zuki - Reverse Punch Attack!', symbol: '💥', badge: '逆突き STRIKE!', colorClass: 'cue-attack', isAttack: true },
      { id: 'oi', name: '追い突き', sub: 'Oi-zuki - Stepping Punch Attack!', symbol: '👊', badge: '追い突き STRIKE!', colorClass: 'cue-attack', isAttack: true }
    ]
  },
  fencing: {
    idleTitle: 'EN GARDE',
    idleSub: 'Maintain En Garde posture',
    cues: [
      { id: 'adv', name: 'ADVANCE', sub: 'Step forward in En Garde', symbol: '➡️', badge: 'ADVANCE', colorClass: 'cue-forward' },
      { id: 'ret', name: 'RETREAT', sub: 'Step back in En Garde', symbol: '⬅️', badge: 'RETREAT', colorClass: 'cue-backward' },
      { id: 'lunge', name: 'LUNGE', sub: 'Explosive Fencing Lunge!', symbol: '⚔️', badge: 'LUNGE!', colorClass: 'cue-attack', isAttack: true },
      { id: 'steplunge', name: 'STEP-LUNGE', sub: 'Step Forward + Lunge!', symbol: '⚡', badge: 'STEP-LUNGE!', colorClass: 'cue-attack', isAttack: true }
    ]
  }
};

// Application State
const state = {
  currentPreset: 'karate',
  isDrillRunning: false,
  soundEnabled: true,
  cameraActive: false,
  
  currentCue: null,
  cueStartTime: 0,
  awaitingAttack: false,
  
  sensitivity: 0.70,
  
  // Motion detection & baseline buffers
  prevWristZ: 0,
  prevHandScale: 0,
  lastLiveArmAngle: 90,
  lastLiveWristZ: 0,
  lastLiveHandScale: 0,
  baselineArmAngle: 90,
  baselineWristZ: 0,
  baselineHandScale: 0,
  
  strikeStartTime: 0,
  strikeState: 'IDLE', // 'IDLE', 'EXTENDING', 'STRIKE_DETECTED'
  
  // Stats
  completedCount: 0,
  reactionTimes: [],
  fastestReaction: Infinity
};

// Audio Synthesizer (Web Audio API)
class SoundFx {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      this.ctx = new AudioCtx();
    }
  }

  playTone(freq = 440, duration = 0.15, type = 'sine') {
    if (!state.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playCueSound(isAttack) {
    if (isAttack) {
      this.playTone(880, 0.25, 'triangle');
      setTimeout(() => this.playTone(1100, 0.2, 'sine'), 100);
      return;
    }
    this.playTone(520, 0.15, 'sine');
  }

  speak(text) {
    if (!state.soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.2;
    window.speechSynthesis.speak(utterance);
  }
}

const sfx = new SoundFx();

// DOM Elements
const el = {
  body: document.body,
  btnStart: document.getElementById('btn-start'),
  btnStop: document.getElementById('btn-stop'),
  btnManualTrigger: document.getElementById('btn-manual-trigger'),
  btnKarate: document.getElementById('btn-karate'),
  btnFencing: document.getElementById('btn-fencing'),
  btnSound: document.getElementById('btn-sound'),
  btnToggleCam: document.getElementById('btn-toggle-camera'),
  camStatusText: document.getElementById('camera-status-text'),
  
  cueBadge: document.getElementById('cue-badge'),
  cueSymbol: document.getElementById('cue-symbol'),
  cueText: document.getElementById('cue-text'),
  cueSubtext: document.getElementById('cue-subtext'),
  
  reactionHud: document.getElementById('reaction-hud'),
  lastReactionVal: document.getElementById('last-reaction-val'),
  
  detectorBadge: document.getElementById('detector-badge'),
  webcam: document.getElementById('webcam'),
  poseCanvas: document.getElementById('pose-canvas'),
  poseOverlayStatus: document.getElementById('pose-overlay-status'),
  
  valArmExt: document.getElementById('val-arm-ext'),
  barArmExt: document.getElementById('bar-arm-ext'),
  valZVel: document.getElementById('val-z-vel'),
  barZVel: document.getElementById('bar-z-vel'),
  valHandScale: document.getElementById('val-hand-scale'),
  barHandScale: document.getElementById('bar-hand-scale'),
  
  sensitivitySlider: document.getElementById('sensitivity-slider'),
  sensitivityLabel: document.getElementById('sensitivity-label'),
  
  telemetryLog: document.getElementById('telemetry-log'),
  btnClearLog: document.getElementById('btn-clear-log'),

  statCompleted: document.getElementById('stat-completed'),
  statAvg: document.getElementById('stat-avg'),
  statFastest: document.getElementById('stat-fastest')
};

function logTelemetry(msg, type = '') {
  console.log(`[FOOTWORK-MIRROR] ${msg}`);
  if (!el.telemetryLog) return;

  const div = document.createElement('div');
  div.className = `log-line ${type}`;
  div.textContent = msg;
  el.telemetryLog.appendChild(div);
  el.telemetryLog.scrollTop = el.telemetryLog.scrollHeight;
}

// Initialize Application
function init() {
  bindEvents();
  setupMediaPipePose();
}

function bindEvents() {
  el.btnKarate.addEventListener('click', () => setPreset('karate'));
  el.btnFencing.addEventListener('click', () => setPreset('fencing'));
  
  el.btnStart.addEventListener('click', startDrill);
  el.btnStop.addEventListener('click', stopDrill);
  el.btnManualTrigger.addEventListener('click', triggerManualStrike);
  
  el.btnSound.addEventListener('click', toggleSound);
  if (el.btnClearLog) {
    el.btnClearLog.addEventListener('click', () => {
      el.telemetryLog.innerHTML = '<div class="log-line">Log cleared.</div>';
    });
  }

  el.sensitivitySlider.addEventListener('input', (e) => {
    state.sensitivity = parseFloat(e.target.value);
    el.sensitivityLabel.textContent = `Sensitivity: ${state.sensitivity}`;
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      triggerManualStrike();
    }
  });
}

function setPreset(preset) {
  if (state.isDrillRunning) return;
  state.currentPreset = preset;
  
  el.btnKarate.classList.toggle('active', preset === 'karate');
  el.btnFencing.classList.toggle('active', preset === 'fencing');
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  el.btnSound.textContent = state.soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
  el.btnSound.classList.toggle('active', state.soundEnabled);
}

// Drill Engine Timers
let drillTimer = null;
let stepDismissTimer = null;

function startDrill() {
  if (state.isDrillRunning) return;
  sfx.init();
  
  state.isDrillRunning = true;
  el.btnStart.classList.add('hidden');
  el.btnStop.classList.remove('hidden');
  el.reactionHud.classList.add('hidden');
  
  resetToIdleDisplay('READY...', 'Stay in Kamae / En Garde facing camera');
  scheduleNextCue(1500);
}

function stopDrill() {
  if (!state.isDrillRunning) return;
  
  state.isDrillRunning = false;
  state.awaitingAttack = false;
  clearTimeout(drillTimer);
  clearTimeout(stepDismissTimer);
  
  el.btnStart.classList.remove('hidden');
  el.btnStop.classList.add('hidden');
  
  resetToIdleDisplay('PAUSED', 'Press Start to resume training');
}

function resetToIdleDisplay() {
  el.body.className = 'mode-idle';
  el.cueBadge.classList.add('hidden');
  el.cueBadge.textContent = '';
  el.cueSymbol.classList.add('hidden');
  el.cueSymbol.textContent = '';
  el.cueText.classList.add('hidden');
  el.cueText.textContent = '';
  el.cueSubtext.classList.add('hidden');
  el.cueSubtext.textContent = '';
  if (el.reactionHud) el.reactionHud.classList.add('hidden');
}

function scheduleNextCue(delayMs) {
  if (!state.isDrillRunning) return;
  
  clearTimeout(drillTimer);
  const randomDelay = delayMs || Math.floor(Math.random() * 2000) + 1200;
  
  drillTimer = setTimeout(() => {
    triggerNewCue();
  }, randomDelay);
}

function triggerNewCue() {
  if (!state.isDrillRunning) return;
  
  clearTimeout(stepDismissTimer);
  if (el.reactionHud) el.reactionHud.classList.add('hidden');
  
  const presetData = DRILL_PRESETS[state.currentPreset];
  const cues = presetData.cues;
  const stepCues = cues.filter(c => !c.isAttack);
  const attackCues = cues.filter(c => c.isAttack);
  
  // 30% overall probability for an attack cue
  const isAttackRoll = Math.random() < 0.30;
  let selectedCue = null;

  if (isAttackRoll && attackCues.length > 0) {
    // Weight attack type: 75% for direct attack (Lunge / Gyaku-zuki), 25% for rarer combination (Step-Lunge / Oi-zuki)
    const isRareStepAttack = Math.random() < 0.25;
    if (isRareStepAttack) {
      selectedCue = attackCues.find(c => c.id === 'steplunge' || c.id === 'oi') || attackCues[0];
    } else {
      selectedCue = attackCues.find(c => c.id === 'lunge' || c.id === 'gyaku') || attackCues[0];
    }
  } else {
    selectedCue = stepCues[Math.floor(Math.random() * stepCues.length)];
  }
  
  state.currentCue = selectedCue;
  state.cueStartTime = performance.now();
  state.awaitingAttack = !!selectedCue.isAttack;
  state.strikeState = 'IDLE';
  
  // Snapshot baseline pose measurements at the exact moment cue is shown!
  state.baselineArmAngle = state.lastLiveArmAngle || 90;
  state.baselineWristZ = state.lastLiveWristZ || 0;
  state.baselineHandScale = state.lastLiveHandScale || 0;
  
  if (selectedCue.isAttack) {
    logTelemetry(`🎯 [ATTACK CUE] ${selectedCue.name}! Baseline: 3D Angle=${Math.round(state.baselineArmAngle)}°, WristZ=${state.baselineWristZ.toFixed(2)}`, 'cue');
  } else {
    logTelemetry(`👟 [STEP CUE] ${selectedCue.name}`);
  }
  
  // Update Display & Un-hide Elements for active cue
  el.body.className = selectedCue.colorClass;
  
  el.cueBadge.textContent = selectedCue.badge;
  el.cueBadge.classList.remove('hidden');
  
  el.cueSymbol.textContent = selectedCue.symbol;
  el.cueSymbol.classList.remove('hidden');
  
  el.cueText.textContent = selectedCue.name;
  el.cueText.classList.remove('hidden');
  
  el.cueSubtext.textContent = selectedCue.sub;
  el.cueSubtext.classList.remove('hidden');
  
  // Audio / Voice Callout
  sfx.playCueSound(selectedCue.isAttack);
  sfx.speak(selectedCue.name);
  
  // Step cues disappear quickly (1000ms) back to minimal black screen
  if (!selectedCue.isAttack) {
    stepDismissTimer = setTimeout(() => {
      if (!state.isDrillRunning) return;
      resetToIdleDisplay();
      scheduleNextCue(Math.floor(Math.random() * 1500) + 1000);
    }, 1050);
  }
}

// Immediate Attack UI & Red Background dismissal on Strike Detection
function registerStrikeCompletion(reactionTimeMs) {
  if (!state.awaitingAttack) return;
  
  state.awaitingAttack = false;
  state.completedCount++;
  state.reactionTimes.push(reactionTimeMs);
  if (reactionTimeMs < state.fastestReaction) {
    state.fastestReaction = reactionTimeMs;
  }
  
  // Audio feedback
  sfx.playTone(1320, 0.2, 'sine');
  
  // Immediately dismiss RED background to neutral, show reaction time result briefly
  el.body.className = 'mode-idle';
  
  el.cueBadge.textContent = 'REGISTERED!';
  el.cueBadge.classList.remove('hidden');
  
  el.cueSymbol.textContent = '⚡';
  el.cueSymbol.classList.remove('hidden');
  
  el.cueText.textContent = `${Math.round(reactionTimeMs)} ms`;
  el.cueText.classList.remove('hidden');
  
  el.cueSubtext.textContent = 'Reaction Time';
  el.cueSubtext.classList.remove('hidden');
  
  // Update Reaction HUD
  el.lastReactionVal.textContent = `${Math.round(reactionTimeMs)} ms`;
  el.reactionHud.classList.remove('hidden');
  
  updateStatsDisplay();
  
  // Return to minimal black neutral screen after 1.2s (hides reaction HUD)
  stepDismissTimer = setTimeout(() => {
    if (!state.isDrillRunning) return;
    resetToIdleDisplay();
    scheduleNextCue(1800);
  }, 1200);
}

function triggerManualStrike() {
  if (!state.awaitingAttack) {
    sfx.playTone(600, 0.1, 'sine');
    return;
  }
  
  const reactionTime = performance.now() - state.cueStartTime;
  registerStrikeCompletion(reactionTime);
}

function updateStatsDisplay() {
  el.statCompleted.textContent = state.completedCount;
  
  if (state.reactionTimes.length > 0) {
    const avg = state.reactionTimes.reduce((a, b) => a + b, 0) / state.reactionTimes.length;
    el.statAvg.textContent = `${Math.round(avg)} ms`;
    el.statFastest.textContent = `${Math.round(state.fastestReaction)} ms`;
  }
}

// MediaPipe Pose Setup & Camera Feed Processing
let poseDetector = null;
let camera = null;

function setupMediaPipePose() {
  if (!window.Pose) {
    el.poseOverlayStatus.textContent = 'MediaPipe library loading error';
    return;
  }

  poseDetector = new window.Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  poseDetector.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  poseDetector.onResults(onPoseResults);

  // Initialize Camera
  camera = new window.Camera(el.webcam, {
    onFrame: async () => {
      if (poseDetector) {
        await poseDetector.send({ image: el.webcam });
      }
    },
    width: 640,
    height: 480
  });

  camera.start()
    .then(() => {
      state.cameraActive = true;
      el.camStatusText.textContent = 'Cam: Active';
    })
    .catch((err) => {
      console.warn('Camera failed to start:', err);
      el.camStatusText.textContent = 'Cam: Disabled (Manual Mode)';
      el.poseOverlayStatus.textContent = 'No camera access. Use Spacebar for strikes.';
    });
}

// MediaPipe Pose Results Handler (Wrapped in try/catch to ensure continuous camera loop)
function onPoseResults(results) {
  try {
    const canvas = el.poseCanvas;
    const ctx = canvas.getContext('2d');
    
    canvas.width = el.webcam.videoWidth || 640;
    canvas.height = el.webcam.videoHeight || 480;
    
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!results || !results.poseLandmarks) {
      if (el.poseOverlayStatus) el.poseOverlayStatus.textContent = 'Searching body pose...';
      ctx.restore();
      return;
    }
    
    if (el.poseOverlayStatus) el.poseOverlayStatus.textContent = 'Body Tracked 🟢';
    
    // Draw skeleton landmarks
    if (window.drawConnectors && window.drawLandmarks && window.POSE_CONNECTIONS) {
      window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, { color: '#00FFC8', lineWidth: 2 });
      window.drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0055', lineWidth: 1, radius: 3 });
    }
    
    ctx.restore();
    
    // Analyze Pose Keypoints safely
    analyzeStrikePose(results.poseLandmarks, results.poseWorldLandmarks);
  } catch (err) {
    console.error('Error in onPoseResults callback:', err);
  }
}

/**
 * Core 3D Z-Depth & Extension Pose Analysis
 * Safe, robust Right-Arm tracking
 */
function analyzeStrikePose(landmarks, worldLandmarks) {
  try {
    if (!landmarks || landmarks.length < 33) return;

    // Use poseWorldLandmarks if available, fallback to 2D landmarks
    const w = (worldLandmarks && worldLandmarks.length >= 33) ? worldLandmarks : landmarks;

    // Right Arm 3D World Landmarks (12: Shoulder, 14: Elbow, 16: Wrist, 20: Index)
    const rShoulder = w[12];
    const rElbow = w[14];
    const rWrist = w[16];
    const rIndex = w[20];

    // Left Arm 3D World Landmarks (11: Shoulder, 13: Elbow, 15: Wrist, 19: Index)
    const lShoulder = w[11];
    const lElbow = w[13];
    const lWrist = w[15];
    const lIndex = w[19];

    if (!rShoulder || !rWrist || !rElbow) return;

    // Calculate True 3D Joint Angles using 3D Dot Product
    const rAngle = calculate3DJointAngle(rShoulder, rElbow, rWrist);
    const lAngle = (lShoulder && lElbow && lWrist) ? calculate3DJointAngle(lShoulder, lElbow, lWrist) : 90;

    // Primary arm: Right arm unless left arm is vastly more extended
    const isRightPrimary = rAngle >= (lAngle - 15);
    const activeAngle = isRightPrimary ? rAngle : lAngle;
    const activeShoulder = isRightPrimary ? rShoulder : lShoulder;
    const activeWrist = isRightPrimary ? rWrist : lWrist;
    const activeIndex = isRightPrimary ? rIndex : lIndex;

    // Extension percentage (90° = 0%, 170° = 100%)
    const armExtensionPct = Math.min(100, Math.max(0, ((activeAngle - 90) / 75) * 100));

    // Z-Depth estimation relative to shoulder depth
    const relativeZ = (activeShoulder.z - activeWrist.z);
    const zVelocity = Math.max(0, (relativeZ - state.prevWristZ) * 100);
    state.prevWristZ = relativeZ;

    // Hand scale 2D distance
    let handScale = 1.0;
    if (activeWrist && activeIndex) {
      const dist = Math.hypot(activeWrist.x - activeIndex.x, activeWrist.y - activeIndex.y);
      handScale = dist * 100;
    }
    const scaleVel = Math.max(0, (handScale - state.prevHandScale) * 10);
    state.prevHandScale = handScale;

    // Save live pose values for baseline tracking
    state.lastLiveArmAngle = activeAngle;
    state.lastLiveWristZ = relativeZ;
    state.lastLiveHandScale = handScale;

    // Calculate DELTA extension FROM the baseline captured at cue start!
    const deltaAngle = activeAngle - state.baselineArmAngle;

    // Update UI Diagnostic Gauges
    if (el.valArmExt) el.valArmExt.textContent = `${Math.round(armExtensionPct)}% (3D:${Math.round(activeAngle)}°)`;
    if (el.barArmExt) el.barArmExt.style.width = `${armExtensionPct}%`;

    if (el.valZVel) el.valZVel.textContent = zVelocity.toFixed(1);
    if (el.barZVel) el.barZVel.style.width = `${Math.min(100, zVelocity * 20)}%`;

    if (el.valHandScale) el.valHandScale.textContent = `${handScale.toFixed(1)}x`;
    if (el.barHandScale) el.barHandScale.style.width = `${Math.min(100, scaleVel * 30)}%`;

    // Draw Diagnostic Text on Canvas
    drawCanvasDiagnostics(activeAngle, deltaAngle, zVelocity);

    // STRIKE TRIGGER LOGIC
    const now = performance.now();
    const timeSinceCue = now - state.cueStartTime;

    // Dynamic lunge condition: deltaAngle >= +15° OR zVelocity >= 1.8
    const isDynamicLunge = (deltaAngle >= 15 && (relativeZ - state.baselineWristZ) >= 0.03) || (zVelocity >= 1.8 && deltaAngle >= 10);

    if (state.awaitingAttack) {
      if (timeSinceCue >= 100 && isDynamicLunge) {
        logTelemetry(`💥 [REGISTERED] Lunge detected at t=${Math.round(timeSinceCue)}ms! ΔAngle=+${Math.round(deltaAngle)}°, Z-Vel=${zVelocity.toFixed(1)}`, 'strike');
        updateDetectorBadge('STRIKE DETECTED! 🎯', 'badge strike');
        const reactionTime = now - state.cueStartTime;
        registerStrikeCompletion(reactionTime);
      } else {
        updateDetectorBadge('AWAITING STRIKE...', 'badge extending');
      }
    } else {
      updateDetectorBadge('WAITING', 'badge idle');
    }
  } catch (err) {
    console.error('Error in analyzeStrikePose:', err);
  }
}

function drawCanvasDiagnostics(angle, deltaAngle, zVel) {
  const canvas = el.poseCanvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.scale(-1, 1); // Reverse canvas scaling for readable text
  ctx.font = 'bold 14px "Space Mono", monospace';
  ctx.fillStyle = '#00FFC8';
  ctx.fillText(`R-ARM: ${Math.round(angle)}° (Δ ${Math.round(deltaAngle)}°)`, -canvas.width + 10, 24);
  ctx.fillText(`Z-VEL: ${zVel.toFixed(1)}`, -canvas.width + 10, 44);
  ctx.fillText(`STATE: ${state.awaitingAttack ? 'AWAITING ATTACK 🎯' : 'IDLE'}`, -canvas.width + 10, 64);
  ctx.restore();
}

function updateDetectorBadge(text, className) {
  el.detectorBadge.textContent = text;
  el.detectorBadge.className = className;
}

/**
 * Calculates True 3D Joint Angle using 3D Metric World Landmarks & Vector Dot Product
 * Solves 2D camera foreshortening distortion when pointing arm at camera
 */
function calculate3DJointAngle(p1, p2, p3) {
  if (!p1 || !p2 || !p3) return 90;
  
  // Vector A: Elbow -> Shoulder (in 3D meters)
  const ax = p1.x - p2.x;
  const ay = p1.y - p2.y;
  const az = p1.z - p2.z;
  
  // Vector B: Elbow -> Wrist (in 3D meters)
  const bx = p3.x - p2.x;
  const by = p3.y - p2.y;
  const bz = p3.z - p2.z;
  
  const dot = ax * bx + ay * by + az * bz;
  const magA = Math.sqrt(ax * ax + ay * ay + az * az);
  const magB = Math.sqrt(bx * bx + by * by + bz * bz);
  
  if (magA === 0 || magB === 0) return 90;
  
  const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magB)));
  const angleRad = Math.acos(cosAngle);
  
  return angleRad * (180 / Math.PI);
}

/**
 * Fallback 2D Angle Calculation
 */
function calculateJointAngle(p1, p2, p3) {
  if (!p1 || !p2 || !p3) return 90;
  
  const rad1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
  const rad2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
  
  let angle = Math.abs((rad1 - rad2) * (180 / Math.PI));
  if (angle > 180) {
    angle = 360 - angle;
  }
  return angle;
}

// Run app on load
window.addEventListener('DOMContentLoaded', init);
