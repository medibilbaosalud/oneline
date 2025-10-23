const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "protonmail.com",
  "pm.me",
  "fastmail.com",
];

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    const aCode = a.charCodeAt(i - 1);

    for (let j = 1; j <= b.length; j += 1) {
      const cost = aCode === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

export function getEmailHint(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const [local, domainRaw] = trimmed.split("@");
  if (!local || !domainRaw) return null;

  const domain = domainRaw.toLowerCase();
  if (!domain) return null;

  if (!domain.includes(".")) {
    return "This email domain looks incomplete. Double-check for typos.";
  }

  const labels = domain.split(".");
  if (labels.some((part) => part.length === 0)) {
    return "This email domain looks incomplete. Double-check for typos.";
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2) {
    return "This email domain looks incomplete. Double-check for typos.";
  }

  if (COMMON_EMAIL_DOMAINS.includes(domain)) {
    return null;
  }

  let bestMatch: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of COMMON_EMAIL_DOMAINS) {
    const distance = levenshtein(domain, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  if (bestMatch && bestDistance <= 2) {
    return `Did you mean ${local}@${bestMatch}?`;
  }

  return null;
}
