
import { GestureType, Landmark } from '../types';

// Helper: Calculate Euclidean distance
const distance = (p1: Landmark, p2: Landmark) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

/**
 * Check if a finger is extended (Open) or curled (Closed).
 * Logic: A finger is extended if the Tip is significantly further from the Wrist than the PIP joint is.
 */
const isFingerExtended = (wrist: Landmark, mcp: Landmark, tip: Landmark, scaleRef: number): boolean => {
    const distTip = distance(wrist, tip);
    const distMcp = distance(wrist, mcp);
    // Threshold: Tip must be further than MCP. 
    // We strictly require it to be notably further to avoid "half-curled" false positives.
    return distTip > distMcp * 1.3;
};

/**
 * Check if Thumb is extended.
 * Thumb logic is different: We check if the Tip is far away from the Index Finger's MCP (base).
 */
const isThumbExtended = (thumbTip: Landmark, indexMcp: Landmark, pinkyMcp: Landmark): boolean => {
    // Distance to index base (checking if it's tucked in)
    const distIndex = distance(thumbTip, indexMcp);

    // If thumb is far from index base, it's likely extended
    return distIndex > 0.08;
};

export const detectGesture = (landmarks: Landmark[]): GestureType => {
    if (!landmarks || landmarks.length !== 21) return GestureType.NONE;

    const wrist = landmarks[0];

    // Finger Indices
    // Thumb: 1-4, Index: 5-8, Middle: 9-12, Ring: 13-16, Pinky: 17-20
    const thumbTip = landmarks[4];

    const indexMcp = landmarks[5];
    const indexTip = landmarks[8];

    const middleMcp = landmarks[9];
    const middleTip = landmarks[12];

    const ringMcp = landmarks[13];
    const ringTip = landmarks[16];

    const pinkyMcp = landmarks[17];
    const pinkyTip = landmarks[20];

    // Scale Reference: Distance between Wrist and Middle Finger MCP
    // Used to normalize distances regardless of hand distance from camera
    const handScale = distance(wrist, middleMcp);

    // 1. Determine State of Each Finger (Index to Pinky)
    const indexOpen = isFingerExtended(wrist, indexMcp, indexTip, handScale);
    const middleOpen = isFingerExtended(wrist, middleMcp, middleTip, handScale);
    const ringOpen = isFingerExtended(wrist, ringMcp, ringTip, handScale);
    const pinkyOpen = isFingerExtended(wrist, pinkyMcp, pinkyTip, handScale);

    // Thumb State
    const thumbOpen = isThumbExtended(thumbTip, indexMcp, pinkyMcp);

    // --- Logic Tree ---

    const pinchDist = distance(thumbTip, indexTip);

    // 1. OK Sign (👌) -> GENERATE IMAGE
  // Logic: Thumb and Index tips are close, other 3 fingers are OPEN.
  // Relaxed threshold (0.5 * handScale) to make it easier to trigger.
  if (pinchDist < handScale * 0.5 && middleOpen && ringOpen && pinkyOpen) {
    return GestureType.OK;
  }

    // 1.5. DIAL / PINCH (🤏) -> ADJUST THEME
    // Logic: Thumb and Index tips are close, other 3 fingers are CLOSED.
    // CRITICAL: Index must be EXTENDED (not curled) to distinguish from FIST.
    // In a fist, index is curled into palm; in DIAL, index extends outward for rotation.
    if (pinchDist < handScale * 0.3 && !middleOpen && !ringOpen && !pinkyOpen) {
        // Additional check: index tip must be far enough from wrist to indicate extension
        // This prevents fist (where index is curled) from being detected as DIAL
        const indexExtension = distance(wrist, indexTip) / handScale;
        if (indexExtension > 1.2) {
            return GestureType.DIAL;
        }
    }

    // 2. FIST (✊) -> RECORD VOICE
    // Logic: All main fingers closed.
    if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        return GestureType.FIST;
    }

    // 3. OPEN PALM (🖐️) -> GENERATE INSPIRATION
    // Logic: All 5 fingers open.
    // CRITICAL FIX: Ensure thumb and index are NOT pinching (transitioning to OK).
    if (thumbOpen && indexOpen && middleOpen && ringOpen && pinkyOpen) {
        if (pinchDist > handScale * 0.5) {
            return GestureType.OPEN_PALM;
        }
    }

    // 4. VICTORY / PEACE (✌️) -> STYLE: CYBERPUNK
    // Logic: Index & Middle Open. Ring & Pinky Closed.
    if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
        return GestureType.VICTORY;
    }

    if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
        return GestureType.POINTING;
    }

    // 5. ROCK (🤘) vs LOVE (🤟) -> STYLE: METAL / ANIME
    // Core: Index & Pinky Open. Middle & Ring Closed.
    if (indexOpen && pinkyOpen && !middleOpen && !ringOpen) {
        if (thumbOpen) {
            return GestureType.LOVE; // ILY sign (Thumb out)
        } else {
            return GestureType.ROCK; // Metal horns (Thumb in)
        }
    }

    // 6. SHAKA (🤙) -> JUST FOR FUN MODE
    // Logic: Thumb & Pinky Open. Index, Middle, Ring Closed.
    if (thumbOpen && pinkyOpen && !indexOpen && !middleOpen && !ringOpen) {
        return GestureType.SHAKA;
    }

    return GestureType.NONE;
};

