# ✦ Muse - AI Creative Studio

> **Google Gemini Developer Competition Project**

**Muse** is a next-generation **multimodal creative agent** that transforms your gestures, voice, and vision into digital art and animations in real-time. Powered by **Google Gemini 2.0 Flash** and **Gemini 1.5 Pro**, Muse bridges the gap between physical intent and digital creation.

It's not just a tool; it's a creative partner that listens, watches, and reasons.

---

## ⚡️ Powered by Google Gemini

Muse leverages the full spectrum of the Google AI ecosystem:

*   **🧠 Reasoning Core**: `gemini-2.0-flash-thinking-exp`
    *   Breaks down abstract concepts into detailed visual prompts using Chain-of-Thought reasoning.
*   **🗣️ Real-time Interaction**: `Gemini Multimodal Live API`
    *   Powers **Muse Live**, enabling fluid, low-latency voice and video conversations.
*   **🎨 Image Generation**: `imagen-3.0-generate-001` / `gemini-2.0-flash`
    *   High-fidelity image generation with rapid inference.
*   **🎥 Video Generation**: `veo-2.0-generate-001` (Simulated/Preview)
    *   Transforms static images into 4-second motion clips.
*   **👁️ Computer Use**: `gemini-2.0-flash`
    *   Simulates an autonomous agent researching topics on the web to ground art in reality.

---

## 🛠 Features

### 1. 👐 Multimodal Gesture Control
Touch-free interface using **MediaPipe** hand tracking. Control the entire studio with simple hand signs.

| Icon | Gesture | Action | Description |
| :---: | :--- | :--- | :--- |
| 👌 | **OK Sign** | **Generate** | Confirms prompt and creates image. |
| 🖐️ | **Open Palm** | **Inspire** | Triggers "Dreaming Mode" for creative ideas. |
| ✊ | **Fist** | **Voice Input** | Activates microphone for commands. |
| 🤙 | **Shaka** | **Muse Live** | Starts real-time video call with Muse. |
| 🤏 | **Pinch** | **Adjust Theme** | Rotates UI themes (Cyberpunk, Zen, etc.). |
| ✌️ | **Victory** | **Cyber / Video** | Switches style or animates current image. |
| 🤘 | **Rock** | **Metal Style** | Applies Dark Fantasy aesthetic. |
| 🤟 | **Love** | **Anime Style** | Applies Kawaii/Anime aesthetic. |

### 2. 💬 Muse Live
A real-time, two-way conversational mode where you can talk to Muse naturally.
*   **See**: Muse sees what your camera sees.
*   **Hear**: Interruptible, natural voice interaction.
*   **Do**: Ask Muse to "draw this" or "animate that" instantly.

### 3. 🕵️ Agentic Research (Computer Use)
When you ask for something complex (e.g., "A 19th-century Prussian Hussar uniform"), Muse's **Reasoning Core** activates a simulated "Computer Use" agent to research historical details before generating, ensuring accuracy.

### 4. 🧠 Memory & Persona (Pro)
Muse remembers your artistic style and preferences across sessions using Firebase Firestore, creating a personalized creative partner.

---

## ⚙️ Tech Stack

*   **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
*   **AI Vision**: MediaPipe Hands (Client-side WASM)
*   **LLM Integration**: Google GenAI SDK (`@google/genai`)
*   **Backend/Auth**: Firebase Authentication & Firestore
*   **State Management**: React Hooks & Context

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   Google AI Studio API Key
*   Firebase Project (for Auth/DB)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/muse.git
    cd muse
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    VITE_GEMINI_API_KEY=your_gemini_api_key
    VITE_FIREBASE_API_KEY=your_firebase_api_key
    # ... other firebase config
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 🛡️ License

MIT License. Built for the Google Gemini Developer Competition.
