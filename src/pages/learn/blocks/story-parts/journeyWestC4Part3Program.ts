export const C4_P3_STORY = [
  'The name card has been hung by the mountain gate, but Wukong still needs to learn to distinguish "when to start." The small flag is Start: it waits for the scene to begin; the fingertip is Tap: it waits for the audience\'s invitation.',
  'Let’s rehearse with paper cards today. When the action card is placed at the wrong entrance, Wukong will rush away; move the entire card to another entrance, and then raise the flag and click the card respectively, so that the two tracks on the ground will not cross.',
] as const;

export const C4_P3_CARDS = [
  { id: 'name', label: 'Name card: I am Sun Wukong', correct: 'start' as const },
  { id: 'turn', label: 'Action Card: Turn', correct: 'tap' as const },
  { id: 'hop', label: 'Action card: Hop step', correct: 'tap' as const },
  { id: 'hide-show', label: 'Action card: Hide → Show', correct: 'tap' as const },
];

export const C4_P3_PREDICTIONS = [
  {
    id: 'cross',
    label:
      'Turning around will lead to a false start when the flag is raised, and the two entrances are mixed together.',
    correct: true,
  },
  {
    id: 'quiet',
    label: 'Both entrances will wait quietly, there will be no difference',
    correct: false,
  },
] as const;

export const C4_P3_TRIGGER_OPTIONS = [
  { id: 'start-waits-scene', label: 'Start Wait for the scene to start', correct: true },
  { id: 'tap-waits-invite', label: 'Tap and other audience invitations', correct: true },
] as const;

export function c4p3AssignmentsDone(assignments: Record<string, string>): boolean {
  return C4_P3_CARDS.every((card) => assignments[card.id] === card.correct);
}

export function c4p3EvidenceDone(assignments: Record<string, string>): boolean {
  return assignments.turn === 'tap' && assignments.name === 'start';
}
