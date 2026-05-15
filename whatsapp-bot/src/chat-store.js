const MAX_TURNS = 8;

/** @type {Map<string, { role: 'user'|'assistant', content: string }[]>} */
const sessions = new Map();

export function getHistory(chatId) {
  return sessions.get(chatId) ?? [];
}

export function appendTurn(chatId, role, content) {
  const prev = sessions.get(chatId) ?? [];
  const next = [...prev, { role, content }].slice(-MAX_TURNS * 2);
  sessions.set(chatId, next);
}
