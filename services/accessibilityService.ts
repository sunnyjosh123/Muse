
/**
 * AccessibilityService - Unified accessibility utilities
 * 
 * Provides:
 * - Haptic feedback (vibration) for deaf/HoH users on mobile
 * - Screen reader announcements via aria-live regions
 * - Audio speech announcements for vision-impaired users
 * - Visual flash feedback for deaf users
 */

class AccessibilityService {
    private speechEnabled: boolean = true;
    private hapticEnabled: boolean = true;
    private announceElement: HTMLDivElement | null = null;

    constructor() {
        // Restore persisted preferences
        if (typeof localStorage !== 'undefined') {
            try {
                const audio = localStorage.getItem('muse-audio-announce');
                if (audio !== null) this.speechEnabled = audio === 'true';
                const haptic = localStorage.getItem('muse-haptic');
                if (haptic !== null) this.hapticEnabled = haptic === 'true';
            } catch {}
        }
        // Create aria-live region for screen reader announcements
        if (typeof document !== 'undefined') {
            this.createAnnounceRegion();
        }
    }

    private createAnnounceRegion() {
        // Don't duplicate
        if (document.getElementById('muse-a11y-announce')) {
            this.announceElement = document.getElementById('muse-a11y-announce') as HTMLDivElement;
            return;
        }
        const el = document.createElement('div');
        el.id = 'muse-a11y-announce';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-atomic', 'true');
        // Visually hidden but accessible to screen readers
        el.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
        document.body.appendChild(el);
        this.announceElement = el;
    }

    /**
     * Announce a message to screen readers via aria-live region
     */
    announce(message: string) {
        if (!this.announceElement) this.createAnnounceRegion();
        if (this.announceElement) {
            // Clear then set to trigger re-announcement
            this.announceElement.textContent = '';
            requestAnimationFrame(() => {
                if (this.announceElement) {
                    this.announceElement.textContent = message;
                }
            });
        }
    }

    /**
     * Speak a message aloud using Web Speech Synthesis
     * For vision-impaired users who benefit from audio confirmations
     */
    speak(text: string, lang: string = 'en') {
        if (!this.speechEnabled) return;
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        // Cancel any pending speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 0.7;
        utterance.lang = this.getLangCode(lang);

        // Try to pick a matching voice
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
        if (match) utterance.voice = match;

        window.speechSynthesis.speak(utterance);
    }

    private getLangCode(lang: string): string {
        const map: Record<string, string> = {
            'en': 'en-US', 'zh': 'zh-CN', 'zh-TW': 'zh-TW', 'es': 'es-ES',
            'ja': 'ja-JP', 'ko': 'ko-KR', 'fr': 'fr-FR', 'de': 'de-DE'
        };
        return map[lang] || 'en-US';
    }

    /**
     * Trigger haptic feedback (vibration) on supported devices
     * Patterns: 'tap' (short), 'confirm' (double), 'error' (long), 'success' (pattern)
     */
    haptic(pattern: 'tap' | 'confirm' | 'error' | 'success' | 'gesture') {
        if (!this.hapticEnabled) return;
        if (typeof navigator === 'undefined' || !navigator.vibrate) return;

        try {
            switch (pattern) {
                case 'tap':
                    navigator.vibrate(30);
                    break;
                case 'confirm':
                    navigator.vibrate([40, 60, 40]);
                    break;
                case 'error':
                    navigator.vibrate([100, 50, 100, 50, 200]);
                    break;
                case 'success':
                    navigator.vibrate([50, 30, 50, 30, 100]);
                    break;
                case 'gesture':
                    navigator.vibrate([20, 30, 60]);
                    break;
            }
        } catch {
            // Vibration API not supported or blocked
        }
    }

    setSpeechEnabled(enabled: boolean) {
        this.speechEnabled = enabled;
        if (!enabled) {
            window.speechSynthesis?.cancel();
        }
    }

    setHapticEnabled(enabled: boolean) {
        this.hapticEnabled = enabled;
    }
}

export const a11yService = new AccessibilityService();