// --- Face Expression Logic for AR ---

export enum FaceExpression {
    NEUTRAL = 'NEUTRAL',
    SMILE = 'SMILE',
    SURPRISE = 'SURPRISE',
    BLINK = 'BLINK'
}

export const detectFaceExpression = (landmarks: Landmark[]): FaceExpression => {
    if (!landmarks || landmarks.length < 468) return FaceExpression.NEUTRAL;

    // Key Landmarks (MediaPipe Face Mesh)
    const upperLipTop = landmarks[13];
    const lowerLipBottom = landmarks[14];
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];

    const faceTop = landmarks[10];
    const faceBottom = landmarks[152];

    // Brows
    const leftEyebrow = landmarks[65];
    const rightEyebrow = landmarks[295];
    const leftEyeTop = landmarks[159];
    const rightEyeTop = landmarks[386];

    // Metrics
    const faceHeight = Math.abs(faceTop.y - faceBottom.y);
    const mouthHeight = Math.abs(upperLipTop.y - lowerLipBottom.y);
    const mouthWidth = Math.abs(mouthLeft.x - mouthRight.x);

    // 1. Normalized Ratios
    const mouthOpenRatio = mouthHeight / faceHeight;
    const mouthWidthRatio = mouthWidth / faceHeight;

    // 2. Smile Detection (Check First to catch "Happy Surprise")
    // Logic: Corners of mouth move UP relative to center.
    const mouthCenterY = (upperLipTop.y + lowerLipBottom.y) / 2;
    const cornersY = (mouthLeft.y + mouthRight.y) / 2;
    const smileLift = mouthCenterY - cornersY;

    // Combined logic: Lift > threshold OR wide mouth (grin)
    if (smileLift > 0.015 || (smileLift > 0.01 && mouthWidthRatio > 0.45)) {
        return FaceExpression.SMILE;
    }

    // 3. Surprise Logic (Mouth Open + Eyebrows Raised)
    // Check eyebrow height relative to eye
    const leftBrowRaise = Math.abs(leftEyebrow.y - leftEyeTop.y) / faceHeight;
    const rightBrowRaise = Math.abs(rightEyebrow.y - rightEyeTop.y) / faceHeight;
    const avgBrowRaise = (leftBrowRaise + rightBrowRaise) / 2;

    // Thresholds: Mouth open AND brows raised.
    // ADDED: mouthWidthRatio check. If mouth is too wide (> 0.6), it's likely a yawn or scream, but less likely a simple "O" surprise.
    // Also ensuring no conflict with Smile (checked above).
    if (mouthOpenRatio > 0.08 && avgBrowRaise > 0.065 && mouthWidthRatio < 0.6) {
        return FaceExpression.SURPRISE;
    }

    return FaceExpression.NEUTRAL;
}
