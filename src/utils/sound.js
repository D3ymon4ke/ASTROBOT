let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playWinSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Create an oscillator and gain node
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle'; // pleasant soft sound
    
    // Play a nice rising arpeggio (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const duration = 0.12; // duration of each note
    
    notes.forEach((freq, idx) => {
      osc.frequency.setValueAtTime(freq, now + idx * duration);
    });
    
    // Fade out volume at the end
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + notes.length * duration + 0.1);
    
    osc.start(now);
    osc.stop(now + notes.length * duration + 0.15);
  } catch (e) {
    console.error('Failed to play win sound:', e);
  }
};

export const playLossSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sawtooth'; // retro buzz alert
    
    // Play a descending slide (C4 -> G3)
    osc.frequency.setValueAtTime(261.63, now);
    osc.frequency.linearRampToValueAtTime(196.00, now + 0.4);
    
    // Fade out volume
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    console.error('Failed to play loss sound:', e);
  }
};

export const playClickSound = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {
    console.error('Failed to play click sound:', e);
  }
};
