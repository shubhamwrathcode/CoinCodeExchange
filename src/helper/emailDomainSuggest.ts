/** Popular domains for @-suffix autocomplete (parity with web EmailInputWithDomainSuggest). */

export const POPULAR_EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "hotmail.com",
  "icloud.com",
  "protonmail.com",
  "live.com",
  "msn.com",
  "aol.com",
  "zoho.com",
  "gmx.com",
  "me.com",
  "ymail.com",
  "comcast.net",
  "verizon.net",
  "yandex.com",
  "mail.com",
  "inbox.com",
  "gmx.net",
  "tutanota.com",
] as const;

export function getEmailDomainSuggestions(value: string): string[] {
  const s = String(value || "");
  const at = s.indexOf("@");
  if (at < 0) return [];
  if (s.indexOf("@", at + 1) >= 0) return [];
  const afterAt = s.slice(at + 1);
  if (/\s/.test(afterAt)) return [];
  const q = afterAt.toLowerCase();
  if ((POPULAR_EMAIL_DOMAINS as readonly string[]).includes(q)) return [];
  if (q === "") {
    return [...POPULAR_EMAIL_DOMAINS];
  }
  return POPULAR_EMAIL_DOMAINS.filter((d) => d.startsWith(q));
}
