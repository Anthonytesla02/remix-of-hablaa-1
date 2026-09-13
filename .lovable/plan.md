# Light onboarding flow

## What will change
- Replace the dark welcome and introduction backgrounds with Habla’s primary light background while preserving readable contrast and the existing mascot artwork.
- Rebuild setup as a focused, one-question-per-screen onboarding journey with a clear progress bar, back navigation, selectable answers, and a bottom Continue action.
- Keep account creation in the journey: welcome → Habla introduction → account creation → personal setup → first lesson map.

## Onboarding questions
1. What should Habla call you?
2. How did you hear about Habla?
3. Which language do you want to learn?
4. How much of the language do you already know?
5. Choose the tutor and teaching personality you want.
6. Why are you learning?
7. What outcome and timeline are you aiming for?
8. How much time can you practice each day?
9. Review the personalized plan and begin.

## Experience details
- Habla appears beside concise prompts, with friendly transitions between questions.
- Answer cards show a strong selected state; Continue remains unavailable until a required answer is chosen.
- Existing language, tutor, goal, timeline, and daily-practice data continue to drive the learner profile and course experience.
- New discovery-source and skill-level answers are retained locally without changing account security or lesson behavior.
- The flow remains mobile-only, safe-area aware, keyboard-friendly, and reduced-motion friendly.

## Technical details
- Update the welcome and introduction presentation to use existing semantic light theme tokens.
- Extend the local profile model and backup/restore compatibility for discovery source and starting level.
- Refactor the existing setup route into the new ordered onboarding sequence, preserving cloud sync and the final dashboard transition.
- Verify welcome, introduction, account handoff, every setup step, back navigation, disabled states, completion, and mobile layout.
