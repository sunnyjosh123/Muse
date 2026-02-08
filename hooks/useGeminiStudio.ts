
import { useState, useCallback, useRef, useEffect } from 'react';
import { generateInspiration, generateMagicImage, generateVideoFromImage, runApiDiagnostics, refinePromptWithThoughts, generateSocialCopy } from '../services/geminiService';
import { soundService } from '../services/soundService';

// History entry for inspiration iteration chain
interface HistoryEntry {
  id: string;
  prompt: string;
  style: string;
  image: string | null;
  thought: string | null;
  // NEW: Agentic Memory
  researchResults?: string[];
  timestamp: number;
}

interface GeminiStudioState {
  prompt: string;
  styleModifier: string;
  generatedImage: string | null;
  generatedVideo: string | null;
  isLoading: boolean;
  feedbackMessage: string;
  providerInfo: string;
  thoughtLog: string | null;
  uiMode: 'detection' | 'generation' | 'complete';
  streamingThought: string;
  generationProgress: number;
  currentStage: 'idle' | 'thinking' | 'researching' | 'painting' | 'directing' | 'complete';
  // NEW: Computer Use / Research State
  researchQuery: string | null;
  researchResults: string[];
  // NEW: Social Agent State
  socialCopy: { title: string; text: string; hashtags: string[] } | null;
  isSharing: boolean;
}

export interface GeminiConfig {
    enableMemory?: boolean;
    customInstructions?: string;
    isGuest?: boolean;
}

