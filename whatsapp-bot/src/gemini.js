const SYSTEM_BASE = `You are Murimi, a warm WhatsApp farm assistant for Verdant (Southern Africa friendly).
Reply in short WhatsApp messages: plain text, use *bold* sparingly, no markdown headers.
Use the LIVE FARM DATA block as ground truth for crops, stages, health %, moisture, and alerts.
If data is missing, say so honestly. Never invent sensor readings.
Tone: respectful, practical, concise. You may open with a brief Shona greeting when natural, then English.
Remind users your advice supports—not replaces—local agronomists and product labels.`;

export async function replyWithGemini({ apiKey, model, farmContextText, history, userMessage }) {
  const contents = [];
  for (const m of history) {
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: `${SYSTEM_BASE}\n\n--- LIVE FARM DATA ---\n${farmContextText}` }],
      },
      contents,
      generationConfig: { maxOutputTokens: 700, temperature: 0.5 },
    }),
  });

  const raw = await res.text();
  if (!res.ok) return { error: `gemini_${res.status}` };

  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: "gemini_json" };
  }

  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) return { error: "gemini_empty" };
  return { text };
}

export function fallbackReply(userMessage) {
  const last = userMessage.toLowerCase();

  if (/irrigat|water|moist|dry|rain/.test(last)) {
    return `Water stress often shows in probes before the crop wilts. With your current moisture readings, consider shorter, more frequent irrigations if the forecast is dry. Tell me drip vs pivot and I can narrow timing.`;
  }
  if (/disease|pest|fungus|blight|worm/.test(last)) {
    return `Scout lower leaves and field edges first. Note spot pattern (random vs uniform) and send a clear photo if you can. I can suggest what to rule in before you call extension.`;
  }
  if (/maize|tomato|wheat|crop|stage/.test(last)) {
    return `Each growth stage has different water and nutrient needs. Say *summary* for your live crop stage and health % from the dashboard.`;
  }

  return `Thank you, murimi. Say *hoi* or *summary* for your farm snapshot, or ask about irrigation, pests, or crop stage.`;
}
