import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechSynthesisService {
  private synth: SpeechSynthesis;
  private aria: SpeechSynthesisVoice | null = null;
  private greetingPlayedKey = 'bbms_greeting_played_date';
  private speechEnabledKey = 'bbms_speech_enabled';

  constructor() {
    // Initialize speech synthesis
    this.synth = window.speechSynthesis;

    // Load voices when they're available
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = this.initializeVoices.bind(this);
    } else {
      // For browsers that don't support onvoiceschanged event
      setTimeout(() => this.initializeVoices(), 500);
    }

    // Set default speech enabled value if not already set
    if (localStorage.getItem(this.speechEnabledKey) === null) {
      this.setSpeechEnabled(true);
    }
  }

  /**
   * Initialize and select the Aria voice
   */
  private initializeVoices(): void {
    const voices = this.synth.getVoices();
    this.aria = voices.find(v => v.name.includes("Aria") && v.lang === "en-US") || null;

    // If Aria is not available, use the first English voice
    if (!this.aria) {
      this.aria = voices.find(v => v.lang.includes("en")) || voices[0];
      console.log('Aria voice not found, using alternative voice:', this.aria?.name);
    } else {
      console.log('Aria voice found and selected');
    }
  }

  /**
   * Speak the provided text using the selected voice
   * @param text Text to be spoken
   */
  speak(text: string): void {
    // Don't speak if speech synthesis is not available, text is empty, or speech is disabled
    if (!this.synth || !text || !this.isSpeechEnabled()) return;

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Set the voice if available
    if (this.aria) {
      utterance.voice = this.aria;
    }

    // Set other properties
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Speak the text
    this.synth.speak(utterance);
  }

  /**
   * Check if speech is enabled
   * @returns Boolean indicating if speech is enabled
   */
  isSpeechEnabled(): boolean {
    return localStorage.getItem(this.speechEnabledKey) === 'true';
  }

  /**
   * Set speech enabled state
   * @param enabled Boolean indicating if speech should be enabled
   */
  setSpeechEnabled(enabled: boolean): void {
    localStorage.setItem(this.speechEnabledKey, enabled.toString());
  }

  /**
   * Toggle speech enabled state
   * @returns New speech enabled state
   */
  toggleSpeechEnabled(): boolean {
    const newState = !this.isSpeechEnabled();
    this.setSpeechEnabled(newState);
    return newState;
  }

  /**
   * Check if greeting has already been played today
   * @returns Boolean indicating if greeting has been played today
   */
  hasGreetingPlayedToday(): boolean {
    const lastPlayedDate = localStorage.getItem(this.greetingPlayedKey);
    const today = new Date().toDateString();

    return lastPlayedDate === today;
  }

  /**
   * Mark greeting as played for today
   */
  markGreetingAsPlayed(): void {
    const today = new Date().toDateString();
    localStorage.setItem(this.greetingPlayedKey, today);
  }

  /**
   * Get appropriate greeting based on time of day
   * @returns Greeting string (Good morning/afternoon/evening)
   */
  getTimeBasedGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    } else if (hour < 18) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  }
}
