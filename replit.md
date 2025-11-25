# Maya - NxtWave Voice Agent

## Overview
Maya is a voice-powered AI assistant built with React, TypeScript, and Vite that uses Google's Gemini Live API for real-time audio interactions. The application provides an interactive onboarding experience with voice-based communication.

## Project Architecture

### Technology Stack
- **Frontend**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 6.2.0
- **AI/Voice**: Google Gemini Live API (@google/genai)
- **Audio Processing**: Web Audio API
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Database Tools**: Drizzle Kit for migrations

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
├── server/
│   ├── db.ts            # PostgreSQL connection & Drizzle ORM setup
│   └── storage.ts       # DatabaseStorage implementation
├── shared/
│   └── schema.ts        # Drizzle ORM schema definitions
├── services/
│   ├── geminiLive.ts    # Gemini Live API integration
│   └── mockAdminService.ts # Mock admin service (in-memory storage)
├── App.tsx              # Main app component (wraps with ConfigProvider)
├── constants.ts         # System prompts and constants (defaults)
├── types.ts             # TypeScript type definitions (includes SystemConfig)
├── drizzle.config.ts    # Drizzle Kit configuration
└── vite.config.ts       # Vite configuration
```

## Database Schema

### Tables Overview

**users** - Stores user information
- `id` (int, PK): Auto-incremented unique identifier
- `name` (varchar): User's full name
- `phoneNumber` (varchar, unique): User's phone number
- `createdAt` (timestamp): Account creation timestamp
- `updatedAt` (timestamp): Last update timestamp

**stages** - Defines onboarding stages
- `id` (int, PK): Auto-incremented identifier
- `name` (varchar): Stage name (e.g., "Discovery", "Consultation")
- `level` (int): Stage progression level (1-6)
- `description` (text): Stage description
- `createdAt` (timestamp): Creation timestamp
- `updatedAt` (timestamp): Last update timestamp

**systemPrompts** - AI behavior prompts per stage (versioned)
- `id` (int, PK): Auto-incremented identifier
- `stageId` (int, FK): References stages.id
- `prompt` (text): System instruction for AI at this stage
- `version` (int): Prompt version for tracking changes
- `isActive` (boolean): Whether this prompt is currently active
- `createdAt` (timestamp): Creation timestamp
- `updatedAt` (timestamp): Last update timestamp

**adminDocuments** - Documents uploaded by admin that influence AI
- `id` (int, PK): Auto-incremented identifier
- `stageId` (int, FK): References stages.id
- `title` (varchar): Document title
- `content` (text): Document content (for RAG/context)
- `documentType` (varchar): 'guideline', 'context', 'product_info', etc.
- `uploadedBy` (varchar): Admin who uploaded the document
- `createdAt` (timestamp): Upload timestamp
- `updatedAt` (timestamp): Last update timestamp

**stageMovements** - Tracks user progression through stages
- `id` (int, PK): Auto-incremented identifier
- `userId` (int, FK): References users.id
- `previousStageId` (int, FK): Previous stage (nullable)
- `currentStageId` (int, FK): References stages.id
- `reason` (varchar): Why the movement occurred ('payment_selection', 'completion', etc.)
- `metadata` (jsonb): Additional context about the movement
- `movedAt` (timestamp): When the movement occurred

**transcripts** - Stores all conversation transcripts
- `id` (int, PK): Auto-incremented identifier
- `userId` (int, FK): References users.id
- `stageId` (int, FK): References stages.id
- `sessionId` (varchar): Unique session identifier
- `userMessage` (text): User's message
- `aiResponse` (text): AI's response
- `audioUrl` (varchar): Optional URL to audio file
- `duration` (int): Duration in seconds
- `metadata` (jsonb): Additional context (confidence, intent, etc.)
- `createdAt` (timestamp): Conversation timestamp

**userSessions** - Tracks active user sessions for continuity
- `id` (int, PK): Auto-incremented identifier
- `userId` (int, FK): References users.id
- `stageId` (int, FK): References stages.id
- `sessionId` (varchar, unique): Unique session identifier
- `startTime` (timestamp): When session started
- `endTime` (timestamp): When session ended (nullable if active)
- `isActive` (boolean): Whether session is currently active
- `metadata` (jsonb): Session context (device, location, etc.)

### Key Relationships

- **User → Stage Movements**: One user can have multiple stage movements (1:N)
- **User → Transcripts**: One user can have many transcripts (1:N)
- **User → Sessions**: One user can have multiple sessions (1:N)
- **Stage → System Prompts**: One stage can have multiple prompt versions (1:N)
- **Stage → Admin Documents**: One stage can have multiple documents (1:N)
- **Stage → Stage Movements**: One stage can have multiple user movements (1:N)

### Database Management Commands

```bash
# Push schema changes to database
npm run db:push

