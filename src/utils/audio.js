// src/utils/audio.js

// We lazily initialize the AudioContext so it only starts after a user interaction
let audioCtx = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Creates a generic oscillator with a simple envelope
 */
function playTone({ freq, type = 'square', duration = 0.1, vol = 0.1, sweep = false }) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  
  // Frequency sweep
  if (sweep === 'down') {
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(10, now + duration);
  } else if (sweep === 'up') {
    osc.frequency.setValueAtTime(freq / 2, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 2, now + duration);
  } else {
    osc.frequency.setValueAtTime(freq, now);
  }

  // Volume envelope (ADSR-ish)
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + duration * 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.start(now);
  osc.stop(now + duration);
}

// ------------------------------------------------------------------
// Specific Sound Effects
// ------------------------------------------------------------------

/**
 * Sweeping rising spell sound when RUN is clicked
 */
export function playCastSound() {
  playTone({ freq: 440, type: 'sine', duration: 0.3, vol: 0.15, sweep: 'up' });
  setTimeout(() => playTone({ freq: 880, type: 'sine', duration: 0.3, vol: 0.1, sweep: 'up' }), 100);
}

/**
 * Sharp zap when hitting an enemy (Tests pass!)
 */
export function playHitSound() {
  playTone({ freq: 600, type: 'square', duration: 0.2, vol: 0.15, sweep: 'down' });
  setTimeout(() => playTone({ freq: 300, type: 'sawtooth', duration: 0.2, vol: 0.1, sweep: 'down' }), 50);
}

/**
 * Dull buzz when tests fail
 */
export function playFailSound() {
  playTone({ freq: 150, type: 'sawtooth', duration: 0.3, vol: 0.15 });
  setTimeout(() => playTone({ freq: 110, type: 'sawtooth', duration: 0.4, vol: 0.2 }), 200);
}

/**
 * Explosion/Crunch when enemy is defeated
 */
export function playCritSound() {
  // Simulating noise by rapidly modulating frequency
  const ctx = getContext();
  const now = ctx.currentTime;
  const duration = 0.5;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(100, now);
  
  // Create gritty noise via massive frequency modulation
  for (let i = 0; i < 20; i++) {
    osc.frequency.setValueAtTime(Math.random() * 800 + 100, now + (i / 20) * duration);
  }
  osc.frequency.exponentialRampToValueAtTime(10, now + duration);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

/**
 * 8-Bit Victory Fanfare
 */
export function playVictoryFanfare() {
  const ctx = getContext();
  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: 0 },    // C5
    { freq: 659.25, time: 0.15 }, // E5
    { freq: 783.99, time: 0.3 },  // G5
    { freq: 1046.50, time: 0.5, duration: 0.4 } // C6 (held)
  ];

  notes.forEach(note => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.value = note.freq;
    
    const startTime = now + note.time;
    const duration = note.duration || 0.1;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}
