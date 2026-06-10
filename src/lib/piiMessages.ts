/**
 * Kid-facing PII warn messages (pii-protection §5).
 * Two age variants — "young" covers early/core_a (< 12), "older" covers early_b/late_b (12+).
 * Used by PiiWarnModal to select the right message for the detected category.
 */
const PII_WARN_COPY: Record<string, { young: string; older: string; title: string }> = {
  kid_real_name: {
    title: 'Your name',
    young: "Looks like you're using your real name — it's safer to say 'me' instead 😊",
    older: "Looks like you're using your name a lot — try 'me' for privacy.",
  },
  kid_address: {
    title: 'Your address',
    young: "Let's not share where you live — keep it secret! 🤐 Try a made-up place?",
    older: "Keep your address private — don't include it in your prompt.",
  },
  kid_phone: {
    title: 'A phone number',
    young: 'Phone numbers should stay private. Skip that bit?',
    older: 'Phone numbers should stay out of prompts. Remove it and try again.',
  },
  kid_email: {
    title: 'An email address',
    young: "Email addresses should stay private. Try just 'my email'?",
    older: "Keep email addresses private — use 'my email' instead.",
  },
  kid_school: {
    title: 'Your school name',
    young: "Let's not name your school — try 'my school' instead 🤫",
    older: "Keep your school name private — try 'my school' instead.",
  },
  kid_dob: {
    title: 'Your birthday',
    young: "Best to keep your birthday private! You can say 'my birthday' instead.",
    older: "Dates of birth are private — remove it from your prompt.",
  },
  parent_name: {
    title: "A parent's name",
    young: "Let's keep grown-ups' names out of here — try 'my mum' or 'my dad' 😊",
    older: "Keep adult names private — try 'my mum' or 'my dad' instead.",
  },
  parent_email: {
    title: "A parent's contact info",
    young: "Mum and Dad's contact info is private — let's not share it!",
    older: "Parent contact details should stay private. Remove them.",
  },
  parent_phone: {
    title: "A parent's contact info",
    young: "Mum and Dad's contact info is private — let's not share it!",
    older: "Parent contact details should stay private. Remove them.",
  },
  api_key: {
    title: 'A secret key',
    young: "That looks like a secret password — never share those, even with AI! 🔐",
    older: 'That looks like an API key — keep those private. Use a placeholder instead.',
  },
  password: {
    title: 'A password',
    young: "Looks like a password — keep those secret! Use 'PASSWORD' as a placeholder.",
    older: "Looks like a password — don't include real passwords. Use a placeholder.",
  },
  private_key: {
    title: 'A private key',
    young: "That's a secret key — keep it private! 🔐",
    older: 'Private keys should never be shared. Remove it.',
  },
};

const DEFAULT_COPY = {
  title: 'Personal info',
  young: "That might include some personal info — double-check before sending?",
  older: "That looks like it might contain personal info — review before sending.",
};

/** Return title + message for the first detected category. */
export function piiWarnCopy(
  categories: string[] | undefined,
  isYoung: boolean,
): { title: string; body: string } {
  const first = categories?.[0];
  const copy = (first ? PII_WARN_COPY[first] : undefined) ?? DEFAULT_COPY;
  return { title: copy.title, body: isYoung ? copy.young : copy.older };
}
