/** `263771234567@c.us` → `263771234567` */
export function digitsFromWhatsAppId(waId) {
  return String(waId ?? "").replace(/@.*$/, "").replace(/\D/g, "");
}

/** Candidate keys for matching `profiles.whatsapp_phone`. */
export function phoneMatchCandidates(digits) {
  const d = digitsFromWhatsAppId(digits);
  if (!d) return [];
  const set = new Set([d]);
  if (d.startsWith("0") && d.length >= 9) set.add("263" + d.slice(1));
  if (d.startsWith("263") && d.length > 3) set.add("0" + d.slice(3));
  if (d.length >= 9) set.add(d.slice(-9));
  return [...set];
}
