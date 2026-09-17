let audioContext: AudioContext | null = null;
let nextSirenAt = 0;

const SIREN_COOLDOWN_MS = 4000;

export const ensureAudioContext = async (): Promise<AudioContext | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor = window.AudioContext
    || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  return audioContext;
};

export const playAirRaidSiren = async (): Promise<boolean> => {
  const ctx = await ensureAudioContext();
  if (!ctx || ctx.state !== 'running') {
    return false;
  }

  const now = Date.now();
  if (now < nextSirenAt) {
    return false;
  }
  nextSirenAt = now + SIREN_COOLDOWN_MS;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(400, ctx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(800, ctx.currentTime + 2);
  oscillator.frequency.linearRampToValueAtTime(400, ctx.currentTime + 4);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.4, ctx.currentTime + 3.5);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 4);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 4);

  return true;
};

export const isBuckleOpen = (value?: number) => value === 1;

export const hasOpenBuckle = (buckle1?: number, buckle2?: number, buckle3?: number) =>
  isBuckleOpen(buckle1) || isBuckleOpen(buckle2) || isBuckleOpen(buckle3);