# Force push schema (use if npm run db:push fails)
npm run db:push --force

# Open Drizzle Studio (web UI for database)
npm run db:studio
```

## Recent Changes
- **2025-11-25**: Stage Configuration Management (Latest)
  - ✅ **Stage Section Heading** - Added "Stage Configuration" heading with descriptive subtitle
  - ✅ **Rename Stages** - Admins can edit stage title and description in edit mode
  - ✅ **Add New Stages** - "+ Add New Stage" button now fully functional (creates blank stage)
  - ✅ **Edit Form Fields** - Stage title and description appear at top of edit form
  - ✅ **Save Changes** - "Save Configuration" button persists renamed/new stages
  - ✅ **Dynamic Stage ID** - New stages auto-increment based on highest existing ID
  - ✅ **Two-Part Heading** - Primary heading + secondary description text
  - ✅ **Full Stage Editor** - Can edit title, description, system prompt, knowledge base, and documents
  
- **2025-11-25**: Enhanced Drop-off Analysis Visualization
  - ✅ **Fixed Scaling Issue** - Changed from hardcoded `/50` to dynamic `maxVal` calculation
  - ✅ **Stage Conversion Funnel** - Visual bar chart showing user progression through 6 stages
  - ✅ **User Count Labels** - Numbers displayed above/on bars for clarity
  - ✅ **Detailed Statistics Table** - Stage-by-stage breakdown with drop-off analysis
  - ✅ **Week-over-Week KPIs** - Data-backed percentage changes with color coding
  
- **2025-11-25**: PostgreSQL Database Integration
  - ✅ Created comprehensive database schema with 7 tables
  - ✅ Users table stores name and phone number
  - ✅ Transcripts table captures all conversations with metadata
  - ✅ Stage-based system with system prompts that can be updated by admins
  - ✅ Admin documents table for storing context/guidelines
  - ✅ Stage movements tracking for monitoring user progression
  - ✅ User sessions table to maintain conversation continuity when users re-login
  - ✅ When user logs back in between stage movements, voice agent continues from last stage
  - ✅ Drizzle ORM setup with Neon PostgreSQL
  - ✅ DatabaseStorage class with full CRUD operations
  
- **2025-11-25**: Dynamic Configuration System
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
- `DATABASE_URL`: PostgreSQL connection string (managed by Replit)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: Database credentials (auto-managed)

### Servers
- **Frontend Server**: Vite on port 5000 (http://0.0.0.0:5000)
  - React application with voice UI
  - Hot module reloading enabled
  - Accessible via Replit proxy
  
- **Backend API Server**: Express on port 3001
  - REST API for analytics, sessions, and configuration
  - **Analytics Endpoints:**
    - `POST /api/analytics/session` - Save conversation sessions with transcripts
    - `GET /api/analytics/logs` - Retrieve all call logs grouped by session
    - `GET /api/analytics/analytics` - Get analytics summary (total calls, duration, etc)
  - **Configuration Endpoints:**
    - `GET /api/config/system-prompts` - Fetch system prompts and stages from database
    - `POST /api/config/system-prompts` - Save/update system prompt for a stage
  - **Health Check:**
    - `GET /api/health` - API health status

### Development Workflow
The workflow runs both servers concurrently using `npm run dev:all`:
- Frontend watches for changes and hot-reloads
- Backend API is always available for logging interactions

## Running the Application

The application runs automatically via the configured workflow:
```bash
npm run dev          # Start Vite frontend on port 5000
npm run dev:api      # Start Express API on port 3001
npm run dev:all      # Start both (used by default workflow)
npm run build        # Build for production
npm run preview      # Preview production build
npm run db:push      # Run database migrations
npm run db:studio    # Open Drizzle Studio for database management
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
