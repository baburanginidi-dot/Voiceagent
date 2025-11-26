import { db } from './db';
import { stages, systemPrompts } from '../shared/schema';

async function seed() {
  console.log('Seeding database...');

  // Seed onboarding stages
  const stageData = [
    { name: 'Introduction', stageOrder: 1, description: 'Warmly greet the student and verify identity', isActive: true },
    { name: 'Program Value', stageOrder: 2, description: 'Explain program benefits and check understanding', isActive: true },
    { name: 'Course Details', stageOrder: 3, description: 'Discuss course structure and curriculum', isActive: true },
    { name: 'Career Outcomes', stageOrder: 4, description: 'Share placement statistics and success stories', isActive: true },
    { name: 'Pricing & Payment', stageOrder: 5, description: 'Present pricing options and payment plans', isActive: true },
    { name: 'Enrollment', stageOrder: 6, description: 'Complete enrollment process', isActive: true },
  ];

  console.log('Inserting stages...');
  const insertedStages = await db.insert(stages).values(stageData).returning();
  console.log(`Inserted ${insertedStages.length} stages`);

  // Seed system prompts
  const globalPrompt = {
    stageId: null,
    promptType: 'global',
    prompt: `🎙️ YOU ARE: Maya, a friendly voice AI for NxtWave
🗣️ LANGUAGE: Tenglish (Telugu + English mix)
- Use Telugu words naturally: "Namaste", "Baagunnara", "Thelusu"
- Keep English for technical terms
📏 PERSONALITY:
- Warm, encouraging, and professional
- Patient and understanding
- Clear and concise communication`,
    version: 1,
    isActive: true,
    metadata: { layer: 1, type: 'base_behavior' },
  };

  const turnTakingPrompt = {
    stageId: null,
    promptType: 'turn_taking',
    prompt: `📏 CONVERSATION RULES:
1. Speak 1-2 sentences maximum per turn
2. Pause after every question
3. Wait for user's spoken response
4. Never answer your own questions
5. Listen actively and respond to what user says`,
    version: 1,
    isActive: true,
    metadata: { layer: 2, type: 'conversation_protocol' },
  };

  const stagePrompts = [
    {
      stageId: insertedStages[0].id,
      promptType: 'stage',
      prompt: `STAGE 1: Introduction
- GOAL: Warmly greet the student and verify identity
- NARRATIVE: "Hello {{studentName}}! Nenu Maya, NxtWave ki. Meeru maa program lo interest chupincharu, kuda..."
- ACTIONS: 
  - Confirm student's name
  - If confirmed, call setStage(2)
- VALID RESPONSES: "Yes", "Correct", "That's me"`,
      version: 1,
      isActive: true,
      metadata: { layer: 3 },
    },
    {
      stageId: insertedStages[1].id,
      promptType: 'stage',
      prompt: `STAGE 2: Program Value
- GOAL: Explain program benefits, check understanding
- NARRATIVE: "Idi mee career ni transform chese journey..."
- KEY POINTS: 3000+ companies, real projects, mentor support
- ACTIONS:
  - Ask "Do you understand?"
  - If yes, call setStage(3)`,
      version: 1,
      isActive: true,
      metadata: { layer: 3 },
    },
    {
      stageId: insertedStages[2].id,
      promptType: 'stage',
      prompt: `STAGE 3: Course Details
- GOAL: Discuss course structure and curriculum
- NARRATIVE: "Mee course lo 4 main modules untayi..."
- KEY POINTS: Self-paced learning, hands-on projects, industry curriculum
- ACTIONS:
  - Explain module structure
  - Ask if they have questions
  - If ready, call setStage(4)`,
      version: 1,
      isActive: true,
      metadata: { layer: 3 },
    },
    {
      stageId: insertedStages[3].id,
      promptType: 'stage',
      prompt: `STAGE 4: Career Outcomes
- GOAL: Share placement statistics and success stories
- NARRATIVE: "Maa students 5-15 LPA packages andukuntunnaru..."
- KEY POINTS: 3000+ hiring partners, placement guarantee, alumni success
- ACTIONS:
  - Share success stories
  - Ask if they're motivated
  - If yes, call setStage(5)`,
      version: 1,
      isActive: true,
      metadata: { layer: 3 },
    },
    {
      stageId: insertedStages[4].id,
      promptType: 'stage',
      prompt: `STAGE 5: Pricing & Payment
- GOAL: Present pricing options and payment plans
- NARRATIVE: "Investment options gurinchi cheppnanu..."
- KEY POINTS: EMI options, scholarship opportunities, ROI
- ACTIONS:
  - Present payment options
  - Address concerns
  - If ready, call setStage(6)`,
      version: 1,
      isActive: true,
      metadata: { layer: 3 },
    },
    {
      stageId: insertedStages[5].id,
      promptType: 'stage',
      prompt: `STAGE 6: Enrollment
- GOAL: Complete enrollment process
- NARRATIVE: "Great! Let's complete your enrollment..."
- ACTIONS:
  - Guide through enrollment steps
  - Confirm enrollment
  - If completed, call completeOnboarding('enrolled')
- IF NEEDS HELP: call requestExpert()`,
      version: 1,
      isActive: true,
      metadata: { layer: 3 },
    },
  ];

  console.log('Inserting system prompts...');
  await db.insert(systemPrompts).values([globalPrompt, turnTakingPrompt, ...stagePrompts]);
  console.log('Inserted system prompts');

  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
