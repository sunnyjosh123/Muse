
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { detectGesture, detectFaceExpression, FaceExpression } from '../services/gestureLogic';
import { analyzeImageWithCloudVision, VisionAnalysisResult, getLikelihoodColor } from '../services/googleCloudService';
import { GestureType, FaceData, Landmark } from '../types';
import { Camera, RefreshCw, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { soundService } from '../services/soundService';

// MediaPipe is loaded via script tag in index.html, accessed via window.Holistic
// No ES module imports needed since the package uses UMD format

// --- Expression Logic ---
const calculateExpression = (landmarks: any[]) => {
    if (!landmarks || landmarks.length === 0) return 'NEUTRAL';

    // MediaPipe FaceMesh keypoints
    // 13: upper lip, 14: lower lip, 61: left corner, 291: right corner
    // Y axis increases downwards

    const lipTop = landmarks[13].y;
    const leftCorner = landmarks[61].y;
    const rightCorner = landmarks[291].y;
    const upperLipTop = landmarks[11].y;
    const lowerLipBottom = landmarks[16].y;

    const mouthWidth = Math.hypot(landmarks[291].x - landmarks[61].x, landmarks[291].y - landmarks[61].y);
    const fullMouthHeight = lowerLipBottom - upperLipTop;

    // Open Mouth (Surprise)
    if (fullMouthHeight > mouthWidth * 0.5) return 'SURPRISE';

    // Smile (Corners above lip top)
    const avgCornerY = (leftCorner + rightCorner) / 2;
    if (avgCornerY < lipTop - 0.01) return 'SMILE';

    return 'NEUTRAL';
};

interface GenParticle {
    x: number; y: number; vx: number; vy: number; size: number; alpha: number; hue: number;
}

interface MagicCanvasProps {
    onGestureDetected: (gesture: GestureType) => void;
    onGestureChanged?: (gesture: GestureType) => void;
    onFaceDataDetected?: (data: FaceData) => void;
    onAmbientLightDetected?: (level: number) => void;
    onTrackingStats?: (stats: { hand: number; face: number }) => void;
    onDialTurn?: (direction: 'cw' | 'ccw') => void;
    onDialAdjust?: (delta: number) => void;
    onRuneCast?: (rune: 'circle' | 'triangle') => void;
    currentGesture?: GestureType;
    onError?: (error: string | null) => void;
    isCameraActive?: boolean;
    enableCloudVision?: boolean;
    videoRef?: React.RefObject<HTMLVideoElement>;
    generationStage?: 'idle' | 'thinking' | 'researching' | 'painting' | 'directing' | 'complete';
}

const TRIGGER_DURATION = 700;
const PERSISTENCE_THRESHOLD = 3;
// Reduced interval for better responsiveness, but kept safe enough
const CLOUD_ANALYSIS_INTERVAL = 6000;
// Backoff time if an error occurs
const ERROR_BACKOFF = 15000;
// Cap particle count to prevent memory growth during extended sessions
const MAX_PARTICLES = 200;

class Particle {
    x: number; y: number; vx: number; vy: number; life: number; decay: number; color: string; size: number; type: 'trail' | 'spark' | 'energy' | 'confetti';
    constructor(x: number, y: number, color: string, type: 'trail' | 'spark' | 'energy' | 'confetti') {
        this.x = x; this.y = y; this.color = color; this.type = type; this.life = 1.0;
        if (type === 'spark') {
            const angle = Math.random() * Math.PI * 2; const speed = Math.random() * 12 + 2;
            this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
            this.decay = Math.random() * 0.03 + 0.01; this.size = Math.random() * 6 + 2;
        } else if (type === 'energy') {
            this.vx = (Math.random() - 0.5) * 2; this.vy = (Math.random() - 0.5) * 2; this.decay = 0.05; this.size = Math.random() * 3 + 1;
        } else if (type === 'confetti') {
            this.vx = (Math.random() - 0.5) * 15;
            this.vy = (Math.random() - 0.5) * 15 - 5;
            this.decay = Math.random() * 0.01 + 0.005;
            this.size = Math.random() * 6 + 3;
        } else {
            this.vx = (Math.random() - 0.5) * 1.5; this.vy = (Math.random() - 0.5) * 1.5 - 1;
            this.decay = Math.random() * 0.05 + 0.02; this.size = Math.random() * 8 + 2;
        }
    }
    update(frameTime: number) {
        this.x += this.vx; this.y += this.vy; this.life -= this.decay;
        if (this.type === 'spark') { this.vx *= 0.92; this.vy *= 0.92; this.vy += 0.2; }
        else if (this.type === 'trail') { this.size *= 0.9; }
        else if (this.type === 'confetti') {
            this.vy += 0.3; // Gravity
            this.vx *= 0.95;
            this.x += Math.sin(frameTime / 50) * 1; // Flutter effect
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        if (this.type === 'confetti') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.life * 10);
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            ctx.restore();
        } else {
            ctx.globalCompositeOperation = 'lighter';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

const MagicCanvas: React.FC<MagicCanvasProps> = ({
    onGestureDetected,
    onGestureChanged,
    onFaceDataDetected,
    onAmbientLightDetected,
    onTrackingStats,
    onDialTurn,
    onDialAdjust,
    onRuneCast,
    currentGesture,
    onError,
    isCameraActive = true,
    enableCloudVision = true,
    videoRef: propVideoRef,
    generationStage = 'idle'
}) => {
    const internalVideoRef = useRef<HTMLVideoElement>(null);
    const videoRef = propVideoRef || internalVideoRef;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>(0);
    const [isVisionReady, setIsVisionReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    // Although we removed the UI, we keep the logic state in case needed for login screen background later
    const [cloudStatus, setCloudStatus] = useState<'IDLE' | 'ANALYZING' | 'ACTIVE' | 'ERROR'>('IDLE');

    const [visionStats, setVisionStats] = useState<VisionAnalysisResult | null>(null);

    const pendingGestureRef = useRef<GestureType>(GestureType.NONE);
    const gestureStartTimeRef = useRef<number>(0);
    const progressRef = useRef<number>(0);
    const hasTriggeredChargeSound = useRef<boolean>(false);
    const persistenceRef = useRef<{ gesture: GestureType, count: number }>({ gesture: GestureType.NONE, count: 0 });
    const smoothedGestureRef = useRef<GestureType>(GestureType.NONE);
    const lastCloudCallTimeRef = useRef<number>(0);
    const cloudAnalysisResultRef = useRef<VisionAnalysisResult | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const resultsRef = useRef<any>(null);
    const onGestureDetectedRef = useRef(onGestureDetected);
    const onGestureChangedRef = useRef(onGestureChanged);
    const onFaceDataDetectedRef = useRef(onFaceDataDetected);
    const onAmbientLightDetectedRef = useRef(onAmbientLightDetected);
    const onTrackingStatsRef = useRef(onTrackingStats);
    const onDialTurnRef = useRef(onDialTurn);
    const onDialAdjustRef = useRef(onDialAdjust);
    const onRuneCastRef = useRef(onRuneCast);
    const onErrorRef = useRef(onError);
    const holisticRef = useRef<any>(null);
    const activeRef = useRef<boolean>(false);
    const cleanupTimeoutRef = useRef<(() => void) | null>(null);

    // New refs for performance throttling
    const lastSnapshotTimeRef = useRef<number>(0);
    const snapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const lastAmbientSampleRef = useRef<number>(0);
    const lastAmbientLevelRef = useRef<number>(1);
    const lastTrackingStatsRef = useRef<number>(0);
    const dialAngleRef = useRef<number | null>(null);
    const dialAccumRef = useRef<number>(0);
    const lastDialTriggerRef = useRef<number>(0);
    const lastDialAdjustRef = useRef<number>(0);
    const runePointsRef = useRef<Landmark[]>([]);
    const runeGestureActiveRef = useRef<boolean>(false);
    const lastRuneSampleRef = useRef<number>(0);
    const cloudCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const faceLostCountRef = useRef<number>(0);
    const FACE_LOST_DEBOUNCE = 5; // Emit face-lost after 5 consecutive no-face frames

    // --- Generation AR Effect State ---
    const genParticlesRef = useRef<GenParticle[]>([]);
    const generationStageRef = useRef(generationStage);
    const genParticlesInitRef = useRef(false);

    useEffect(() => {
        generationStageRef.current = generationStage;
        // Reset particles when returning to idle or complete
        if (generationStage === 'idle' || generationStage === 'complete') {
            genParticlesRef.current = [];
            genParticlesInitRef.current = false;
        }
    }, [generationStage]);

    useEffect(() => {
        onGestureDetectedRef.current = onGestureDetected;
        onGestureChangedRef.current = onGestureChanged;
        onFaceDataDetectedRef.current = onFaceDataDetected;
        onAmbientLightDetectedRef.current = onAmbientLightDetected;
        onTrackingStatsRef.current = onTrackingStats;
        onDialTurnRef.current = onDialTurn;
        onDialAdjustRef.current = onDialAdjust;
        onRuneCastRef.current = onRuneCast;
        onErrorRef.current = onError;
    }, [onGestureDetected, onGestureChanged, onFaceDataDetected, onAmbientLightDetected, onTrackingStats, onDialTurn, onDialAdjust, onRuneCast, onError]);

    const detectRune = (points: Landmark[]) => {
        if (!points || points.length < 10) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let length = 0;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
            if (i > 0) {
                const prev = points[i - 1];
                length += Math.hypot(p.x - prev.x, p.y - prev.y);
            }
        }
        const width = maxX - minX;
        const height = maxY - minY;
        const diag = Math.hypot(width, height);
        if (diag === 0) return null;
        const start = points[0];
        const end = points[points.length - 1];
        const closeDist = Math.hypot(start.x - end.x, start.y - end.y);
        const aspect = width / height;
        if (closeDist < diag * 0.2 && aspect > 0.7 && aspect < 1.3 && length > diag * 3) {
            return 'circle';
        }
        let turns = 0;
        for (let i = 2; i < points.length; i++) {
            const a = points[i - 2];
            const b = points[i - 1];
            const c = points[i];
            const abx = b.x - a.x;
            const aby = b.y - a.y;
            const bcx = c.x - b.x;
            const bcy = c.y - b.y;
            const dot = abx * bcx + aby * bcy;
            const mag = Math.hypot(abx, aby) * Math.hypot(bcx, bcy);
            if (mag > 0) {
                const angle = Math.acos(Math.max(-1, Math.min(1, dot / mag)));
                if (angle > 1.1) turns++;
            }
        }
        if (turns >= 2 && length > diag * 2.2) {
            return 'triangle';
        }
        return null;
    };

    const getGestureColor = (gesture: GestureType) => {
        switch (gesture) {
            case GestureType.FIST: return '#ef4444';
            case GestureType.OPEN_PALM: return '#facc15';
            case GestureType.OK: return '#3b82f6';
            case GestureType.ROCK: return '#f97316';
            case GestureType.LOVE: return '#ec4899';
            case GestureType.VICTORY: return '#a855f7';
            case GestureType.SHAKA: return '#14b8a6'; // Teal for Fun
            default: return '#10b981';
        }
    };

    // Use ref for enableCloudVision to avoid stale closure in loadMediaPipe/handleCloudAnalysis
    const enableCloudVisionRef = useRef(enableCloudVision);
    useEffect(() => { enableCloudVisionRef.current = enableCloudVision; }, [enableCloudVision]);

    const handleCloudAnalysis = async (videoElement: HTMLVideoElement, landmarks: any[]) => {
        // Feature Flag: Skip Cloud Analysis if disabled (e.g. when logged in)
        if (!enableCloudVisionRef.current) return;

        const now = Date.now();
        if (now - lastCloudCallTimeRef.current < CLOUD_ANALYSIS_INTERVAL) return;

        // Speculatively set timestamp to prevent rapid re-entry
        lastCloudCallTimeRef.current = now;

        setCloudStatus('ANALYZING');
        try {
            // Reuse canvas to avoid creating a new DOM element every call
            const scale = 320 / videoElement.videoWidth;
            const h = Math.round(videoElement.videoHeight * scale);

            if (!cloudCanvasRef.current) {
                cloudCanvasRef.current = document.createElement('canvas');
            }
            const tempCanvas = cloudCanvasRef.current;
            // Only resize if dimensions changed (e.g. camera switched)
            if (tempCanvas.width !== 320 || tempCanvas.height !== h) {
                tempCanvas.width = 320;
                tempCanvas.height = h;
            }

            const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            // Draw image preserving aspect ratio
            ctx.drawImage(videoElement, 0, 0, 320, h);

            const base64 = tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            const result = await analyzeImageWithCloudVision(base64);
            if (result) {
                cloudAnalysisResultRef.current = result;
                setVisionStats(result); // Update React State for HTML rendering
                setCloudStatus('ACTIVE');
            } else {
                setCloudStatus('ERROR');
                // Apply backoff penalty if error occurred (e.g. 429)
                lastCloudCallTimeRef.current = Date.now() + ERROR_BACKOFF;
            }
        } catch (e) {
            setCloudStatus('ERROR');
            lastCloudCallTimeRef.current = Date.now() + ERROR_BACKOFF;
        }
    };

    const loadMediaPipe = useCallback(async () => {
        console.log('[MagicCanvas] Starting camera initialization...');
        setCameraError(null);
        if (onErrorRef.current) onErrorRef.current(null);

        // Cancel any existing animation loop to prevent duplicates
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = 0;
        }

        activeRef.current = true;
        let stream: MediaStream | null = null;

        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const msg = "CAMERA API NOT AVAILABLE - Please use HTTPS or localhost";
            console.error('[MagicCanvas]', msg);
            activeRef.current = false;
            setCameraError(msg);
            if (onErrorRef.current) onErrorRef.current(msg);
            return;
        }

        try {
            console.log('[MagicCanvas] Requesting camera permission with ideal settings...');
            stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } });
            console.log('[MagicCanvas] Camera access granted with ideal settings');
        } catch (e: any) {
            console.warn('[MagicCanvas] Failed with ideal settings, trying basic video...', e.name, e.message);
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                console.log('[MagicCanvas] Camera access granted with basic settings');
            } catch (err: any) {
                let msg = "CAMERA CONNECTION ERROR";
                console.error('[MagicCanvas] Camera permission failed:', err.name, err.message);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    msg = "PERMISSION DENIED - Please allow camera access and refresh the page";
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    msg = "NO CAMERA FOUND - Please connect a camera device";
                } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                    msg = "CAMERA IN USE - Please close other apps using the camera";
                } else if (err.name === 'OverconstrainedError') {
                    msg = "CAMERA NOT COMPATIBLE - Trying fallback...";
                }
                activeRef.current = false; // Reset state so retry can work
                if (activeRef.current === false) { setCameraError(msg); if (onErrorRef.current) onErrorRef.current(msg); }
                return;
            }
        }
        if (!activeRef.current) { stream?.getTracks().forEach(t => t.stop()); return; }
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await new Promise((resolve) => { if (videoRef.current) { videoRef.current.onloadedmetadata = () => { videoRef.current!.play().then(resolve).catch(resolve); }; } });
        }

        // Initialize MediaPipe Holistic from local script (loaded in index.html)
        let initRetryCount = 0;
        const MAX_INIT_RETRIES = 50; // Max ~5 seconds of waiting
        const initHolistic = async () => {
            // @ts-ignore - Holistic is loaded globally via script tag
            if (!window.Holistic) {
                initRetryCount++;
                if (initRetryCount > MAX_INIT_RETRIES) {
                    console.error('[MagicCanvas] MediaPipe Holistic failed to load after max retries');
                    setCameraError('MediaPipe failed to load. Please refresh the page.');
                    return;
                }
                // Wait for script to load; guard against firing after unmount
                if (activeRef.current) {
                    const timerId = setTimeout(initHolistic, 100);
                    const oldCleanup = cleanupTimeoutRef.current;
                    cleanupTimeoutRef.current = () => { clearTimeout(timerId); oldCleanup?.(); };
                }
                return;
            }

            if (!holisticRef.current && activeRef.current) {
                // @ts-ignore
                const holistic = new window.Holistic({
                    locateFile: (file: string) => {
                        // Files are served from public/mediapipe/holistic/
                        return `/mediapipe/holistic/${file}`;
                    }
                });
                holistic.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                holistic.onResults((results: any) => {
                    if (!activeRef.current) return;
                    resultsRef.current = results;
                    setIsVisionReady(true);

                    if (results.faceLandmarks && videoRef.current) {
                        handleCloudAnalysis(videoRef.current, results.faceLandmarks);

                        // Performance Optimization: Throttle Snapshot Updates to ~10fps (100ms)
                        // This prevents the main thread from choking on base64 generation during the login screen loop
                        const now = Date.now();
                        if (onFaceDataDetectedRef.current && (now - lastSnapshotTimeRef.current > 100)) {
                            lastSnapshotTimeRef.current = now;

                            // Reuse canvas to reduce garbage collection
                            if (!snapshotCanvasRef.current) {
                                snapshotCanvasRef.current = document.createElement('canvas');
                                snapshotCanvasRef.current.width = 200;
                                snapshotCanvasRef.current.height = 200;
                            }

                            const ctx = snapshotCanvasRef.current.getContext('2d', { willReadFrequently: true });
                            if (ctx) {
                                ctx.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight, 0, 0, 200, 200);
                                const expr = calculateExpression(results.faceLandmarks);
                                const emotion = expr === 'SMILE' || expr === 'SURPRISE' ? 'Joy' : 'Calm';
                                onFaceDataDetectedRef.current({
                                    landmarks: results.faceLandmarks,
                                    detected: true,
                                    snapshot: snapshotCanvasRef.current.toDataURL('image/jpeg', 0.7),
                                    expression: expr,
                                    emotion: emotion
                                });
                            }
                        }
                    faceLostCountRef.current = 0; // Reset face-lost counter when face is detected
                    } else if (onFaceDataDetectedRef.current) {
                        // Deterministic debounce: only emit face-lost after N consecutive no-face frames
                        faceLostCountRef.current++;
                        if (faceLostCountRef.current === FACE_LOST_DEBOUNCE) {
                            onFaceDataDetectedRef.current({ landmarks: [], detected: false });
                        }
                    }
                    drawResults(results);
                });
                await holistic.initialize();
                holisticRef.current = holistic;
            }
        };

        initHolistic();

        const tick = async () => {
            if (!activeRef.current) return;

            // Robustness: Ensure video is playing if active
            if (videoRef.current && videoRef.current.paused && !videoRef.current.ended) {
                try { await videoRef.current.play(); } catch (e) { }
            }

            if (videoRef.current && videoRef.current.readyState >= 2 && holisticRef.current) {
                try { await holisticRef.current.send({ image: videoRef.current }); } catch (e) { }
            }
            requestRef.current = requestAnimationFrame(tick);
        };
        tick();
    }, []);

    useEffect(() => {
        console.log('[MagicCanvas] useEffect triggered - isCameraActive:', isCameraActive, 'activeRef:', activeRef.current);
        if (isCameraActive) {
            // Always try to initialize if not already active
            // This ensures camera permission is requested on mount
            if (!activeRef.current) {
                console.log('[MagicCanvas] Initializing camera...');
                loadMediaPipe();
            } else {
                console.log('[MagicCanvas] Camera already active, skipping init');
            }
        } else {
            // Stop Camera Logic
            activeRef.current = false;
            setCameraError(null);
            if (onErrorRef.current) onErrorRef.current(null);

            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }

            // Clear Canvas and Draw Placeholder
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    ctx.fillStyle = '#0a0a0a';
                    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                    // Draw Camera Off UI
                    ctx.save();
                    ctx.translate(canvasRef.current.width, 0);
                    ctx.scale(-1, 1); // Flip back since main canvas is flipped
                    ctx.fillStyle = '#222';
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 32px monospace';
                    ctx.fillText("CAMERA OFFLINE", canvasRef.current.width / 2, canvasRef.current.height / 2);
                    ctx.fillStyle = '#444';
                    ctx.font = '16px monospace';
                    ctx.fillText("GESTURE SENSORS DISABLED", canvasRef.current.width / 2, canvasRef.current.height / 2 + 30);
                    ctx.restore();
                }
            }

            setCloudStatus('IDLE');
            setVisionStats(null);
            if (onFaceDataDetectedRef.current) {
                onFaceDataDetectedRef.current({ landmarks: [], detected: false });
            }
        }

        return () => {
            activeRef.current = false;
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
                requestRef.current = 0;
            }
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
            // Cancel any pending initHolistic setTimeout
            if (cleanupTimeoutRef.current) {
                cleanupTimeoutRef.current();
                cleanupTimeoutRef.current = null;
            }
            // Close MediaPipe Holistic to release WASM/WebGL resources
            if (holisticRef.current) {
                try { holisticRef.current.close(); } catch (_) {}
                holisticRef.current = null;
            }
            // Clean up temporary canvases
            ambientCanvasRef.current = null;
            snapshotCanvasRef.current = null;
            cloudCanvasRef.current = null;
            // Clear particles to free memory
            particlesRef.current = [];
            // Clear results reference
            resultsRef.current = null;
        };
    }, [isCameraActive, loadMediaPipe]);

    // --- SIMPLIFIED AR Drawing Logic ---
    // Reusable point objects to avoid per-frame allocations in drawFaceAR
    const _facePoints = {
        leftEye: { x: 0, y: 0 }, rightEye: { x: 0, y: 0 }, nose: { x: 0, y: 0 },
        forehead: { x: 0, y: 0 }, cheekRight: { x: 0, y: 0 }, mouthLeft: { x: 0, y: 0 }, mouthRight: { x: 0, y: 0 }
    };

    const drawFaceAR = (ctx: CanvasRenderingContext2D, landmarks: Landmark[], mapX: (x: number) => number, mapY: (y: number) => number) => {
        // Validate minimum landmarks before accessing hardcoded indices
        if (!landmarks || landmarks.length < 300) return;
        const expression = detectFaceExpression(landmarks);

        const primary = '#00f3ff'; // Cyan
        const alert = '#ff003c';   // Red
        const happy = '#ffe600';   // Yellow/Gold

        // Inline landmark mapping into pre-allocated objects (avoids GC churn)
        _facePoints.leftEye.x = mapX(landmarks[33].x); _facePoints.leftEye.y = mapY(landmarks[33].y);
        _facePoints.rightEye.x = mapX(landmarks[263].x); _facePoints.rightEye.y = mapY(landmarks[263].y);
        _facePoints.nose.x = mapX(landmarks[1].x); _facePoints.nose.y = mapY(landmarks[1].y);
        _facePoints.forehead.x = mapX(landmarks[10].x); _facePoints.forehead.y = mapY(landmarks[10].y);
        _facePoints.cheekRight.x = mapX(landmarks[234].x); _facePoints.cheekRight.y = mapY(landmarks[234].y);
        _facePoints.mouthLeft.x = mapX(landmarks[61].x); _facePoints.mouthLeft.y = mapY(landmarks[61].y);
        _facePoints.mouthRight.x = mapX(landmarks[291].x); _facePoints.mouthRight.y = mapY(landmarks[291].y);

        const { leftEye, rightEye, nose, forehead, cheekRight, mouthLeft, mouthRight } = _facePoints;

        ctx.save();
        ctx.lineWidth = 1.5;

        // Select Color based on Expression
        let color = primary;
        if (expression === FaceExpression.SMILE) color = happy;
        if (expression === FaceExpression.SURPRISE) color = alert;

        ctx.strokeStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;

        // 1. Minimal Eye Reticles (Both Eyes)
        // Compute time once outside loop
        const time = Date.now() / 1000;
        const offset = 15 + Math.sin(time * 2) * 2;

        [leftEye, rightEye].forEach(eye => {
            ctx.beginPath();
            ctx.arc(eye.x, eye.y, 20, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(eye.x - offset, eye.y - offset);
            ctx.lineTo(eye.x - offset - 5, eye.y - offset);
            ctx.lineTo(eye.x - offset, eye.y - offset - 5);
            ctx.moveTo(eye.x + offset, eye.y + offset);
            ctx.lineTo(eye.x + offset + 5, eye.y + offset);
            ctx.lineTo(eye.x + offset, eye.y + offset + 5);
            ctx.stroke();
        });

        // 2. Expression Label with Emoji (Clean, minimal)
        if (expression !== FaceExpression.NEUTRAL) {
            ctx.save();
            ctx.translate(forehead.x, forehead.y - 30);
            ctx.scale(-1, 1);
            ctx.textAlign = 'center';

            // Emoji Background
            ctx.font = '32px sans-serif';
            const emoji = expression === FaceExpression.SMILE ? '😊' :
                expression === FaceExpression.SURPRISE ? '😲' : '😐';

            // Draw Emoji
            ctx.fillText(emoji, 0, -10);

            // Draw Text Label
            ctx.font = 'bold 12px "Space Grotesk", monospace';
            ctx.fillStyle = color;
            ctx.fillText(expression, 0, 15);

            ctx.restore();
        }

        // 3. Vision HUD — moved to HTML overlay for proper z-index layering and non-overlapping layout

        // 4. Subtle Expression Effects
        if (expression === FaceExpression.SMILE && Math.random() > 0.7) {
            particlesRef.current.push(new Particle(mouthLeft.x, mouthLeft.y, happy, 'spark'));
        } else if (expression === FaceExpression.SURPRISE && Math.random() > 0.8) {
            const pColor = [primary, alert, happy][Math.floor(Math.random() * 3)];
            particlesRef.current.push(new Particle(nose.x, nose.y, pColor, 'confetti'));
        }

        ctx.restore();
    };

    // --- Generation AR Effects Drawing ---
    const drawGenerationEffects = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const stage = generationStageRef.current;
        if (stage === 'idle' || stage === 'complete') return;

        // Determine hue range by stage
        let hueMin: number, hueMax: number;
        if (stage === 'thinking' || stage === 'researching') { hueMin = 270; hueMax = 290; }
        else if (stage === 'painting') { hueMin = 180; hueMax = 220; }
        else { hueMin = 300; hueMax = 330; } // directing

        // Lazily initialize particles
        if (!genParticlesInitRef.current) {
            genParticlesInitRef.current = true;
            const particles: GenParticle[] = [];
            for (let i = 0; i < 18; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 1.2,
                    vy: (Math.random() - 0.5) * 1.2,
                    size: Math.random() * 3 + 1.5,
                    alpha: Math.random() * 0.5 + 0.3,
                    hue: hueMin + Math.random() * (hueMax - hueMin)
                });
            }
            genParticlesRef.current = particles;
        }

        ctx.save();

        const particles = genParticlesRef.current;

        // --- 1. Floating Constellation Effect ---
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            // Wrap around edges
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
            // Slowly drift hue within range
            p.hue = hueMin + ((p.hue - hueMin + 0.1) % (hueMax - hueMin));

            // Draw glowing circle
            ctx.globalAlpha = p.alpha;
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsl(${p.hue}, 80%, 60%)`;
            ctx.fillStyle = `hsl(${p.hue}, 80%, 60%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Connect nearby particles with faint lines
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = dx * dx + dy * dy; // squared distance for perf
                if (dist < 10000) { // 100px squared
                    ctx.globalAlpha = 0.1;
                    ctx.strokeStyle = `hsl(${particles[i].hue}, 70%, 50%)`;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        // --- 2. Pulsing Vignette Border ---
        ctx.globalCompositeOperation = 'source-over';
        const now = Date.now();
        const vignetteAlpha = Math.sin(now / 1000) * 0.1 + 0.15;
        const midHue = (hueMin + hueMax) / 2;
        const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.25, width / 2, height / 2, Math.max(width, height) * 0.7);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, `hsla(${midHue}, 70%, 30%, ${vignetteAlpha})`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // --- 3. Central Energy Ring (painting & directing only) ---
        if (stage === 'painting' || stage === 'directing') {
            const cx = width / 2;
            const cy = height / 2;
            const ringRadius = 80 + Math.sin(now / 500) * 10;
            const rotation = now / 2000;

            ctx.globalAlpha = 0.25;
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `hsl(${midHue}, 80%, 55%)`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 15]);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            ctx.setLineDash([]);
        }

        ctx.restore();
    };

    // Throttle draw to cap at ~30fps to reduce CPU usage
    const lastDrawTimeRef = useRef(0);
    const drawResults = (results: any) => {
        if (!canvasRef.current || !containerRef.current || !results.image) return;
        const now = Date.now();
        if (now - lastDrawTimeRef.current < 33) return; // ~30fps cap
        lastDrawTimeRef.current = now;
        const canvasCtx = canvasRef.current.getContext('2d');
        if (!canvasCtx) return;
        const width = containerRef.current.clientWidth; const height = containerRef.current.clientHeight;
        if (canvasRef.current.width !== width || canvasRef.current.height !== height) { canvasRef.current.width = width; canvasRef.current.height = height; }
        const imgAspect = results.image.width / results.image.height; const canvasAspect = width / height;
        let drawW, drawH, startX, startY;
        if (canvasAspect > imgAspect) { drawW = width; drawH = width / imgAspect; startX = 0; startY = (height - drawH) / 2; } else { drawH = height; drawW = height * imgAspect; startX = (width - drawW) / 2; startY = 0; }
        const uiScale = Math.max(width / 1280, 0.8); const mapX = (x: number) => startX + (x * drawW); const mapY = (y: number) => startY + (y * drawH);
        canvasCtx.save(); canvasCtx.clearRect(0, 0, width, height); canvasCtx.drawImage(results.image, startX, startY, drawW, drawH);
        canvasCtx.fillStyle = 'rgba(5, 5, 10, 0.6)'; canvasCtx.fillRect(0, 0, width, height);
        particlesRef.current = particlesRef.current.filter(p => p.life > 0);
        // Cap particles to prevent memory growth during extended sessions
        if (particlesRef.current.length > MAX_PARTICLES) {
            particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES);
        }
        const frameTime = Date.now();
        particlesRef.current.forEach(p => { p.update(frameTime); p.draw(canvasCtx); });
        // Reset composite operation after particle batch (particles use 'lighter')
        canvasCtx.globalCompositeOperation = 'source-over';
        canvasCtx.globalAlpha = 1.0;

        // --- DRAW AR FACE EFFECTS ---
        if (results.faceLandmarks) {
            drawFaceAR(canvasCtx, results.faceLandmarks, mapX, mapY);
        }

        const hands = []; if (results.rightHandLandmarks) hands.push(results.rightHandLandmarks); if (results.leftHandLandmarks) hands.push(results.leftHandLandmarks);
        if (onAmbientLightDetectedRef.current && now - lastAmbientSampleRef.current > 800) {
            lastAmbientSampleRef.current = now;
            if (!ambientCanvasRef.current) {
                ambientCanvasRef.current = document.createElement('canvas');
                ambientCanvasRef.current.width = 32;
                ambientCanvasRef.current.height = 32;
            }
            const aCtx = ambientCanvasRef.current.getContext('2d', { willReadFrequently: true });
            if (aCtx) {
                aCtx.drawImage(results.image, 0, 0, 32, 32);
                const data = aCtx.getImageData(0, 0, 32, 32).data;
                let sum = 0;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i] / 255;
                    const g = data[i + 1] / 255;
                    const b = data[i + 2] / 255;
                    sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
                }
                const level = sum / (data.length / 4);
                if (Math.abs(level - lastAmbientLevelRef.current) > 0.02) {
                    lastAmbientLevelRef.current = level;
                    onAmbientLightDetectedRef.current(level);
                }
            }
        }
        if (hands.length > 0) {
            const hLms = hands[0]; const rawGesture = detectGesture(hLms);
            if (rawGesture === persistenceRef.current.gesture) persistenceRef.current.count++; else persistenceRef.current = { gesture: rawGesture, count: 1 };
            if (persistenceRef.current.count >= PERSISTENCE_THRESHOLD) { if (smoothedGestureRef.current !== persistenceRef.current.gesture) { smoothedGestureRef.current = persistenceRef.current.gesture; if (smoothedGestureRef.current !== GestureType.NONE) soundService.playHover(); if (onGestureChangedRef.current) onGestureChangedRef.current(smoothedGestureRef.current); } }
            const activeColor = smoothedGestureRef.current !== GestureType.NONE ? getGestureColor(smoothedGestureRef.current) : '#4b5563';
            handleTriggerLogic(canvasCtx, smoothedGestureRef.current, hLms, mapX, mapY, uiScale, activeColor);
            if (onTrackingStatsRef.current && now - lastTrackingStatsRef.current > 400) {
                lastTrackingStatsRef.current = now;
                const handSignal = Math.min(persistenceRef.current.count / PERSISTENCE_THRESHOLD, 1);
                const faceSignal = results.faceLandmarks ? 1 : 0;
                onTrackingStatsRef.current({ hand: handSignal, face: faceSignal });
            }
            if (smoothedGestureRef.current === GestureType.DIAL) {
                const wrist = hLms[0];
                const indexTip = hLms[8];
                const angle = Math.atan2(indexTip.y - wrist.y, indexTip.x - wrist.x);
                if (dialAngleRef.current === null) {
                    dialAngleRef.current = angle;
                } else {
                    let delta = angle - dialAngleRef.current;
                    if (delta > Math.PI) delta -= Math.PI * 2;
                    if (delta < -Math.PI) delta += Math.PI * 2;
                    dialAngleRef.current = angle;
                    dialAccumRef.current += delta;
                    if (onDialAdjustRef.current && Math.abs(delta) > 0.02 && now - lastDialAdjustRef.current > 60) {
                        lastDialAdjustRef.current = now;
                        onDialAdjustRef.current(delta);
                    }
                    if (Math.abs(dialAccumRef.current) > 2.4 && now - lastDialTriggerRef.current > 700) {
                        const dir = dialAccumRef.current > 0 ? 'cw' : 'ccw';
                        lastDialTriggerRef.current = now;
                        dialAccumRef.current = 0;
                        if (onDialTurnRef.current) onDialTurnRef.current(dir);
                    }
                }
            } else {
                dialAngleRef.current = null;
                dialAccumRef.current = 0;
            }
            if (smoothedGestureRef.current === GestureType.POINTING) {
                if (!runeGestureActiveRef.current) {
                    runeGestureActiveRef.current = true;
                    runePointsRef.current = [];
                }
                if (now - lastRuneSampleRef.current > 50) {
                    lastRuneSampleRef.current = now;
                    runePointsRef.current.push({ x: hLms[8].x, y: hLms[8].y, z: hLms[8].z });
                    // Cap rune path length to prevent unbounded growth on long holds
                    if (runePointsRef.current.length > 500) {
                        runePointsRef.current = runePointsRef.current.slice(-400);
                    }
                }
            } else if (runeGestureActiveRef.current) {
                runeGestureActiveRef.current = false;
                const rune = detectRune(runePointsRef.current);
                runePointsRef.current = [];
                if (rune && onRuneCastRef.current) onRuneCastRef.current(rune);
            }
        } else {
            dialAngleRef.current = null;
            dialAccumRef.current = 0;
            if (runeGestureActiveRef.current) {
                runeGestureActiveRef.current = false;
                const rune = detectRune(runePointsRef.current);
                runePointsRef.current = [];
                if (rune && onRuneCastRef.current) onRuneCastRef.current(rune);
            }
            if (smoothedGestureRef.current !== GestureType.NONE) { smoothedGestureRef.current = GestureType.NONE; if (onGestureChangedRef.current) onGestureChangedRef.current(GestureType.NONE); }
            // Reset persistence and trigger state so stale counts don't carry over on re-detection
            persistenceRef.current = { gesture: GestureType.NONE, count: 0 };
            pendingGestureRef.current = GestureType.NONE;
            progressRef.current = 0;
        }
        canvasCtx.restore();

        // --- Draw Generation AR Effects (after main drawing is restored) ---
        drawGenerationEffects(canvasCtx, width, height);
    };

    const handleTriggerLogic = (ctx: CanvasRenderingContext2D, gesture: GestureType, landmarks: any, mapX: any, mapY: any, uiScale: number, color: string) => {
        const now = Date.now();
        if (gesture !== GestureType.NONE) {
            // Validate landmarks before accessing
            if (!landmarks || !landmarks[0]) { return; }
            if (gesture !== pendingGestureRef.current) { pendingGestureRef.current = gesture; gestureStartTimeRef.current = now; progressRef.current = 0; hasTriggeredChargeSound.current = false; } else {
                const elapsed = now - gestureStartTimeRef.current; const progress = Math.min(elapsed / TRIGGER_DURATION, 1);
                progressRef.current = progress; if (progress > 0.2 && !hasTriggeredChargeSound.current) { soundService.playCharging(1); hasTriggeredChargeSound.current = true; }
                const cx = mapX(landmarks[0].x); const cy = mapY(landmarks[0].y); const radius = 80 * uiScale;
                ctx.save();
                ctx.translate(cx, cy);

                // Background Ring
                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 4 * uiScale;
                ctx.stroke();

                // Progress Ring
                ctx.beginPath();
                ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
                ctx.strokeStyle = color;
                ctx.lineWidth = 8 * uiScale;
                ctx.lineCap = 'round';
                ctx.shadowBlur = 20;
                ctx.shadowColor = color;
                ctx.stroke();

                // Active Center Pulse
                if (progress > 0.1) {
                    ctx.beginPath();
                    ctx.arc(0, 0, radius * 0.15 + (Math.sin(now / 100) * 3), 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.4 + (progress * 0.4);
                    ctx.fill();
                }

                ctx.restore();
                if (progress >= 1) {
                    if (onGestureDetectedRef.current) onGestureDetectedRef.current(gesture);

                    // JUST FOR FUN MODE: Trigger Confetti!
                    if (gesture === GestureType.SHAKA) {
                        const handX = mapX(landmarks[0].x);
                        const handY = mapY(landmarks[0].y);
                        for (let i = 0; i < 60; i++) {
                            const pColor = ['#FF5722', '#03A9F4', '#FFEB3B', '#E91E63', '#4CAF50', '#9C27B0', '#FFFFFF'][Math.floor(Math.random() * 7)];
                            particlesRef.current.push(new Particle(handX, handY, pColor, 'confetti'));
                        }
                    }

                    // Reset ALL trigger state to prevent re-firing while holding the gesture
                    pendingGestureRef.current = GestureType.NONE;
                    progressRef.current = 0;
                    gestureStartTimeRef.current = now + 2000; // 2s cooldown before same gesture can re-charge
                    hasTriggeredChargeSound.current = false;
                }
            }
        } else { pendingGestureRef.current = GestureType.NONE; progressRef.current = 0; }
    };

    return (
        <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden group">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="w-full h-full object-cover transform -scale-x-100" />

            {/* UI Elements Removed for cleaner interface as requested */}

            {!isVisionReady && !cameraError && isCameraActive && (<div className="absolute inset-0 flex items-center justify-center bg-[#020202] z-20"> <Loader2 className="w-16 h-16 text-blue-500 animate-spin" /> </div>)}
            {cameraError && (<div className="absolute inset-0 flex items-center justify-center bg-[#050000] z-30 p-8 text-center"> <h2 className="text-2xl font-bold text-red-500 mb-4">{cameraError}</h2> <button onClick={() => loadMediaPipe()} className="px-6 py-3 bg-red-600 text-white rounded-lg">RETRY</button> </div>)}

            {/* Gemini Vision Analysis Panel — dominant emotion only */}
            {visionStats && enableCloudVision && isCameraActive && isVisionReady && !cameraError && (() => {
                // Likelihood ranking for comparison
                const likelihoodRank: Record<string, number> = {
                    'VERY_LIKELY': 5, 'LIKELY': 4, 'POSSIBLE': 3, 'UNLIKELY': 2, 'VERY_UNLIKELY': 1
                };
                const emotionEmojis: Record<string, string> = {
                    'JOY': '😊', 'SORROW': '😢', 'ANGER': '😠', 'SURPRISE': '😲'
                };
                const emotionColors: Record<string, string> = {
                    'JOY': '#facc15', 'SORROW': '#60a5fa', 'ANGER': '#ef4444', 'SURPRISE': '#a855f7'
                };

                // Find dominant emotion (excluding HEADWEAR)
                const emotions = [
                    { label: 'JOY', value: visionStats.joy },
                    { label: 'SORROW', value: visionStats.sorrow },
                    { label: 'ANGER', value: visionStats.anger },
                    { label: 'SURPRISE', value: visionStats.surprise },
                ];
                const ranked = emotions
                    .map(e => ({ ...e, rank: likelihoodRank[e.value] || 0 }))
                    .sort((a, b) => b.rank - a.rank);
                const dominant = ranked[0];
                const isNeutral = dominant.rank <= 2; // UNLIKELY or VERY_UNLIKELY
                const headwearRank = likelihoodRank[visionStats.headwear] || 0;
                const showHeadwear = headwearRank >= 4; // LIKELY or VERY_LIKELY

                const emoji = isNeutral ? '😌' : emotionEmojis[dominant.label] || '😐';
                const label = isNeutral ? 'CALM' : dominant.label;
                const color = isNeutral ? '#93c5fd' : emotionColors[dominant.label] || '#9ca3af';

                return (
                    <div className="absolute right-2 bottom-16 sm:right-3 sm:bottom-20 lg:right-4 lg:bottom-24 z-[15]
                        p-2 sm:p-2.5 lg:p-3
                        bg-black/30 backdrop-blur-xl border border-cyan-500/20 rounded-xl
                        text-white font-mono shadow-lg shadow-black/20
                        transition-all duration-500
                        pointer-events-none
                        hidden sm:block"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-1 gap-3">
                            <span className="text-[9px] sm:text-[10px] lg:text-xs font-bold tracking-widest text-cyan-400 uppercase">
                                Gemini Vision
                            </span>
                            <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                    cloudStatus === 'ACTIVE' ? 'bg-green-400 shadow-[0_0_4px_#4ade80]' :
                                    cloudStatus === 'ANALYZING' ? 'bg-yellow-400 animate-pulse' :
                                    cloudStatus === 'ERROR' ? 'bg-red-400' : 'bg-gray-500'
                                }`} />
                            </div>
                        </div>

                        {/* Dominant Emotion Display */}
                        <div className="flex items-center gap-2 py-1 transition-all duration-300">
                            <span className="text-2xl sm:text-3xl transition-all duration-500" style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
                                {emoji}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-xs sm:text-sm lg:text-base font-bold tracking-wider transition-colors duration-300" style={{ color }}>
                                    {label}
                                </span>
                                {!isNeutral && (
                                    <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium">
                                        {dominant.value?.replace('VERY_LIKELY', 'V.LIKELY').replace('VERY_UNLIKELY', 'V.UNLIKELY')}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Headwear indicator (only if LIKELY+) */}
                        {showHeadwear && (
                            <div className="flex items-center gap-1 mt-0.5 pt-1 border-t border-white/5">
                                <span className="text-[9px] text-gray-500">🧢</span>
                                <span className="text-[8px] sm:text-[9px] text-gray-400">HEADWEAR</span>
                            </div>
                        )}

                        {/* Timestamp */}
                        <div className="mt-1 pt-1 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[7px] sm:text-[8px] text-gray-500 tabular-nums">
                                {new Date(visionStats.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-[7px] sm:text-[8px] text-cyan-500/60 tracking-wider">LIVE</span>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default MagicCanvas;
