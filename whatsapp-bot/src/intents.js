export function isGreeting(text) {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/^(hoi|hoy|hey|hi|hello|howdy|mhoro|makadii|good\s+(morning|afternoon|evening)|morning|afternoon)\b/.test(t)) {
    return true;
  }
  if (/^(hoi|hi|hey)[\s!?.]*$/.test(t)) return true;
  return false;
}

export function wantsSummary(text) {
  return /\b(summary|stats|status|farm|plots|overview|update)\b/i.test(text);
}

export function isHelp(text) {
  return /^(help|\?|menu)\s*$/i.test(text.trim());
}

export function helpReply() {
  return (
    `*Murimi WhatsApp commands*\n\n` +
    `• *hoi* / *hello* — greeting + farm snapshot\n` +
    `• *summary* — same farm overview\n` +
    `• Ask in plain language: irrigation, pests, crop stage, alerts\n\n` +
    `Data comes from your Verdant workspace (farms, plots, sensors).`
  );
}
