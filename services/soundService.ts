
class SoundService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private ambientNodes: AudioNode[] = [];
  private ambientOscillators: OscillatorNode[] = [];

  constructor() {
    this.initAudio();
    this.setupInteractionListener();
  }

  private initAudio() {
      try {
        // @ts-ignore
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 0.2; // Master volume
          this.masterGain.connect(this.ctx.destination);
        }
      } catch (e) {
        console.warn("AudioContext init failed or blocked:", e);
      }
  }

  private setupInteractionListener() {
      if (typeof window === 'undefined') return;
      
      const resume = () => {
          this.ensureContext();
          // Remove listeners once activated
          ['click', 'touchstart', 'keydown', 'mousemove'].forEach(event => 
              window.removeEventListener(event, resume)
          );
      };

      ['click', 'touchstart', 'keydown', 'mousemove'].forEach(event => 
          window.addEventListener(event, resume)
      );
  }

  private ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
          this.ctx.resume();
      } catch(e) { console.warn("Could not resume audio context", e); }
    }
  }

  private isReady() {
      if(!this.ctx) this.initAudio(); // Try lazy init
      return this.ctx && this.masterGain && !this.isMuted;
  }

  // --- UI Sounds (Warm & Modern) ---

  /** Subtle soft tick — barely perceptible water-drop blip */
  playHover() {
    if (!this.isReady()) return;
    this.ensureContext();
    try {
      const t = this.ctx!.currentTime;

      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, t);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.start(t);
      osc.stop(t + 0.03);
    } catch (e) { console.warn("playHover error", e); }
  }

  /** Satisfying click — soft keyboard press with crisp harmonic */
  playClick() {
    if (!this.isReady()) return;
    this.ensureContext();
    try {
      const t = this.ctx!.currentTime;

      // Fundamental tone
      const osc1 = this.ctx!.createOscillator();
      const gain1 = this.ctx!.createGain();
      osc1.connect(gain1);
      gain1.connect(this.masterGain!);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(600, t);

      gain1.gain.setValueAtTime(0.15, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc1.start(t);
      osc1.stop(t + 0.05);

      // Quiet higher harmonic for crispness
      const osc2 = this.ctx!.createOscillator();
      const gain2 = this.ctx!.createGain();
      osc2.connect(gain2);
      gain2.connect(this.masterGain!);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, t);

      gain2.gain.setValueAtTime(0.04, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc2.start(t);
      osc2.stop(t + 0.04);
    } catch (e) { console.warn("playClick error", e); }
  }

  // --- Interaction Sounds ---

  /** Inspiration chime — ascending two-note wind chime with gentle decay */
  playPing() {
    if (!this.isReady()) return;
    this.ensureContext();
    try {
      const t = this.ctx!.currentTime;

      // First note: A5 (880 Hz)
      const osc1 = this.ctx!.createOscillator();
      const gain1 = this.ctx!.createGain();
      osc1.connect(gain1);
      gain1.connect(this.masterGain!);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, t);

      gain1.gain.setValueAtTime(0.2, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc1.start(t);
      osc1.stop(t + 0.4);

      // Subtle overtone for first note (warmth)
      const osc1h = this.ctx!.createOscillator();
      const gain1h = this.ctx!.createGain();
      osc1h.connect(gain1h);
      gain1h.connect(this.masterGain!);

      osc1h.type = 'sine';
      osc1h.frequency.setValueAtTime(1760, t); // Octave above
      gain1h.gain.setValueAtTime(0.04, t);
      gain1h.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc1h.start(t);
      osc1h.stop(t + 0.3);

      // Second note: E6 (1320 Hz), 100ms later
      const osc2 = this.ctx!.createOscillator();
      const gain2 = this.ctx!.createGain();
      osc2.connect(gain2);
      gain2.connect(this.masterGain!);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, t + 0.1);

      gain2.gain.setValueAtTime(0, t);
      gain2.gain.setValueAtTime(0.2, t + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc2.start(t + 0.1);
      osc2.stop(t + 0.5);

      // Subtle overtone for second note (shimmer)
      const osc2h = this.ctx!.createOscillator();
      const gain2h = this.ctx!.createGain();
      osc2h.connect(gain2h);
      gain2h.connect(this.masterGain!);

      osc2h.type = 'sine';
      osc2h.frequency.setValueAtTime(2640, t + 0.1); // Octave above second
      gain2h.gain.setValueAtTime(0, t);
      gain2h.gain.setValueAtTime(0.03, t + 0.1);
      gain2h.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc2h.start(t + 0.1);
      osc2h.stop(t + 0.4);
    } catch (e) { console.warn("playPing error", e); }
  }

  /** Voice activation — warm ascending perfect fifth (A4 → E5) */
  playStartRecord() {
    if (!this.isReady()) return;
    this.ensureContext();
    try {
      const t = this.ctx!.currentTime;

      // First note: A4 (440 Hz)
      const osc1 = this.ctx!.createOscillator();
      const gain1 = this.ctx!.createGain();
      const filter1 = this.ctx!.createBiquadFilter();

      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(this.masterGain!);

      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(2000, t);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, t);

      gain1.gain.setValueAtTime(0.18, t);
      gain1.gain.exponentialRampToValueAtTime(0.05, t + 0.08);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc1.start(t);
      osc1.stop(t + 0.2);

      // Second note: E5 (660 Hz), 80ms later
      const osc2 = this.ctx!.createOscillator();
      const gain2 = this.ctx!.createGain();
      const filter2 = this.ctx!.createBiquadFilter();

      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(this.masterGain!);

      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(2000, t + 0.08);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(660, t + 0.08);

      gain2.gain.setValueAtTime(0, t);
      gain2.gain.setValueAtTime(0.18, t + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.05, t + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc2.start(t + 0.08);
      osc2.stop(t + 0.28);
    } catch (e) { console.warn("playStartRecord error", e); }
  }

  /** Voice deactivation — warm descending perfect fifth (E5 → A4) */
  playStopRecord() {
    if (!this.isReady()) return;
    this.ensureContext();
    try {
      const t = this.ctx!.currentTime;

      // First note: E5 (660 Hz)
      const osc1 = this.ctx!.createOscillator();
      const gain1 = this.ctx!.createGain();
      const filter1 = this.ctx!.createBiquadFilter();

      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(this.masterGain!);

      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(2000, t);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(660, t);

      gain1.gain.setValueAtTime(0.18, t);
      gain1.gain.exponentialRampToValueAtTime(0.05, t + 0.08);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc1.start(t);
      osc1.stop(t + 0.2);

      // Second note: A4 (440 Hz), 80ms later
      const osc2 = this.ctx!.createOscillator();
      const gain2 = this.ctx!.createGain();
      const filter2 = this.ctx!.createBiquadFilter();

      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(this.masterGain!);

      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(2000, t + 0.08);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, t + 0.08);

      gain2.gain.setValueAtTime(0, t);
      gain2.gain.setValueAtTime(0.18, t + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.05, t + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc2.start(t + 0.08);
      osc2.stop(t + 0.28);
    } catch (e) { console.warn("playStopRecord error", e); }
  }

  // --- Gamified Feedback Sounds ---

  /** Gesture charging — deep warm pulse that gently swells */
  playCharging(progress: number) {
    if (!this.isReady()) return;
    this.ensureContext();
    try {
      const t = this.ctx!.currentTime;

      // Deep triangle wave foundation
      const osc1 = this.ctx!.createOscillator();
      const gain1 = this.ctx!.createGain();

      osc1.connect(gain1);
      gain1.connect(this.masterGain!);

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(110, t);

      gain1.gain.setValueAtTime(0, t);
      gain1.gain.linearRampToValueAtTime(0.12 * Math.min(progress, 1), t + 0.2);
      gain1.gain.linearRampToValueAtTime(0, t + 0.4);

      osc1.start(t);
      osc1.stop(t + 0.4);

      // Subtle sine overtone at octave above
      const osc2 = this.ctx!.createOscillator();
      const gain2 = this.ctx!.createGain();

      osc2.connect(gain2);
      gain2.connect(this.masterGain!);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(220, t);

      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(0.05 * Math.min(progress, 1), t + 0.2);
      gain2.gain.linearRampToValueAtTime(0, t + 0.4);

      osc2.start(t);
      osc2.stop(t + 0.4);
    } catch (e) { console.warn("playCharging error", e); }
  }

  /** Generation complete — elegant major arpeggio C5→E5→G5→C6 with shimmer */
  playSuccess() {
    if (!this.isReady()) return;
    this.ensureContext();
    try {
      const t = this.ctx!.currentTime;

      // C major arpeggio: C5 → E5 → G5 → C6
      const notes = [523, 659, 784, 1047];
      const noteSpacing = 0.08; // 80ms between each note
      const noteDecay = 0.3;    // 300ms per-note decay

      notes.forEach((freq, i) => {
        const noteStart = t + i * noteSpacing;

        // Main sine tone
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0, t);
        gain.gain.setValueAtTime(0.18, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDecay);

        osc.start(noteStart);
        osc.stop(noteStart + noteDecay);

        // Subtle octave overtone for richness
        const oscH = this.ctx!.createOscillator();
        const gainH = this.ctx!.createGain();
        oscH.connect(gainH);
        gainH.connect(this.masterGain!);

        oscH.type = 'sine';
        oscH.frequency.setValueAtTime(freq * 2, noteStart);

        gainH.gain.setValueAtTime(0, t);
        gainH.gain.setValueAtTime(0.04, noteStart);
        gainH.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDecay * 0.7);

        oscH.start(noteStart);
        oscH.stop(noteStart + noteDecay);
      });

      // Very subtle noise shimmer for sparkle
      const totalDuration = notes.length * noteSpacing + 0.3;
      const bufferSize = Math.ceil(this.ctx!.sampleRate * totalDuration);
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx!.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(6000, t);

      const noiseGain = this.ctx!.createGain();

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain!);

      noiseGain.gain.setValueAtTime(0.015, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + totalDuration);

      noise.start(t);
      noise.stop(t + totalDuration);
    } catch (e) { console.warn("playSuccess error", e); }
  }

  /** Error/warning — gentle descending two-note "nope" */
  playError() {
    if (!this.isReady()) return;
    this.ensureContext();
    try {
      const t = this.ctx!.currentTime;

      // First note: A4 (440 Hz)
      const osc1 = this.ctx!.createOscillator();
      const gain1 = this.ctx!.createGain();
      osc1.connect(gain1);
      gain1.connect(this.masterGain!);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, t);

      gain1.gain.setValueAtTime(0.15, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc1.start(t);
      osc1.stop(t + 0.06);

      // Second note: E4 (330 Hz), 60ms later
      const osc2 = this.ctx!.createOscillator();
      const gain2 = this.ctx!.createGain();
      osc2.connect(gain2);
      gain2.connect(this.masterGain!);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(330, t + 0.06);

      gain2.gain.setValueAtTime(0, t);
      gain2.gain.setValueAtTime(0.15, t + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc2.start(t + 0.06);
      osc2.stop(t + 0.12);
    } catch (e) { console.warn("playError error", e); }
  }

  // --- Ambient Generative Music ---
  private ambientInterval: ReturnType<typeof setInterval> | null = null;
  private ambientMaster: GainNode | null = null;
  private melodyDelay: DelayNode | null = null;
  private melodyFeedback: GainNode | null = null;
  private activeNoteCount = 0;

  /** Start a rich, evolving ambient soundscape for generation wait states */
  startAmbient(stage: 'thinking' | 'painting' | 'directing') {
    try {
      this.ensureContext();
      if (!this.isReady()) return;

      // If already playing, stop first and restart after brief pause
      if (this.ambientOscillators.length > 0 || this.ambientInterval) {
        this.stopAmbient();
        setTimeout(() => this.startAmbient(stage), 150);
        return;
      }

      const ctx = this.ctx!;
      const t = ctx.currentTime;

      // --- Master bus for all ambient layers ---
      this.ambientMaster = ctx.createGain();
      this.ambientMaster.gain.setValueAtTime(0, t);
      this.ambientMaster.gain.linearRampToValueAtTime(0.1, t + 2);
      this.ambientMaster.connect(this.masterGain!);
      this.ambientNodes.push(this.ambientMaster);

      // --- Stage-specific configuration ---
      type StageConfig = {
        chord: number[];       // Pad chord frequencies
        scale: number[];       // Melody scale frequencies
        filterRange: [number, number]; // Pad filter sweep range
        filterSpeed: number;   // LFO rate for filter sweep (Hz)
        melodyDelay: number;   // Delay time in seconds
        melodyFeedback: number;// Feedback gain (0-0.5)
        melodyInterval: [number, number]; // Min/max ms between notes
        melodyDecay: number;   // Note decay in seconds
        noiseType: BiquadFilterType; // Noise filter type
        noiseFreq: number;     // Noise filter frequency
        noiseGain: number;     // Noise layer gain
        padType: OscillatorType;
      };

      const configs: Record<string, StageConfig> = {
        thinking: {
          // D minor — mysterious, contemplative
          chord: [146.83, 220.00, 349.23],       // D3, A3, F4
          scale: [146.83, 174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00, 440.00],
          filterRange: [200, 900], filterSpeed: 0.07,
          melodyDelay: 0.35, melodyFeedback: 0.3,
          melodyInterval: [2000, 4500], melodyDecay: 0.6,
          noiseType: 'bandpass', noiseFreq: 400, noiseGain: 0.008,
          padType: 'triangle',
        },
        painting: {
          // C major pentatonic — bright, creative, flowing
          chord: [261.63, 329.63, 392.00],        // C4, E4, G4
          scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25],
          filterRange: [400, 1400], filterSpeed: 0.1,
          melodyDelay: 0.25, melodyFeedback: 0.25,
          melodyInterval: [1500, 3500], melodyDecay: 0.45,
          noiseType: 'highpass', noiseFreq: 3000, noiseGain: 0.005,
          padType: 'sine',
        },
        directing: {
          // G mixolydian — cinematic, epic
          chord: [196.00, 246.94, 293.66],        // G3, B3, D4
          scale: [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00],
          filterRange: [300, 1100], filterSpeed: 0.08,
          melodyDelay: 0.4, melodyFeedback: 0.35,
          melodyInterval: [2000, 4000], melodyDecay: 0.55,
          noiseType: 'bandpass', noiseFreq: 500, noiseGain: 0.006,
          padType: 'triangle',
        },
      };

      const cfg = configs[stage];

      // ============================================
      // LAYER 1: EVOLVING PAD CHORD with filter sweep
      // ============================================
      const padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.Q.setValueAtTime(2.5, t);
      padFilter.frequency.setValueAtTime(cfg.filterRange[0], t);
      padFilter.connect(this.ambientMaster);
      this.ambientNodes.push(padFilter);

      // Filter sweep LFO
      const filterLFO = ctx.createOscillator();
      const filterLFOGain = ctx.createGain();
      filterLFO.type = 'sine';
      filterLFO.frequency.setValueAtTime(cfg.filterSpeed, t);
      const filterCenter = (cfg.filterRange[0] + cfg.filterRange[1]) / 2;
      const filterDepth = (cfg.filterRange[1] - cfg.filterRange[0]) / 2;
      padFilter.frequency.setValueAtTime(filterCenter, t);
      filterLFOGain.gain.setValueAtTime(filterDepth, t);
      filterLFO.connect(filterLFOGain);
      filterLFOGain.connect(padFilter.frequency);
      filterLFO.start(t);
      this.ambientOscillators.push(filterLFO);
      this.ambientNodes.push(filterLFOGain);

      // Chord oscillators (with slight detuning for richness)
      for (let i = 0; i < cfg.chord.length; i++) {
        const freq = cfg.chord[i];

        // Main voice
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = cfg.padType;
        osc.frequency.setValueAtTime(freq, t);
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(0.04, t + 2);
        osc.connect(oscGain);
        oscGain.connect(padFilter);
        osc.start(t);
        this.ambientOscillators.push(osc);
        this.ambientNodes.push(oscGain);

        // Detuned voice (+3 cents) for width
        const osc2 = ctx.createOscillator();
        const oscGain2 = ctx.createGain();
        osc2.type = cfg.padType;
        osc2.frequency.setValueAtTime(freq * 1.0017, t); // ~3 cents sharp
        oscGain2.gain.setValueAtTime(0, t);
        oscGain2.gain.linearRampToValueAtTime(0.025, t + 2);
        osc2.connect(oscGain2);
        oscGain2.connect(padFilter);
        osc2.start(t);
        this.ambientOscillators.push(osc2);
        this.ambientNodes.push(oscGain2);
      }

      // ============================================
      // LAYER 2: MELODIC NOTES with delay reverb
      // ============================================
      // Create a shared delay line (pseudo-reverb)
      this.melodyDelay = ctx.createDelay(1.0);
      this.melodyDelay.delayTime.setValueAtTime(cfg.melodyDelay, t);
      this.melodyFeedback = ctx.createGain();
      this.melodyFeedback.gain.setValueAtTime(cfg.melodyFeedback, t);

      // Delay feedback loop: delay -> feedback -> delay
      this.melodyDelay.connect(this.melodyFeedback);
      this.melodyFeedback.connect(this.melodyDelay);

      // Delay output -> filter -> master
      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.setValueAtTime(2000, t);
      delayFilter.Q.setValueAtTime(0.5, t);
      this.melodyDelay.connect(delayFilter);
      delayFilter.connect(this.ambientMaster);
      this.ambientNodes.push(this.melodyDelay, this.melodyFeedback, delayFilter);

      // Melody scheduling interval
      this.activeNoteCount = 0;
      const playNote = () => {
        try {
          if (!this.ctx || !this.ambientMaster || !this.melodyDelay) return;
          const now = this.ctx.currentTime;

          // Pick a random note from the scale
          const freq = cfg.scale[Math.floor(Math.random() * cfg.scale.length)];
          // Occasional octave jump for variety
          const octaveShift = Math.random() > 0.75 ? 2 : 1;
          const noteFreq = freq * octaveShift;

          // Main note oscillator
          const osc = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(noteFreq, now);

          // Gentle bell-like envelope
          noteGain.gain.setValueAtTime(0, now);
          noteGain.gain.linearRampToValueAtTime(0.06, now + 0.02); // Fast attack
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + cfg.melodyDecay);

          // Chorus: second detuned oscillator
          const osc2 = this.ctx.createOscillator();
          const noteGain2 = this.ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(noteFreq * 1.003, now); // Slight detune
          noteGain2.gain.setValueAtTime(0, now);
          noteGain2.gain.linearRampToValueAtTime(0.03, now + 0.02);
          noteGain2.gain.exponentialRampToValueAtTime(0.001, now + cfg.melodyDecay * 0.8);

          // Connect: note -> direct out + delay line
          osc.connect(noteGain);
          osc2.connect(noteGain2);
          noteGain.connect(this.ambientMaster!);
          noteGain2.connect(this.ambientMaster!);
          noteGain.connect(this.melodyDelay!);

          osc.start(now);
          osc.stop(now + cfg.melodyDecay + 0.1);
          osc2.start(now);
          osc2.stop(now + cfg.melodyDecay + 0.1);

          this.activeNoteCount++;

          // Auto-cleanup after note ends
          setTimeout(() => {
            try {
              osc.disconnect();
              osc2.disconnect();
              noteGain.disconnect();
              noteGain2.disconnect();
            } catch (_) { /* already disconnected */ }
            this.activeNoteCount--;
          }, (cfg.melodyDecay + 0.5) * 1000);
        } catch (_) { /* ignore note scheduling errors */ }
      };

      // Schedule notes at organic random intervals
      const scheduleNext = () => {
        if (!this.ambientInterval && !this.ambientMaster) return;
        // Skip if too many active notes
        if (this.activeNoteCount < 8) {
          playNote();
        }
        const nextDelay = cfg.melodyInterval[0] + Math.random() * (cfg.melodyInterval[1] - cfg.melodyInterval[0]);
        this.ambientInterval = setTimeout(scheduleNext, nextDelay) as unknown as ReturnType<typeof setInterval>;
      };

      // First note after 1 second (let pad establish first)
      this.ambientInterval = setTimeout(scheduleNext, 1000) as unknown as ReturnType<typeof setInterval>;

      // ============================================
      // LAYER 3: ATMOSPHERIC NOISE TEXTURE
      // ============================================
      const noiseDuration = 2; // 2-second looped buffer
      const bufferSize = Math.ceil(ctx.sampleRate * noiseDuration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = cfg.noiseType;
      noiseFilter.frequency.setValueAtTime(cfg.noiseFreq, t);
      noiseFilter.Q.setValueAtTime(1, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, t);
      noiseGain.gain.linearRampToValueAtTime(cfg.noiseGain, t + 3);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ambientMaster);

      noiseSource.start(t);
      this.ambientOscillators.push(noiseSource as unknown as OscillatorNode);
      this.ambientNodes.push(noiseFilter, noiseGain);

    } catch (e) { console.warn("startAmbient error", e); }
  }

  /** Gracefully fade out and stop all ambient layers */
  stopAmbient() {
    try {
      // Clear the melody scheduler
      if (this.ambientInterval) {
        clearTimeout(this.ambientInterval as unknown as number);
        this.ambientInterval = null;
      }

      if (this.ambientNodes.length === 0 && !this.ambientMaster) return;

      const t = this.ctx?.currentTime ?? 0;

      // Fade the master bus to 0 over 1 second for a musical fade-out
      if (this.ambientMaster) {
        try {
          this.ambientMaster.gain.cancelScheduledValues(t);
          this.ambientMaster.gain.setValueAtTime(this.ambientMaster.gain.value, t);
          this.ambientMaster.gain.linearRampToValueAtTime(0, t + 1);
        } catch (_) { /* ignore */ }
      }

      // After the fade, stop and disconnect everything
      const oscillators = [...this.ambientOscillators];
      const nodes = [...this.ambientNodes];
      const master = this.ambientMaster;
      const delay = this.melodyDelay;
      const feedback = this.melodyFeedback;

      setTimeout(() => {
        for (const osc of oscillators) {
          try { osc.stop(); } catch (_) { /* already stopped */ }
          try { osc.disconnect(); } catch (_) { /* already disconnected */ }
        }
        for (const node of nodes) {
          try { node.disconnect(); } catch (_) { /* already disconnected */ }
        }
        if (master) try { master.disconnect(); } catch (_) { /* */ }
        if (delay) try { delay.disconnect(); } catch (_) { /* */ }
        if (feedback) try { feedback.disconnect(); } catch (_) { /* */ }
      }, 1200);

      this.ambientOscillators = [];
      this.ambientNodes = [];
      this.ambientMaster = null;
      this.melodyDelay = null;
      this.melodyFeedback = null;
      this.activeNoteCount = 0;
    } catch (e) { console.warn("stopAmbient error", e); }
  }
}

export const soundService = new SoundService();
