const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_REGEX = /\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

export function sanitizeConsentHtml(html: string): string {
  return html.replace(SCRIPT_TAG_REGEX, "").replace(EVENT_HANDLER_REGEX, "");
}
