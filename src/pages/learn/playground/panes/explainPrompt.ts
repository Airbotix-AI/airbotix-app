// The "✨ Explain this" prompt builder — moved verbatim out of Workspace.tsx so
// non-component code (the try-demo scripted agent matches the exact prompt the
// real toolbar sends) can share it without importing the whole workspace tree.

/** Cap a selected snippet so the chat bubble + prompt stay reasonable — the
 *  backend already has the whole file as context, so the snippet only points the
 *  agent at WHICH code to explain. */
export const MAX_EXPLAIN_CHARS = 1200;

/** Build the kid-friendly "explain this selection" prompt. Asks for a plain answer
 *  and tells the agent NOT to edit — an explain must never change the game. */
export function buildExplainPrompt(code: string): string {
  const trimmed = code.trim();
  const snippet =
    trimmed.length > MAX_EXPLAIN_CHARS ? `${trimmed.slice(0, MAX_EXPLAIN_CHARS)}\n…` : trimmed;
  return `Explain what this code does in simple words — don't change my game:\n\n${snippet}`;
}
