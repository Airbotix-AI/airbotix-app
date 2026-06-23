# Teacher Guide: AI Rhythm Game Lab

## Session Snapshot

- Duration: 90 minutes
- Group size: 6 students
- Structure: 3 pairs
- Target: Australian junior high, Years 7-9
- Tool: Airbotix Game Playground
- Theme: original pop-star monster-battle rhythm game
- Final outcome: playable 30-60 second prototype plus 1-minute pair showcase

## Teacher Goals

- Keep students building within the first 10 minutes.
- Keep scope tight enough that every pair gets a working game.
- Make AI literacy visible: prompt, inspect, test, improve.
- Keep the theme original and school-safe.
- Avoid passive demo time. Students should spend most of the session making and
  testing.

## Roles

Each pair has two rotating roles:

- Designer/prompter: writes the prompt, decides the next change.
- Tester/documenter: presses Play, watches for bugs, records feedback.

Swap roles at 35 minutes and 65 minutes.

## Minute-By-Minute Run Sheet

### 0-5: Welcome And Challenge

Teacher says:

"Today you will build a short rhythm battle game. Your player is an original pop
hero on a concert stage. The rivals are shadow beats or fantasy stage monsters.
You win through rhythm, timing, combos, and smart design."

Success definition:

- It can be played.
- The rhythm mechanic is obvious.
- The player gets feedback.
- The idea is original.

### 5-10: Responsible AI And Originality

Teacher says:

"We can be inspired by trends, but we do not copy. No real movie names, character
names, lyrics, songs, logos, screenshots, or exact costumes. AI is the assistant;
you are the designer."

Quick check:

Ask each pair to rename the theme in their own words. Examples:

- Neon Stage Hunters
- Shadow Beat Showdown
- Combo Stars
- Beat Quest Arena

### 10-18: Rhythm Game Deconstruction

On the projector, show a simple rhythm-game diagram:

- Beat: when the action should happen.
- Input: key press or tap.
- Timing window: perfect, good, miss.
- Score: points for success.
- Feedback: flash, sound, animation, combo.
- Difficulty: speed, number of notes, pattern complexity.

Teacher question:

"If a player misses a beat, how should the game tell them quickly?"

Expected answers:

- Colour flash.
- Miss text.
- Combo resets.
- Sound cue.
- Boss gains energy.

### 18-25: Pair Planning

Each pair fills a design card:

- Game title.
- Hero type.
- Rival type.
- 3 dance moves or inputs.
- Beat pattern.
- Scoring rule.
- One special feature.

Teacher approval criteria:

- Original names and visuals.
- No copied songs or lyrics.
- Achievable in 90 minutes.
- Clear core input loop.

### 25-35: Build Sprint 1A

Students open Game Playground and enter the first prompt.

Recommended first prompt:

```text
Create a simple Phaser rhythm dancing game called [TITLE]. The player is an
original pop-stage hero facing shadow beat monsters. Use arrow keys for four
dance moves. Notes fall toward a timing line. Give points for correct timing,
show Perfect / Good / Miss feedback, track combo, and make a 45 second round.
Keep all characters and visuals original and school-safe.
```

Teacher actions:

- Move pairs into Split layout if useful.
- Ensure each pair opens Game Runner.
- Have pairs press Play quickly.
- If a pair over-customises, bring them back to the core loop.

### 35-45: Build Sprint 1B

Students ask the AI for one concrete fix or improvement.

Good prompts:

```text
Make the notes easier to hit by increasing the timing window and slowing the
first 15 seconds.
```

```text
Add colourful hit and miss feedback when the player presses an arrow key.
```

```text
Add a combo counter that resets after a miss.
```

Avoid:

- "Make it better."
- "Make it like [movie title]."
- "Add everything."

Teacher check:

Ask, "What changed after your prompt, and how do you know?"

### 45-50: Checkpoint 1

Each pair shows 20 seconds.

Teacher uses this checklist:

- Can I start the game?
- Do I know what to press?
- Does the game respond to hits and misses?
- Is there a score or combo?
- Is the theme original?

Fast verbal feedback:

- "Keep this."
- "Fix this first."

### 50-65: Build Sprint 2

Each pair chooses one extension only:

- Boss health bar.
- Power move after 5 combo.
- Difficulty ramp.
- Stage light animation.
- More precise beat timing.
- Original generated stage or character asset.
- Better sound cue.
- End screen with score rank.

Extension prompts:

```text
Add a boss health bar. Each Perfect hit lowers the boss health. When health
reaches zero, show a win screen with the final combo.
```

```text
Add a power move that activates after a 5 combo and clears the next three notes.
```

```text
Generate an original neon concert stage background with no text, no logos, and
no copied characters.
```

Teacher reminder:

"Polish the game you have. Do not restart unless it is unplayable."

### 65-75: Peer Playtest

Pairs rotate to another device.

Feedback card:

- One thing that worked.
- One thing that confused me.
- One improvement for fun or fairness.

Tester rules:

- Do not change the other pair's game.
- Be specific.
- Focus on playability before decoration.

### 75-83: Final Polish

Each pair makes one practical improvement from peer feedback.

Teacher triage:

- If game does not run: fix start/play first.
- If game runs but unclear: improve instructions and feedback.
- If game is too hard: slow notes or widen timing.
- If game is too plain: add one visual effect.

### 83-88: Showcase

Each pair gets 1 minute:

- Game title.
- What the player does.
- Best AI prompt they used.
- One change they made after testing.

Optional awards:

- Best Beat Sync.
- Best Stage Design.
- Best Boss Battle.
- Most Improved.
- Funniest Original Character.

### 88-90: Exit Reflection

Students answer verbally or on a card:

- What did AI help you create?
- What did you have to judge or change yourself?
- How did you keep the game original?

## Teacher Troubleshooting

If students get stuck on prompt writing:

Use this pattern:

```text
Change [specific thing] so that [player experience]. Keep [working feature] the
same.
```

Example:

```text
Change the note speed so the first level is easier. Keep the score, combo, and
hit feedback the same.
```

If the game has errors:

- Open Game Runner console.
- Use the error location if available.
- Ask AI to fix the specific error.
- Press Play after the fix.

If students copy the film too directly:

Teacher says:

"That is too close. Change three things: the name, the visual design, and the
story role. Make it yours."

If students feel embarrassed presenting:

- Let them demo in pairs.
- Let the tester play while the designer speaks.
- Use awards that recognise effort and improvement, not only polish.

## Assessment Rubric

Use a simple 4-point scale.

1. Emerging: idea exists but not yet playable.
2. Developing: playable loop with limited feedback.
3. Achieved: playable rhythm game with score, feedback, and original theme.
4. Extended: balanced difficulty, polished feedback, and evidence of iteration.

Assess:

- Original concept.
- Rhythm mechanic.
- Player feedback.
- Iteration after testing.
- Responsible AI use.
- Teamwork.
