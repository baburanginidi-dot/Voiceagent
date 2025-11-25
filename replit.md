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
│   ├── AdminPanel.tsx   # Admin interface (stage & prompt editing)
│   ├── Authentication.tsx # User login/auth
│   ├── Dashboard.tsx    # Main user interface (fetches dynamic config)
│   ├── StageList.tsx    # Onboarding stage tracker
│   └── Visualizer.tsx   # Audio visualizer component
├── context/
│   └── ConfigContext.tsx # Global state for stages & system prompt
├── services/
│   ├── geminiLive.ts    # Gemini Live API integration
│   └── mockAdminService.ts # Mock admin service (in-memory storage)
├── App.tsx              # Main app component (wraps with ConfigProvider)
├── constants.ts         # System prompts and constants (defaults)
├── types.ts             # TypeScript type definitions (includes SystemConfig)
└── vite.config.ts       # Vite configuration
```

## Recent Changes
- **2025-11-25**: Dynamic Configuration System (Latest)
  - ✅ Created ConfigContext to share stages and system prompt globally
  - ✅ Dashboard now fetches latest admin config on session start
  - ✅ Admin Panel changes now trigger refreshConfig() for Dashboard
  - ✅ AI behavior dynamically responds to Admin stage configurations
  - ✅ Stage prompts and settings apply immediately for next session
  - Removes static STAGES dependency - all config is now dynamic from Admin Panel
  
- **2025-11-25**: Audio Overlap & Voice Clarity Fixes
  - Replaced audio queue with sequential playback system
  - Fixed multiple voices playing simultaneously (critical UX issue)
  - Implemented proper audio buffering - only ONE voice plays at a time
  - Added noise filtering for cleaner transcripts (<noise>, [silence], etc.)
  - Fixed "popcorn" text bubbles - messages now append instead of creating new bubbles
  - Enhanced Tenglish support in system prompts
  - All audio chunks now queue properly and play sequentially
  
- **2025-11-25**: Audio Overlap Prevention & UI Fixes
  - Removed React Strict Mode to prevent double connections
  - Added connection state guards in Dashboard
  - Improved audio race condition handling
  
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

## Hash-Based Routing

The application uses hash-based routing for navigation:

### Available Routes:
- `http://localhost:5000/` or `http://localhost:5000/#home` - User authentication & dashboard
- `http://localhost:5000/#admin` - Admin panel (requires admin credentials)

### Accessing Admin Page:

**Method 1: Direct URL**
Navigate to `http://localhost:5000/#admin` in your browser

**Method 2: From Authentication Screen**
Click the "Admin Portal" link on the authentication screen

### Admin Credentials (Development):
- Username: `admin`
- Password: `password`

**Note:** This is for development only. In production, replace with proper authentication.

## Key Features
1. **Voice Interaction**: Real-time audio communication with Gemini AI
2. **Stage-based Onboarding**: 6-stage progression system
3. **Audio Visualization**: Real-time voice amplitude display
4. **Transcript Display**: Live conversation transcription
5. **Mute/Unmute**: Microphone control
6. **Admin Panel**: Complete administrative interface with:
   - Analytics & Call Logs
   - Stage Configuration & Management
   - System Prompt Editing
   - Document Upload (RAG Support)
7. **Hash-Based Routing**: Direct URL navigation to admin and home pages

## User Preferences
None specified yet.

## Security Considerations

⚠️ **Important**: Currently, the GEMINI_API_KEY is injected directly into the client bundle via Vite's `define` option. This means the API key is exposed to end users in the browser, which is a security risk for production use.

**Recommended for Production**:
- Implement a backend proxy server to handle Gemini API calls
- Move the API key to server-side environment variables only
- Have the frontend communicate with your backend, which then calls Gemini
- This prevents API key exposure and allows better rate limiting and usage control

## Deployment

The app is configured for autoscale deployment:
- Build command: `npm run build`
- Run command: `npm run preview`
- Ensure preview runs with `--host 0.0.0.0 --port 5000` for proper Replit routing

## Voice Implementation Details

### Sequential Audio Playback (FIXED)
The voice system now implements proper sequential audio buffering:
1. **Audio Buffers are Queued** - Instead of scheduling multiple sources at once, all audio chunks are added to a queue
2. **Sequential Playback** - Only ONE audio source plays at a time
3. **Proper Handoff** - When one buffer finishes playing, the next one automatically starts
4. **No Overlap** - Eliminates the "multiple voices" problem

**Technical Implementation:**
- `audioBufferQueue`: Array of buffers waiting to be played
- `currentAudioSource`: Tracks the actively playing source
- `isPlayingAudio`: Flag to prevent concurrent playback
- `playNextAudio()`: Recursively plays each buffer in sequence

### Noise Filtering
- Filters out: `<noise>`, `<silence>`, `[silence]`, `(uncaptioned)`, `<blank>`
- Ignores transcripts shorter than 2 characters (likely noise/static)
- Applied to both user and agent transcripts

### Chat Bubbles
- Messages from the same speaker now append to the existing bubble
- Only creates new bubbles when speaker changes
- Eliminates the "popcorn" effect of individual words

## Dynamic Configuration Flow

**How Admin Changes Affect AI:**

1. **Admin Edits Stage Configuration** → Clicks "Save Stage Configuration"
2. **AdminPanel Calls**:
   - `MockAdminService.updateStages(updatedStages)` (saves to memory)
   - `refreshConfig()` from ConfigContext (broadcasts update)
3. **ConfigContext Updates**:
   - Fetches latest config from MockAdminService
   - Updates `stages` and `systemPrompt` in global context
4. **Dashboard Detects Change**:
   - When user starts session, Dashboard calls `refreshConfig()`
   - Gets latest `stages` from context
5. **AI Speaks with New Config**:
   - `getSystemInstruction(userName, stages)` generates updated prompt
   - Gemini Live API connects with new system instruction
   - AI now follows updated stage configuration

**Key Points:**
- Changes are in-memory (stored in MockAdminService)
- Each new session fetches the latest admin config
- No database persistence yet (Phase 3 feature)
- Admin changes only apply to new sessions, not active calls

## Notes
- The app requires microphone permissions to function
- Best used with headphones in a quiet environment
- Supports interruption handling for natural conversation flow
- Voice is now clear, single-instance, and non-overlapping
- Admin Panel configuration changes are now dynamically applied to AI behavior
