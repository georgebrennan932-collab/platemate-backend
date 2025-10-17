export type SoundType = 
  | 'notification' 
  | 'success' 
  | 'error' 
  | 'click' 
  | 'scan' 
  | 'achievement'
  | 'reminder';

class SoundService {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private enabled = true;

  constructor() {
    this.loadSoundSettings();
  }

  private loadSoundSettings() {
    const soundEnabled = localStorage.getItem('platemate-sounds-enabled');
    this.enabled = soundEnabled !== 'false'; // Default to enabled
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Generate sounds programmatically
      await this.generateSounds();
    } catch (error) {
      console.error('Sound initialization failed:', error);
    }
  }

  private async generateSounds(): Promise<void> {
    if (!this.audioContext) return;

    // Generate different sounds programmatically
    const sounds: Record<SoundType, () => AudioBuffer> = {
      notification: () => this.generateTone(800, 0.3, 'sine'),
      success: () => this.generateChord([523, 659, 784], 0.4), // C major chord
      error: () => this.generateTone(200, 0.5, 'square'),
      click: () => this.generateTone(1000, 0.1, 'sine'),
      scan: () => this.generateSweep(600, 1200, 0.3),
      achievement: () => this.generateMelody([523, 659, 784, 1047], 0.6), // C-E-G-C
      reminder: () => this.generateGentleTone(440, 0.5)
    };

    for (const [type, generator] of Object.entries(sounds)) {
      try {
        const buffer = generator();
        this.sounds.set(type as SoundType, buffer);
      } catch (error) {
        console.warn(`Failed to generate ${type} sound:`, error);
      }
    }
  }

  private generateTone(frequency: number, duration: number, type: OscillatorType = 'sine'): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      
      switch (type) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'triangle':
          sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t));
          break;
      }
      
      // Add envelope (fade in/out)
      const envelope = Math.sin((Math.PI * i) / length);
      data[i] = sample * envelope * 0.3;
    }

    return buffer;
  }

  private generateChord(frequencies: number[], duration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;
      
      // Add all frequencies together
      for (const freq of frequencies) {
        sample += Math.sin(2 * Math.PI * freq * t) / frequencies.length;
      }
      
      // Add envelope
      const envelope = Math.sin((Math.PI * i) / length);
      data[i] = sample * envelope * 0.3;
    }

    return buffer;
  }

  private generateSweep(startFreq: number, endFreq: number, duration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const progress = i / length;
      const frequency = startFreq + (endFreq - startFreq) * progress;
      const t = i / sampleRate;
      
      const sample = Math.sin(2 * Math.PI * frequency * t);
      
      // Add envelope
      const envelope = Math.sin((Math.PI * i) / length);
      data[i] = sample * envelope * 0.2;
    }

    return buffer;
  }

  private generateMelody(frequencies: number[], duration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const totalLength = sampleRate * duration;
    const noteLength = totalLength / frequencies.length;
    const buffer = this.audioContext.createBuffer(1, totalLength, sampleRate);
    const data = buffer.getChannelData(0);

    frequencies.forEach((freq, noteIndex) => {
      const startSample = Math.floor(noteIndex * noteLength);
      const endSample = Math.floor((noteIndex + 1) * noteLength);
      
      for (let i = startSample; i < endSample && i < totalLength; i++) {
        const localI = i - startSample;
        const localLength = endSample - startSample;
        const t = localI / sampleRate;
        
        const sample = Math.sin(2 * Math.PI * freq * t);
        
        // Add envelope for each note
        const envelope = Math.sin((Math.PI * localI) / localLength);
        data[i] = sample * envelope * 0.25;
      }
    });

    return buffer;
  }

  private generateGentleTone(frequency: number, duration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('Audio context not initialized');
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      
      // Create a gentle, warm sound with multiple harmonics
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      const harmonic2 = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.3;
      const harmonic3 = Math.sin(2 * Math.PI * frequency * 3 * t) * 0.1;
      
      let sample = fundamental + harmonic2 + harmonic3;
      
      // Smooth envelope
      const envelope = Math.pow(Math.sin((Math.PI * i) / length), 2);
      data[i] = sample * envelope * 0.2;
    }

    return buffer;
  }

  async play(soundType: SoundType, volume: number = 1): Promise<void> {
    if (!this.enabled || !this.audioContext || !this.sounds.has(soundType)) {
      return;
    }

    try {
      // Resume audio context if suspended (required by browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const buffer = this.sounds.get(soundType)!;
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      gainNode.gain.value = Math.min(Math.max(volume, 0), 1) * 0.5; // Max volume 50%
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start();
    } catch (error) {
      console.warn(`Failed to play ${soundType} sound:`, error);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('platemate-sounds-enabled', enabled.toString());
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Convenience methods for common actions
  async playSuccess(): Promise<void> {
    await this.play('success');
  }

  async playError(): Promise<void> {
    await this.play('error');
  }

  async playClick(): Promise<void> {
    await this.play('click', 0.3);
  }

  async playNotification(): Promise<void> {
    await this.play('notification');
  }

  async playAchievement(): Promise<void> {
    await this.play('achievement');
  }

  async playScan(): Promise<void> {
    await this.play('scan');
  }

  async playReminder(): Promise<void> {
    await this.play('reminder');
  }
}

export const soundService = new SoundService();