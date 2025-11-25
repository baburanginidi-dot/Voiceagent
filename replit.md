# Maya - NxtWave Voice Agent

## Overview
Maya is a voice-powered AI assistant using React, TypeScript, and Vite, integrating Google's Gemini Live API for real-time audio interaction. Its core purpose is to provide an interactive, voice-based onboarding experience. The project aims to offer a dynamic and configurable AI agent capable of guiding users through multi-stage processes, with robust analytics and administrative control.

## User Preferences
None specified yet.

## System Architecture

### Technology Stack
- **Frontend**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **AI/Voice**: Google Gemini Live API (@google/genai)
- **Audio Processing**: Web Audio API
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Database Tools**: Drizzle Kit for migrations

### UI/UX Decisions
- **Toast Notifications**: Non-blocking, auto-dismissing (3.5s) messages with success (green), error (red), and info (blue) states. Stacks vertically, bottom-right.
- **Inline Save Feedback**: Displays "Saved at HH:MM AM/PM" after successful saves, with button state changes ("Save Changes" -> "Saving..." -> "✓ Saved").
- **Audio Playback**: Sequential audio buffering ensures only one audio source plays at a time, eliminating overlap.
- **Transcript Display**: Live conversation transcription with noise filtering and "popcorn" text bubble fix (messages append to existing bubbles from the same speaker).
- **Admin Panel**: Provides a comprehensive interface for analytics, stage configuration, system prompt editing, and document uploads.

### Feature Specifications
- **Voice Interaction**: Real-time audio communication with Gemini AI.
- **Stage-based Onboarding**: A 6-stage progression system for users.
- **Audio Visualization**: Real-time voice amplitude display.
- **Mute/Unmute**: Microphone control.
- **Hash-Based Routing**: Supports navigation to `/`, `/#home`, and `/#admin`.
- **Dynamic Configuration System**: Admin panel changes to stage configurations and system prompts are dynamically applied to AI behavior for new sessions.
- **Notification System**: Implemented for user feedback on actions and system status.
- **Analytics**: Tracks user progression, conversation transcripts, and session details.
- **Noise Detection**: Real-time background noise monitoring with user warnings.
  - RMS-based audio level analysis from microphone input
  - Smart threshold (0.15 RMS) with 2.5s persistence requirement
  - Friendly amber warning popup at top of screen
  - Auto-dismiss when noise returns to normal
  - Rate-limited to max once per 30 seconds
  - Manual dismiss option (won't appear again that session)

### System Design Choices
- **Global State Management**: `ConfigContext` for sharing stage configurations and system prompts across the application.
- **Database Schema**: Designed to store user information, onboarding stages, versioned system prompts, admin documents, stage movements, conversation transcripts, and user sessions.
- **Server Architecture**:
    - **Frontend Server**: Vite on port 5000 for the React application.
    - **Backend API Server**: Express on port 3001 for analytics, session management, and configuration. Includes endpoints for saving/retrieving conversation sessions, analytics summaries, and system prompts.
- **Development Workflow**: `npm run dev:all` concurrently runs both frontend and backend servers.

## External Dependencies
- **Google Gemini Live API**: Used for real-time AI voice interactions.
- **PostgreSQL (Neon)**: Relational database for persistent storage.
- **Drizzle ORM**: Object-relational mapper for database interactions.
- **Vite**: Frontend build tool.