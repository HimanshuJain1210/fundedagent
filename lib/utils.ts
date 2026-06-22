import crypto from "crypto";

// Monday of the given week (UTC), as YYYY-MM-DD
export function weekOf(d = new Date()): string {
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

// Normalize a company name for dedup
export function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|ltd|pvt|llc|technologies|labs|corp|co)\b/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function guidFor(item: any): string {
  return (
    item.guid ||
    crypto.createHash("sha1").update(item.link || item.title || "").digest("hex")
  );
}

// Call Groq with a JSON-only prompt, return parsed object or null
export async function groqJSON(prompt: string): Promise<any | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return null;
  }
}

// Call Groq for free-text (pitches), return string or null
export async function groqText(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices[0].message.content?.trim() || null;
  } catch {
    return null;
  }
}
