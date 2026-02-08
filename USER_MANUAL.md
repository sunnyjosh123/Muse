# Muse - AI Creative Studio User Manual

Welcome to **Muse**, your multimodal AI creative partner powered by Google's **Gemini 2.0 Flash**. Muse transforms your gestures, voice, and vision into stunning digital art, animations, and creative insights in real-time.

---

## Table of Contents

1. [Installation & Setup](#1-installation--setup)
2. [Getting Started (User)](#2-getting-started-user)
3. [Core Interface](#3-core-interface)
4. [Gesture Control System](#4-gesture-control-system)
5. [Muse Live (Real-time Conversation)](#5-muse-live-real-time-conversation)
6. [Agentic Features](#6-agentic-features)
7. [Membership Tiers](#7-membership-tiers)
8. [Settings & Customization](#8-settings--customization)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Installation & Setup

If you are a developer running Muse locally from source code, follow these steps.

### Prerequisites
*   **Node.js**: v18 or higher.
*   **Google Gemini API Key**: Get it from [Google AI Studio](https://aistudio.google.com/).
*   **Firebase Project**: Required for authentication and database features.

### Step 1: Clone & Install
```bash
git clone https://github.com/your-username/muse.git
cd muse
npm install
```

### Step 2: Configure Environment
Create a `.env` file in the root directory (copy from `.env.example`):
```bash
cp .env.example .env
```
Fill in your API keys:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_FIREBASE_API_KEY=your_firebase_api_key
# ... add other Firebase config values
```

### Step 3: Run Development Server
Start the local server:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Step 4: Build for Production
To create a deployment-ready build (creates `dist/` folder):
```bash
npm run build
```

---

## 2. Getting Started (User)

### System Requirements
- **Browser**: Chrome, Edge, or any modern browser with WebGL support.
- **Hardware**: Webcam and Microphone are required for full multimodal interaction.
- **Network**: Stable internet connection for AI processing.

### Login & Authentication
Muse supports multiple secure login methods:
- **Google Account**: One-click sign-in.
- **GitHub**: For developer accounts.
- **Email/Password**: Standard registration.
- **Guest Mode**: Limited access for trying out the platform (Daily limit applies).

### Onboarding
First-time users will experience an interactive onboarding session. Muse will scan your biometric rhythm (simulated) and guide you through the basic gestures.

---

## 3. Core Interface

### The Magic Canvas
The central area where your creativity comes to life. It displays a live video feed overlayed with:
- **Face & Hand Tracking**: Real-time skeletal visualization.
- **Particle Effects**: Dynamic visual feedback based on your gestures.
- **HUD**: Heads-Up Display showing system status and recognition confidence.

### Control Panel
Located at the bottom of the screen, providing manual controls:
- **Prompt Bar**: View and edit your text prompt.
- **Style Indicator**: Shows current artistic style (e.g., Cyberpunk, Retro).
- **Action Buttons**:
    - **Camera Toggle**: Turn video on/off.
    - **Mic Toggle**: Turn voice input on/off.
    - **Magic Wand**: Trigger generation manually.
    - **Share**: Export to X (Twitter) or YouTube.

---

## 4. Gesture Control System

Muse uses advanced MediaPipe tracking to recognize hand signs. Hold gestures steady for **1-2 seconds** to trigger actions.

| Gesture | Icon | Action | Description |
| :--- | :---: | :--- | :--- |
| **OK Sign** | 👌 | **Generate** | Confirms your prompt and generates the image. |
| **Open Palm** | 🖐️ | **Inspire** | Asks Muse for creative inspiration (Dreaming Mode). |
| **Fist** | ✊ | **Voice Input** | Activates microphone to listen to your command. |
| **Pinch (Dial)** | 🤏 | **Adjust Theme** | Rotate your hand to cycle through visual themes. |
| **Victory** | ✌️ | **Cyber Style** | Switches style to "Cyberpunk" / Video Animate. |
| **Rock** | 🤘 | **Metal Style** | Switches style to "Heavy Metal" / Dark Fantasy. |
| **Love (ILY)** | 🤟 | **Anime Style** | Switches style to "Anime" / Kawaii. |
| **Shaka** | 🤙 | **Muse Live** | Activates the Real-time Voice/Video Chat mode. |

**Pro Tip**: Watch the **Gesture Progress Ring** on screen. It fills up as you hold a gesture to confirm the action.

---

## 5. Muse Live (Real-time Conversation)

**Muse Live** allows for a continuous, fluid conversation with the AI, similar to a video call.

- **Activation**: Perform the **Shaka** 🤙 gesture or click the Phone icon.
- **Capabilities**:
    - **See**: Muse can see what you show to the camera (drawings, objects, expressions).
    - **Hear**: Talk naturally without holding the "Fist" gesture.
    - **Draw**: Ask Muse to "Draw this" or "Make it move" instantly.
- **Visual Triggers**:
    - Say *"Draw a [cat]"* -> Generates image.
    - Say *"Animate this"* -> Creates a video from the image.

---

## 6. Agentic Features

Muse is more than a generator; it's an agent.

### Reasoning Core
Powered by **Gemini 2.0 Flash Thinking**, Muse breaks down complex requests into steps before generating. You can see its "thought process" in the Thought Stream overlay.

### Computer Use HUD
When Muse needs to "research" a topic to better understand your prompt, it activates the Computer Use HUD. This simulates an agent browsing the web or querying databases to ensure accuracy (e.g., "Draw a specific historical uniform").

---

## 7. Membership Tiers

### Muse Basic (Free)
- Standard Image Generation.
- Daily usage limits.
- Access to standard themes (Retro, Zen).
- Community support.

### Muse Aura (Pro)
- **Unlimited Generations**.
- **Veo Video Generation**: Turn static images into 4-second videos.
- **4K Ultra-HD Downloads**.
- **Commercial License**.
- **Exclusive Themes**: Game, Comic, Alchemist.
- **Priority Processing**: Skip the queue during high traffic.
- **Persona Memory**: Muse remembers your style preferences across sessions.

---

## 8. Settings & Customization

Access via the **Settings (Gear)** icon:

- **Themes**: Manually switch between visual aesthetics (Cyberpunk, Zen, Retro, etc.).
- **Language**: Switch UI and Voice language (English, Chinese, Spanish, Japanese, Korean, French, German).
- **Accessibility Mode**: High-contrast UI and simplified gesture thresholds.
- **Memory**: Enable/Disable long-term memory (Pro feature).
- **Custom Instructions**: Define a custom persona for Muse (e.g., "You are a grumpy art critic").

---

## 9. Troubleshooting

- **Camera/Mic not working**: Ensure browser permissions are allowed for the site.
- **Gestures not detecting**:
    - Ensure good lighting.
    - Keep your hand within the camera frame.
    - Don't move your hand too fast.
- **Generation failed**: Check your internet connection. If the server is busy, try again in a few seconds.

---

*Muse v1.0 - Built for Google Gemini Developer Competition*
