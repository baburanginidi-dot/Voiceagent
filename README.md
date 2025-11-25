<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1PDXUmm8k8MUuKoO8IBZMOcUtYaYV8ruH

## Run Locally

**Prerequisites:**  Node.js

### Running the Frontend
1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

### Running the Backend
1. Navigate to the server directory:
   `cd server`
2. Install dependencies:
   `npm install`
3. Create a `.env` file and add your Gemini API key:
   `GEMINI_API_KEY=YOUR_API_KEY`
4. Run the server:
   `npx ts-node index.ts`

You will need to have both the frontend and backend servers running at the same time in separate terminals.
