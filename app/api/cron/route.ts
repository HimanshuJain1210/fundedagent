import { createAdminClient } from "@/lib/supabase";
import { weekOf } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

// Vercel Cron sends a GET with this header automatically.
function authorized(req: Request): boolean {
  const cronHeader = req.headers.get("authorization");
  return cronHeader === `Bearer ${process.env.CRON_SECRET}`;
}

async function callRoute(path: string, base: string) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${process.env.INGEST_SECRET}` },
  });
  return res.json().catch(() => ({ error: "non-json response" }));
}

async function sendDigest(base: string) {
  const supabase = createAdminClient();
  const wk = weekOf();

  const { data: rounds } = await supabase
    .from("funding_rounds")
    .select("amount_raw, round_type, companies(name, sector, geo)")
    .eq("week_of", wk)
    .order("amount_usd", { ascending: false, nullsFirst: false })
    .limit(40);

  const count = rounds?.length || 0;
  const rows = (rounds || [])
    .map((r: any) => {
      const c = r.companies;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee"><b>${c?.name || "?"}</b></td>
        <td style="padding:8px;border-bottom:1px solid #eee">${c?.sector || ""}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${c?.geo || ""}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${r.round_type || ""}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${r.amount_raw || ""}</td>
      </tr>`;
    })
    .join("");

  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:680px;margin:0 auto">
    <h2 style="margin-bottom:4px">Funded this week — ${wk}</h2>
    <p style="color:#666;margin-top:0">${count} companies. Open the dashboard for tailored pitches + open roles.</p>
    <a href="${base}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;margin:8px 0">Open dashboard →</a>
    <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:12px">
      <thead><tr style="text-align:left;color:#888">
        <th style="padding:8px">Company</th><th style="padding:8px">Sector</th>
        <th style="padding:8px">Geo</th><th style="padding:8px">Round</th><th style="padding:8px">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;

  // Resend API
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM,
      to: process.env.DIGEST_TO,
      subject: `Funded this week — ${count} companies (${wk})`,
      html,
    }),
  });
  return { emailSent: res.ok, count };
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL!;
  const ingest = await callRoute("/api/ingest", base);
  const enrich = await callRoute("/api/enrich", base);
  const digest = await sendDigest(base);

  return Response.json({ ok: true, ingest, enrich, digest });
}
