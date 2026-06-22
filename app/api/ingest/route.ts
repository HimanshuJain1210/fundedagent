import { createAdminClient } from "@/lib/supabase";
import { weekOf, normalize, guidFor, groqJSON } from "@/lib/utils";
import Parser from "rss-parser";

export const runtime = "nodejs";
export const maxDuration = 300;

const parser = new Parser({ timeout: 15000 });

async function extractFunding(title: string, content: string) {
  const prompt = `You extract startup funding events from news text. Return ONLY JSON, no markdown, no preamble.
If the text is NOT about a startup raising funding, return: {"is_funding": false}
If it IS about a startup raising money, return:
{
  "is_funding": true,
  "company": "string",
  "round_type": "pre_seed|seed|series_a|series_b|series_c|growth|debt|unknown",
  "amount_raw": "original amount string or null",
  "amount_usd": number_or_null,
  "currency": "USD|INR|null",
  "sector": "edtech|ai_tools|consumer|fintech|other",
  "geo": "india|global",
  "investors": ["names"]
}
Rules:
- geo = "india" if the startup is headquartered in India, else "global".
- amount_usd: convert to a plain number in USD (₹1 Cr ≈ 120000 USD). null if unknown.
- Only set is_funding true for a company RAISING capital, not VC fund closes or M&A.

Text:
Title: ${title}
${content.slice(0, 1500)}`;
  return groqJSON(prompt);
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.INGEST_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: feeds } = await supabase
    .from("sources")
    .select("*")
    .eq("active", true)
    .eq("source_type", "rss");

  if (!feeds?.length) return Response.json({ error: "no active feeds" }, { status: 500 });

  const wk = weekOf();
  let processed = 0, fundingFound = 0, skipped = 0, feedErrors = 0;

  for (const feed of feeds) {
    let parsed;
    try {
      parsed = await parser.parseURL(feed.url);
    } catch (e) {
      console.error(`feed failed: ${feed.name}`, e);
      feedErrors++;
      continue;
    }

    for (const item of parsed.items.slice(0, 30)) {
      const guid = guidFor(item);

      const { data: seen } = await supabase
        .from("ingested_items")
        .select("id")
        .eq("source_id", feed.id)
        .eq("item_guid", guid)
        .maybeSingle();
      if (seen) { skipped++; continue; }

      await supabase.from("ingested_items").insert({ source_id: feed.id, item_guid: guid });
      processed++;

      const content = item.contentSnippet || (item as any).content || (item as any).summary || "";
      const fund = await extractFunding(item.title || "", content);
      if (!fund?.is_funding || !fund.company) continue;

      const norm = normalize(fund.company);
      if (!norm) continue;

      const { data: company } = await supabase
        .from("companies")
        .upsert(
          { name: fund.company, normalized_name: norm, sector: fund.sector, geo: fund.geo },
          { onConflict: "normalized_name" }
        )
        .select()
        .single();
      if (!company) continue;

      const { error: roundErr } = await supabase.from("funding_rounds").insert({
        company_id: company.id,
        round_type: fund.round_type,
        amount_usd: fund.amount_usd,
        amount_raw: fund.amount_raw,
        currency: fund.currency,
        announced_date: item.isoDate ? item.isoDate.slice(0, 10) : null,
        week_of: wk,
        investors: fund.investors || [],
        source_id: feed.id,
        source_url: item.link,
        raw_excerpt: content.slice(0, 500),
      });
      if (!roundErr) fundingFound++;
    }
  }

  return Response.json({ ok: true, week_of: wk, processed, fundingFound, skipped, feedErrors });
}
