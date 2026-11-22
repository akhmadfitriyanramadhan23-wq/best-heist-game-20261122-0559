// Velvet Vault — WebAudio-synthesised sounds. No audio files, no network:
// every effect is a few oscillators through a gain envelope, built lazily on
// the first user gesture (browsers block audio before one). Mute with M.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (ctx === null) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (muted) return;
    const ac = ensure();
    if (ac === null) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
    },
    click() {
      tone(660, 0.07, 'sine', 0.12);
    },
    crackTick() {
      tone(440, 0.05, 'square', 0.05);
    },
    loot() {
      // A small chime: three rising notes.
      tone(523, 0.12, 'sine', 0.14);
      tone(659, 0.12, 'sine', 0.14, 0.08);
      tone(784, 0.22, 'sine', 0.16, 0.16);
    },
    spotted() {
      // Two-note alarm sting.
      tone(220, 0.16, 'sawtooth', 0.12, 0, 180);
      tone(220, 0.16, 'sawtooth', 0.12, 0.18, 180);
    },
    caught() {
      tone(140, 0.5, 'sawtooth', 0.18, 0, 60);
      tone(90, 0.5, 'triangle', 0.16, 0.05, 45);
    },
    coin() {
      tone(1200, 0.08, 'sine', 0.1, 0, 900);
    },
    smoke() {
      tone(300, 0.3, 'sine', 0.08, 0, 120);
    },
    emp() {
      tone(900, 0.35, 'square', 0.07, 0, 120);
    },
    roomClear() {
      tone(392, 0.14, 'sine', 0.13);
      tone(523, 0.2, 'sine', 0.13, 0.12);
    },
    win() {
      // A short fanfare for the getaway.
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => tone(n, 0.25, 'sine', 0.15, i * 0.13));
      tone(1319, 0.5, 'sine', 0.12, 0.55);
    },
    over() {
      const notes = [392, 330, 262, 196];
      notes.forEach((n, i) => tone(n, 0.3, 'triangle', 0.13, i * 0.16));
    },
  };
}
