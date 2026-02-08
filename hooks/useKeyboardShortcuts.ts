
import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcutActions {
    onVoiceToggle: () => void;
    onInspire: () => void;
    onGenerate: () => void;
    onVideo: () => void;
    onLiveChat: () => void;
    onOpenSettings: () => void;
    onOpenHelp: () => void;
    onOpenHistory: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onToggleCamera: () => void;
    onClearPrompt: () => void;
    onEscape: () => void;
}

/**
 * Keyboard shortcuts for accessibility - allows full app control without gestures or mouse.
 * 
 * Shortcuts:
 *  V          - Toggle voice input
 *  I          - Trigger inspiration
 *  G          - Generate image
 *  D          - Generate video (Direct)
 *  L          - Open Live Chat
 *  S          - Open Settings
 *  H          - Open Help (or ? key)
 *  Y          - Open History
 *  Ctrl+Z     - Undo
 *  Ctrl+Shift+Z - Redo
 *  C          - Toggle Camera
 *  X          - Clear prompt
 *  Escape     - Close any open modal/overlay
 */
export function useKeyboardShortcuts(
    actions: KeyboardShortcutActions,
    enabled: boolean = true
) {
    const actionsRef = useRef(actions);
    actionsRef.current = actions;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        // Don't intercept if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            // Only handle Escape in input fields
            if (e.key === 'Escape') {
                actionsRef.current.onEscape();
                (target as HTMLElement).blur();
            }
            return;
        }

        // Ctrl+Z / Ctrl+Shift+Z - Undo/Redo (works even outside input)
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                actionsRef.current.onUndo();
                return;
            }
            if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                e.preventDefault();
                actionsRef.current.onRedo();
                return;
            }
        }

        // Single-key shortcuts (only when no modifier keys)
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        switch (e.key.toLowerCase()) {
            case 'v':
                e.preventDefault();
                actionsRef.current.onVoiceToggle();
                break;
            case 'i':
                e.preventDefault();
                actionsRef.current.onInspire();
                break;
            case 'g':
                e.preventDefault();
                actionsRef.current.onGenerate();
                break;
            case 'd':
                e.preventDefault();
                actionsRef.current.onVideo();
                break;
            case 'l':
                e.preventDefault();
                actionsRef.current.onLiveChat();
                break;
            case 's':
                e.preventDefault();
                actionsRef.current.onOpenSettings();
                break;
            case 'h':
            case '?':
                e.preventDefault();
                actionsRef.current.onOpenHelp();
                break;
            case 'y':
                e.preventDefault();
                actionsRef.current.onOpenHistory();
                break;
            case 'c':
                e.preventDefault();
                actionsRef.current.onToggleCamera();
                break;
            case 'x':
                e.preventDefault();
                actionsRef.current.onClearPrompt();
                break;
            case 'escape':
                actionsRef.current.onEscape();
                break;
        }
    }, [enabled]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
