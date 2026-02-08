import { useState, useEffect, useRef, useCallback } from 'react';
import { soundService } from '../services/soundService';

interface UseSpeechToTextProps {
  isEnabled: boolean;
  onResult?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

/** Minimum ms between toggle actions to prevent rapid gesture noise */
const TOGGLE_COOLDOWN_MS = 1000;

export const useSpeechToText = ({ isEnabled, onResult, onStart, onEnd, onError }: UseSpeechToTextProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  /** Tracks actual recording state synchronously (avoids stale closure issues) */
  const isRecordingRef = useRef(false);
  /** Timestamp of the last toggle action for cooldown enforcement */
  const lastToggleRef = useRef(0);

  // Store callbacks in refs to avoid re-creating SpeechRecognition on every render
  const onResultRef = useRef(onResult);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Keep the ref in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (!isEnabled) {
      // When disabled externally, force-stop any active session
      if (recognitionRef.current && isRecordingRef.current) {
        try { recognitionRef.current.stop(); } catch (_) { /* ignore */ }
      }
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        isRecordingRef.current = true;
        onStartRef.current?.();
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        const currentText = finalTranscript + interimTranscript;
        if (currentText) {
          onResultRef.current?.(currentText);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        isRecordingRef.current = false;
        onEndRef.current?.();
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error", event.error);
        setError(event.error);
        setIsRecording(false);
        isRecordingRef.current = false;
        onErrorRef.current?.(event.error);
      };

      recognitionRef.current = recognition;
    } else {
      setError("Browser not supported");
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) { /* ignore */ }
      }
    };
  }, [isEnabled]);

  const startRecording = useCallback(() => {
    if (recognitionRef.current && !isRecordingRef.current) {
      try {
        recognitionRef.current.start();
        soundService.playStartRecord();
      } catch (e) {
        console.warn("Recognition start failed", e);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecordingRef.current) {
      try {
        recognitionRef.current.stop();
        soundService.playStopRecord();
      } catch (e) {
        console.warn("Recognition stop failed", e);
      }
    }
  }, []);

  /**
   * Toggle recording on/off with a built-in cooldown to prevent rapid
   * gesture noise from toggling too fast.
   * Returns true if the toggle was applied, false if it was rejected (cooldown).
   */
  const toggleRecording = useCallback((): boolean => {
    const now = Date.now();
    if (now - lastToggleRef.current < TOGGLE_COOLDOWN_MS) {
      return false; // Cooldown active — reject
    }
    lastToggleRef.current = now;

    if (isRecordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
    return true;
  }, [startRecording, stopRecording]);

  /**
   * Stop recording and wait for the browser's SpeechRecognition `onend` event
   * so that the final transcript result is fully delivered before resolving.
   *
   * Use this when you need to guarantee the transcript is committed before
   * performing a follow-up action (e.g. image generation after voice input).
   *
   * If recording is not active, resolves immediately.
   * Includes a safety timeout so callers never hang indefinitely.
   */
  const stopAndCapture = useCallback((): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (!recognitionRef.current || !isRecordingRef.current) {
        resolve();
        return;
      }

      // Safety timeout — resolve even if onend never fires (e.g. browser quirk)
      const safetyTimer = setTimeout(() => {
        setIsRecording(false);
        isRecordingRef.current = false;
        resolve();
      }, 1500);

      // Listen for the onend event which fires after the final result is delivered
      const originalOnEnd = recognitionRef.current.onend;
      recognitionRef.current.onend = () => {
        clearTimeout(safetyTimer);
        // Call the original onend handler so state is properly updated
        if (typeof originalOnEnd === 'function') {
          originalOnEnd.call(recognitionRef.current);
        }
        resolve();
      };

      try {
        recognitionRef.current.stop();
        soundService.playStopRecord();
      } catch (_) {
        clearTimeout(safetyTimer);
        setIsRecording(false);
        isRecordingRef.current = false;
        resolve();
      }
    });
  }, []);

  /**
   * Force-stop recording unconditionally.
   * Used for cleanup scenarios (logout, camera off, live chat open)
   * where we must ensure recording is off regardless of cooldown.
   */
  const forceStop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) { /* may already be stopped */ }
    }
    // Reset state immediately as a safety measure
    setIsRecording(false);
    isRecordingRef.current = false;
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    stopAndCapture,
    toggleRecording,
    forceStop
  };
};