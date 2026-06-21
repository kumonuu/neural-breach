// sound.js - Procedural Cyberpunk Audio Synthesizer using Web Audio API

class SoundFX {
    constructor() {
        this.ctx = null;
        this.bgOscillator = null;
        this.bgGain = null;
        this.muted = false;
        this.initialized = false;
        this.bossLfo = null;
        this.bossDrone = null;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
            this.startAmbience();
        } catch (e) {
            console.warn("Web Audio API not supported / blocked by policy.", e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.bgGain) {
            this.bgGain.gain.setValueAtTime(this.muted ? 0 : 0.04, this.ctx.currentTime);
        }
        return this.muted;
    }

    startAmbience() {
        if (!this.ctx || this.muted) return;

        // Dark ambient cyber drone
        this.bgOscillator = this.ctx.createOscillator();
        this.bgOscillator.type = 'sawtooth';
        this.bgOscillator.frequency.setValueAtTime(55, this.ctx.currentTime); // low A

        // Low-pass filter to make it rumbling and atmospheric
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(110, this.ctx.currentTime);
        filter.Q.setValueAtTime(3, this.ctx.currentTime);

        // Slow frequency modulation LFO
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime); // very slow
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(3, this.ctx.currentTime);

        this.bgGain = this.ctx.createGain();
        this.bgGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(this.bgOscillator.frequency);
        this.bgOscillator.connect(filter);
        filter.connect(this.bgGain);
        this.bgGain.connect(this.ctx.destination);

        lfo.start();
        this.bgOscillator.start();
    }

    startBossMusic() {
        if (!this.ctx || this.muted) return;
        this.stopBossMusic();

        // Intense boss drone & pulsating warning synthesizer
        this.bossDrone = this.ctx.createOscillator();
        this.bossDrone.type = 'sawtooth';
        this.bossDrone.frequency.setValueAtTime(65.41, this.ctx.currentTime); // C2 low pitch

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, this.ctx.currentTime);

        this.bossLfo = this.ctx.createOscillator();
        this.bossLfo.type = 'square';
        this.bossLfo.frequency.setValueAtTime(3.5, this.ctx.currentTime); // Fast pulse

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(25, this.ctx.currentTime);

        this.bossLfo.connect(lfoGain);
        lfoGain.connect(this.bossDrone.frequency);
        this.bossDrone.connect(filter);
        filter.connect(this.bgGain); // connects to ambient controller gain

        this.bossLfo.start();
        this.bossDrone.start();
    }

    stopBossMusic() {
        try {
            if (this.bossDrone) {
                this.bossDrone.stop();
                this.bossDrone = null;
            }
            if (this.bossLfo) {
                this.bossLfo.stop();
                this.bossLfo = null;
            }
        } catch (e) {}
    }

    playClick() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    }

    playSuccess() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const notes = [587.33, 659.25, 783.99, 1174.66]; // D5, E5, G5, D6
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0.12, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.25);
        });
    }

    playFailure() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.5);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, now);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.5);
    }

    playTick() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.02);
    }

    playPortal() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.7);

        gain.gain.setValueAtTime(0.005, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.7);
    }

    playRewind() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.5);
    }

    playAlarm() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.3);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(now + 0.3);
    }
}

const sfx = new SoundFX();
window.sfx = sfx;
