const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) (instructions|rules)/i,
  /system prompt/i,
  /developer message/i,
  /reveal.*(secret|token|password|key)/i,
  /send.*(credential|oauth|refresh token)/i,
  /act as (admin|root|developer)/i,
  /bypass.*(policy|approval|safety)/i
];

export function detectPromptInjection(text: string): string[] {
  return INJECTION_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export function sanitizeForPrompt(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/\b(?:sk|ghp|xoxb|ya29)[A-Za-z0-9_\-]{16,}\b/g, "[secret]")
    .slice(0, 6000);
}
