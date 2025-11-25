# Maya - NxtWave Voice Agent

## Overview
Maya is a voice-powered AI assistant built with React, TypeScript, and Vite that uses Google's Gemini Live API for real-time audio interactions. The application provides an interactive onboarding experience with voice-based communication.

## Project Architecture

### Technology Stack
- **Frontend**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **AI/Voice**: Google Gemini Live API (@google/genai)
- **Audio Processing**: Web Audio API

### Project Structure
```
.
├── components/          # React components
│   ├── AdminPanel.tsx   # Admin interface
│   ├── Authentication.tsx # User login/auth
│   ├── Dashboard.tsx    # Main user interface
│   ├── StageList.tsx    # Onboarding stage tracker
│   └── Visualizer.tsx   # Audio visualizer component
├── services/
│   ├── geminiLive.ts    # Gemini Live API integration
│   └── mockAdminService.ts # Mock admin functionality
├── App.tsx              # Main app component
├── constants.ts         # System prompts and constants
├── types.ts             # TypeScript type definitions
└── vite.config.ts       # Vite configuration
```

## Recent Changes
- **2025-11-25**: Initial Replit environment setup
  - Configured Vite for port 5000 with allowedHosts for proxy compatibility
  - Set up workflow for dev server
  - Configured GEMINI_API_KEY as secret

## Configuration

### Environment Variables
- `GEMINI_API_KEY`: Required secret for Gemini Live API access

### Development Server
- Port: 5000
- Host: 0.0.0.0 (allows proxy access)
- allowedHosts: true (required for Replit iframe preview)

## Running the Application

The application runs automatically via the configured workflow:
```bash
npm run dev
```

## Key Features
1. **Voice Interaction**: Real-time audio communication with Gemini AI
2. **Stage-based Onboarding**: 6-stage progression system
3. **Audio Visualization**: Real-time voice amplitude display
4. **Transcript Display**: Live conversation transcription
5. **Mute/Unmute**: Microphone control
6. **Admin Panel**: Administrative interface

## User Preferences
None specified yet.

## Notes
- The app requires microphone permissions to function
- Best used with headphones in a quiet environment
- Supports interruption handling for natural conversation flow
