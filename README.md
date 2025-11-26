# AI Voice Agent Onboarding Assistant

This repository contains the source code for an AI-powered voice agent designed to assist with user onboarding. The agent, named Maya, guides users through a series of steps in a conversational manner, providing information and collecting necessary details.

## Project Overview

The primary goal of this project is to create a seamless and engaging onboarding experience for new users. The AI voice agent is built using the Google Gemini Live API, which provides real-time voice-to-text and text-to-voice capabilities. The agent's behavior is defined by a series of stages, each with its own system prompt and knowledge base.

### Key Features

- **Conversational Onboarding:** A voice-based interface that guides users through the onboarding process.
- **Dynamic Stage Progression:** The conversation flows through a series of predefined stages, with the AI's behavior and responses tailored to each stage.
- **Admin Panel:** A web-based interface for administrators to monitor analytics, review call logs, and configure the AI's system prompts and stages.
- **Real-time Transcription:** The user's and the AI's speech are transcribed in real-time and displayed on the dashboard.

## Architecture

The application is a monorepo with a client-server architecture:

- **Frontend:** A React application built with TypeScript and Vite. It provides the user-facing dashboard and the admin panel.
- **Backend:** A Node.js server built with Express and TypeScript. It handles API requests, interacts with the database, and will eventually proxy requests to the Gemini Live API.

### Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **AI:** Google Gemini Live API

## Getting Started

To run the application locally, you'll need to have Node.js and npm installed.

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the root of the project and add your Google Gemini API key:

   ```
   API_KEY=your_gemini_api_key
   ```

### Running the Application

1. **Start the backend server:**

   ```bash
   npm run server
   ```

   The backend server will start on port 3001.

2. **Start the frontend development server:**

   ```bash
   npm run dev
   ```

   The frontend application will be available at `http://localhost:5173`.

## Contributing

We welcome contributions to this project! If you'd like to contribute, please follow these steps:

1. **Fork the repository.**
2. **Create a new branch** for your feature or bug fix.
3. **Make your changes** and commit them with a descriptive commit message.
4. **Push your changes** to your fork.
5. **Create a pull request** to the `main` branch of the original repository.

Please make sure to follow the existing code style and to add tests for any new functionality.