export const useGeminiStudio = (config?: GeminiConfig) => {
  const [studioState, setStudioState] = useState<GeminiStudioState>({
    prompt: '',
    styleModifier: '',
    generatedImage: null,
    generatedVideo: null,
    isLoading: false,
    feedbackMessage: 'Ready to create magic...',
    providerInfo: '',
    thoughtLog: null,
    uiMode: 'detection',
    streamingThought: '',
    generationProgress: 0,
    currentStage: 'idle',
    researchQuery: null,
    researchResults: [],
    socialCopy: null,
    isSharing: false
  });

  // NEW: History for inspiration iteration chain (Long Context feature)
  const historyRef = useRef<HistoryEntry[]>([]);
  // Track history index in state so UI updates properly
  const [historyIndex, setHistoryIndex] = useState(-1);

  // --- Interval & AbortController refs for cleanup on unmount ---
  const activeIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup all active intervals and abort pending requests on unmount
  useEffect(() => {
    return () => {
      activeIntervalsRef.current.forEach(id => clearInterval(id));
      activeIntervalsRef.current.clear();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Ref to hold the latest state for async functions — avoids stale closures
  const studioStateRef = useRef(studioState);
  useEffect(() => { studioStateRef.current = studioState; }, [studioState]);

  const updatePrompt = useCallback((newPrompt: string) => {
    setStudioState(prev => ({ ...prev, prompt: newPrompt }));
  }, []);

  const setFeedback = useCallback((msg: string) => {
    setStudioState(prev => ({ ...prev, feedbackMessage: msg }));
  }, []);

  // NEW: Save current state to history
  const saveToHistory = useCallback((currentState: GeminiStudioState, currentIndex: number) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      prompt: currentState.prompt,
      style: currentState.styleModifier,
      image: currentState.generatedImage,
      thought: currentState.thoughtLog,
      researchResults: currentState.researchResults,
      timestamp: Date.now()
    };

    // If we're not at the end of history, truncate forward history
    if (currentIndex < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, currentIndex + 1);
    }

    historyRef.current.push(entry);
    let newIndex = historyRef.current.length - 1;

    // Limit history to last 10 entries
    if (historyRef.current.length > 10) {
      historyRef.current.shift();
      newIndex--;
    }

    setHistoryIndex(newIndex);
  }, []);

  // NEW: Navigate history backwards (for "undo" gesture)
  const goBackInHistory = useCallback(() => {
    setHistoryIndex(prevIndex => {
      if (prevIndex > 0) {
        const newIndex = prevIndex - 1;
        const entry = historyRef.current[newIndex];

        soundService.playClick();
        setStudioState(prev => ({
          ...prev,
          prompt: entry.prompt,
          styleModifier: entry.style,
          generatedImage: entry.image,
          thoughtLog: entry.thought,
          researchResults: entry.researchResults || [],
          feedbackMessage: `⏪ Reverted (${newIndex + 1}/${historyRef.current.length})`
        }));

        return newIndex;
      }
      return prevIndex;
    });
    return true;
  }, []);

  // NEW: Navigate history forwards (for "redo" gesture)
  const goForwardInHistory = useCallback(() => {
    setHistoryIndex(prevIndex => {
      if (prevIndex < historyRef.current.length - 1) {
        const newIndex = prevIndex + 1;
        const entry = historyRef.current[newIndex];

        soundService.playClick();
        setStudioState(prev => ({
          ...prev,
          prompt: entry.prompt,
          styleModifier: entry.style,
          generatedImage: entry.image,
          thoughtLog: entry.thought,
          researchResults: entry.researchResults || [],
          feedbackMessage: `⏩ Restored (${newIndex + 1}/${historyRef.current.length})`
        }));

        return newIndex;
      }
      return prevIndex;
    });
    return true;
  }, []);

  // NEW: Simulate "Computer Use" / Deep Research
  const performComputerUse = async (query: string): Promise<string[]> => {
    setStudioState(prev => ({
      ...prev,
      currentStage: 'researching',
      researchQuery: query,
      streamingThought: `✦ Muse Opening browser context...\n✦ Muse Searching for "${query}"...\n✦ Muse Analyzing visual styles...`,
      feedbackMessage: "Muse: Researching..."
    }));

    // Simulate network delay
    await new Promise(r => setTimeout(r, 2000));

    // Mock results
    const mockResults = [
      `Ref 1: ${query} Visual Trends`,
      `Ref 2: Avant-Garde Archives`,
      `Ref 3: Abstract Color Theory`
    ];

    setStudioState(prev => ({
      ...prev,
      researchResults: mockResults,
      streamingThought: prev.streamingThought + `\n✦ Muse Found relevant references. Synthesizing...`
    }));

    return mockResults;
  };

  const triggerInspiration = useCallback(async () => {
    soundService.playPing();

    // Agentic Step 1: Research for trends
    const researchResults = await performComputerUse("Trending Digital Art");
    await new Promise(r => setTimeout(r, 1000));

    setStudioState(prev => ({
      ...prev,
      isLoading: true,
      currentStage: 'thinking',
      uiMode: 'generation',
      feedbackMessage: "Flash Speed: Dreaming..."
    }));

    try {
      const text = await generateInspiration(researchResults);
      soundService.playPing();
      setStudioState(prev => ({
        ...prev,
        prompt: text,
        isLoading: false,
        currentStage: 'complete',
        uiMode: 'detection',
        feedbackMessage: "Idea Injected"
      }));
    } catch (e: any) {
      setStudioState(prev => ({
        ...prev,
        isLoading: false,
        currentStage: 'idle',
        uiMode: 'detection',
        feedbackMessage: "Inspiration Failed",
        prompt: `Error: ${e.message}`
      }));
    }
  }, []);

  const triggerImageGeneration = useCallback(async (overridePrompt?: string, overrideStyle?: string) => {
    // Read from ref to get the latest state — avoids stale closures and async timing issues
    const latestState = studioStateRef.current;
    const currentPrompt = overridePrompt || latestState.prompt;
    const currentStyle = overrideStyle || latestState.styleModifier;

    if (!currentPrompt) {
      setStudioState(prev => ({ ...prev, feedbackMessage: 'Please describe your vision first' }));
      return;
    }

    // Save to history before starting generation
    setStudioState(prev => {
      const stateForHistory = { ...prev, prompt: currentPrompt, styleModifier: currentStyle };
      saveToHistory(stateForHistory, historyIndex);
      return prev;
    });

    soundService.playCharging(1);

    // Initial State
    setStudioState(prev => ({
      ...prev,
      prompt: currentPrompt!, // Ensure state reflects the prompt being used
      styleModifier: currentStyle!, // Ensure state reflects the style being used
      isLoading: true,
      generatedVideo: null,
      uiMode: 'generation',
      currentStage: 'thinking',
      streamingThought: '',
      generationProgress: 0,
      researchResults: [], // Clear previous research
      thoughtLog: "Initializing Creative Reasoning Circuits...",
      feedbackMessage: "MUSE is Thinking..."
    }));

    soundService.startAmbient('thinking');

    // Cancel any previous in-flight generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const progressInterval = setInterval(() => {
      setStudioState(prev => ({
        ...prev,
        generationProgress: Math.min(prev.generationProgress + Math.random() * 3, 90)
      }));
    }, 200);
    activeIntervalsRef.current.add(progressInterval);

    try {
      // Check if aborted before proceeding
      if (controller.signal.aborted) { soundService.stopAmbient(); return; }

      // 1. REFINE & RESEARCH DECISION

      // "Agentic" Check: Does this prompt need research?
      // Simple heuristic: If prompt is short/vague, or contains keywords like "style of", "like", "reference"
      const needsResearch = currentPrompt.toLowerCase().includes('style') || currentPrompt.length < 20;

      if (needsResearch) {
        await performComputerUse(currentPrompt);
        // Wait a bit to show the research phase
        await new Promise(r => setTimeout(r, 1000));
        if (controller.signal.aborted) { soundService.stopAmbient(); return; }
      }

      // --- CHAMPIONSHIP FEATURES INTEGRATION ---
      let effectivePrompt = currentPrompt;

      // 1. Memory Injection
      if (config?.enableMemory && historyRef.current.length > 0) {
        const recentHistory = historyRef.current.slice(-3).map(h => `[Past Request]: ${h.prompt} -> [Style]: ${h.style}`).join('\n');
        effectivePrompt = `Context from previous interactions:\n${recentHistory}\n\nCurrent Request: ${effectivePrompt}`;
      }

      // 2. Persona/Custom Instructions Injection
      if (config?.customInstructions) {
        effectivePrompt = `[System Directive / Persona]: ${config.customInstructions}\n\n${effectivePrompt}`;
      }

      // 3. Guest quality reduction: skip HD enhancement, use simpler output
      if (config?.isGuest) {
        effectivePrompt = `${effectivePrompt}\n[Output Quality: Standard resolution, simple composition]`;
      }
      // -----------------------------------------

      const agentResponse = await refinePromptWithThoughts(
        effectivePrompt,
        currentStyle!,
        (chunk: string, isComplete: boolean) => {
          if (controller.signal.aborted) return;
          setStudioState(prev => ({
            ...prev,
            streamingThought: chunk,
            thoughtLog: isComplete ? chunk : prev.thoughtLog
          }));
        }
      );

      if (controller.signal.aborted) { soundService.stopAmbient(); return; }

      // 2. PAINTING (Generation)
      setStudioState(prev => ({
        ...prev,
        currentStage: 'painting',
        thoughtLog: agentResponse.thought,
        feedbackMessage: "Gemini: Painting..."
      }));

      soundService.startAmbient('painting');

      const result = await generateMagicImage(agentResponse.refinedPrompt);

      clearInterval(progressInterval);
      activeIntervalsRef.current.delete(progressInterval);

      if (controller.signal.aborted) { soundService.stopAmbient(); return; }

      if (result && result.data) {
        soundService.stopAmbient();
        soundService.playSuccess();
        setStudioState(prev => ({
          ...prev,
          generatedImage: result.data,
          providerInfo: result.source,
          isLoading: false,
          generationProgress: 100,
          currentStage: 'complete',
          uiMode: 'complete',
          feedbackMessage: "Masterpiece Ready"
        }));
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      activeIntervalsRef.current.delete(progressInterval);
      soundService.stopAmbient();
      if (controller.signal.aborted) return; // Don't update state if aborted
      const isOverloaded = err.message?.includes('503') || err.message?.includes('overloaded') || err.message?.includes('UNAVAILABLE');
      setStudioState(prev => ({
        ...prev,
        isLoading: false,
        currentStage: 'idle',
        uiMode: 'detection',
        feedbackMessage: isOverloaded
          ? "Server busy — please try again in a moment"
          : `Generation Failed: ${err.message}`
      }));
    }
  }, [saveToHistory, historyIndex, config?.enableMemory, config?.customInstructions, config?.isGuest]);

  const triggerVideoGeneration = useCallback(async () => {
    // Read from ref to avoid stale closure
    const currentImage = studioStateRef.current.generatedImage;
    const currentPrompt = studioStateRef.current.prompt;
    
    if (!currentImage) return;

    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      try {
        const hasKey = await aiStudio.hasSelectedApiKey();
        if (!hasKey) {
          setFeedback("Please select a paid API Key for Muse Video...");
          await aiStudio.openSelectKey();
        }
      } catch (e) {
        console.warn("AI Studio Key Check Error:", e);
      }
    }

    soundService.playStartRecord();
    setStudioState(prev => ({
      ...prev,
      isLoading: true,
      currentStage: 'directing',
      uiMode: 'generation',
      generationProgress: 0,
      streamingThought: 'Analyzing frame composition... Calculating motion vectors... Applying temporal coherence...',
      feedbackMessage: "Muse Video: Directing..."
    }));

    soundService.startAmbient('directing');

    const progressInterval = setInterval(() => {
      setStudioState(prev => ({
        ...prev,
        generationProgress: Math.min(prev.generationProgress + Math.random() * 2, 85)
      }));
    }, 500);
    activeIntervalsRef.current.add(progressInterval);

    try {
      const videoUrl = await generateVideoFromImage(currentImage, currentPrompt);

      clearInterval(progressInterval);
      activeIntervalsRef.current.delete(progressInterval);
      soundService.stopAmbient();
      soundService.playSuccess();

      setStudioState(prev => ({
        ...prev,
        generatedVideo: videoUrl,
        isLoading: false,
        generationProgress: 100,
        currentStage: 'complete',
        uiMode: 'complete',
        feedbackMessage: "Scene Animated"
      }));
    } catch (err: any) {
      clearInterval(progressInterval);
      activeIntervalsRef.current.delete(progressInterval);
      soundService.stopAmbient();
      // Detailed error handling same as before...
      let errorMsg = err.message || "Unknown Error";
      if (errorMsg.includes("Requested entity was not found")) {
        errorMsg = "Invalid API Key. Please re-select.";
      }

      setStudioState(prev => ({
        ...prev,
        isLoading: false,
        currentStage: 'idle',
        uiMode: 'detection',
        feedbackMessage: "Video Failed",
        prompt: `Error: ${errorMsg}`
      }));
    }
  }, [setFeedback]);

  const setStyle = useCallback((style: string, feedback: string) => {
    soundService.playPing();
    setStudioState(prev => ({
      ...prev,
      styleModifier: style,
      feedbackMessage: feedback
    }));
  }, []);

  const closeImage = useCallback(() => {
    setStudioState(prev => ({
      ...prev,
      generatedImage: null,
      generatedVideo: null,
      thoughtLog: null,
      streamingThought: '',
      uiMode: 'detection',
      currentStage: 'idle',
      generationProgress: 0,
      researchResults: []
    }));
  }, []);

  const runDiagnostics = useCallback(async () => {
    setStudioState(prev => ({ ...prev, feedbackMessage: "Running Gemini Diagnostics...", isLoading: true }));
    try {
      const logs = await runApiDiagnostics();
      setStudioState(prev => ({
        ...prev,
        isLoading: false,
        feedbackMessage: "Diagnostics Complete",
        prompt: logs.join('\n')
      }));
    } catch (e: any) {
      setStudioState(prev => ({ ...prev, isLoading: false, feedbackMessage: "Diagnostics Error" }));
    }
  }, []);

  // Get history list for modal display
  const getHistoryList = useCallback(() => {
    return historyRef.current.map(entry => ({
      id: entry.id,
      prompt: entry.prompt,
      style: entry.style,
      image: entry.image,
      timestamp: entry.timestamp
    }));
  }, []);

  // Jump to specific history index
  const goToHistoryIndex = useCallback((index: number) => {
    if (index >= 0 && index < historyRef.current.length) {
      const entry = historyRef.current[index];
      soundService.playClick();
      setHistoryIndex(index);
      setStudioState(prev => ({
        ...prev,
        prompt: entry.prompt,
        styleModifier: entry.style,
        generatedImage: entry.image,
        thoughtLog: entry.thought,
        researchResults: entry.researchResults || [],
        feedbackMessage: `Loaded: "${entry.prompt.substring(0, 25)}..."`
      }));
    }
  }, []);

  const triggerSocialShareFn = useCallback(async (emotion: string) => {
    const currentImage = studioStateRef.current.generatedImage;
    const currentPrompt = studioStateRef.current.prompt;
    if (!currentImage) return;
    setStudioState(prev => ({ ...prev, isSharing: true, feedbackMessage: 'Muse: Crafting viral post...' }));

    try {
      const copy = await generateSocialCopy(
        currentImage,
        currentPrompt,
        emotion
      );

      setStudioState(prev => ({
        ...prev,
        socialCopy: copy,
        isSharing: false,
        feedbackMessage: 'Ready to share!'
      }));

      soundService.playSuccess();

      if (navigator.share) {
        await navigator.share({
          title: copy.title,
          text: `${copy.title}\n\n${copy.text}\n\n${copy.hashtags.join(' ')}`,
        });
      }
    } catch (e) {
      console.error("Share failed", e);
      setStudioState(prev => ({ ...prev, isSharing: false, feedbackMessage: 'Muse: Share busy' }));
    }
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setHistoryIndex(-1);
    setStudioState(prev => ({
      ...prev,
      feedbackMessage: "History cleared"
    }));
  }, []);

  return {
    ...studioState,
    updatePrompt,
    setFeedback,
    triggerInspiration,
    triggerImageGeneration,
    triggerVideoGeneration,
    setStyle,
    closeImage,
    runDiagnostics,
    goBackInHistory,
    goForwardInHistory,
    historyLength: historyRef.current.length,
    historyIndex,  // Now using state variable for proper re-renders
    // NEW: For history modal
    getHistoryList,
    goToHistoryIndex,
    clearHistory,
    triggerSocialShare: triggerSocialShareFn,
    socialCopy: studioState.socialCopy,
    isSharing: studioState.isSharing
  };
};
