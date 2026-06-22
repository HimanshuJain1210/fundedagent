import { createAdminClient } from "@/lib/supabase";
import { weekOf, groqJSON, groqText } from "@/lib/utils";
import { PROFILE, PM_KEYWORDS } from "@/lib/profile";

export const runtime = "nodejs";
export const maxDuration = 300;

// ---- Find a company's website + careers + ATS via LLM guess, then verify ATS endpoints ----
async function findCareers(companyName: string) {
  const prompt = `Given the startup name "${companyName}", guess its primary website domain and ATS.
Return ONLY JSON:
{ "domain": "example.com or null", "ats_slug": "best guess at their lever/greenhouse/ashby company slug, or null" }
The ats_slug is usually the company name lowercased with no spaces. Return null if you genuinely cannot guess.`;
  return groqJSON(prompt);
}

// Public ATS JSON endpoints — try each, return roles if one responds
async function fetchATSRoles(slug: string) {
  const attempts: { ats: string; url: string }[] = [
    { ats: "greenhouse", url: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs` },
    { ats: "lever", url: `https://api.lever.co/v0/postings/${slug}?mode=json` },
    { ats: "ashby", url: `https://api.ashbyhq.com/posting-api/job-board/${slug}` },
  ];

  for (const a of attempts) {
    try {
      const res = await fetch(a.url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();

      let jobs: { title: string; location: string; url: string }[] = [];
      if (a.ats === "greenhouse" && Array.isArray(data.jobs)) {
        jobs = data.jobs.map((j: any) => ({
          title: j.title, location: j.location?.name || "", url: j.absolute_url,
        }));
      } else if (a.ats === "lever" && Array.isArray(data)) {
        jobs = data.map((j: any) => ({
          title: j.text, location: j.categories?.location || "", url: j.hostedUrl,
        }));
      } else if (a.ats === "ashby" && Array.isArray(data.jobs)) {
        jobs = data.jobs.map((j: any) => ({
          title: j.title, location: j.location || "", url: j.jobUrl,
        }));
      }
      if (jobs.length) return { ats: a.ats, jobs };
    } catch {
      continue;
    }
  }
  return null;
}

function isPMRelevant(title: string): boolean {
  const t = title.toLowerCase();
  return PM_KEYWORDS.some((k) => t.includes(k));
}

// ---- Generate tailored job pitch + partnership angle ----
async function generateOutreach(company: any, roles: any[]) {
  const pmRoles = roles.filter((r) => r.is_pm_relevant).map((r) => r.title);
  const roleLine = pmRoles.length
    ? `They have these PM-relevant openings: ${pmRoles.join(", ")}.`
    : `No PM-specific opening was found, so pitch a speculative/founding-PM angle.`;

  const prompt = `You are writing outreach for a candidate. Be concrete, no corporate filler. ${PROFILE.voice}.

CANDIDATE:
- Target role: ${PROFILE.targetRole}
- Builds: ${PROFILE.offer.builds}
- Expertise: ${PROFILE.offer.expertise}
- Also: ${PROFILE.offer.content}

COMPANY: ${company.name} — sector: ${company.sector}, based: ${company.geo}.
${roleLine}

Write TWO things, separated by the exact line "---SPLIT---":

1. JOB_PITCH: exactly 3 short lines pitching the candidate for a PM role at this company. Reference their sector. No greeting, no signature.

2. PARTNERSHIP_ANGLE: ONE paragraph (max 4 sentences) on how the candidate could partner with this company (product collaboration, AI eval/RAG help, content) given their stage and sector. Specific to this company's sector.

Return ONLY these two blocks separated by ---SPLIT---. No labels, no markdown.`;

  const out = await groqText(prompt);
  if (!out) return null;
  const [pitch, angle] = out.split("---SPLIT---").map((s) => s.trim());
  return { pitch: pitch || null, angle: angle || null };
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.INGEST_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const wk = weekOf();

  // enrich companies that have a round THIS week but no outreach card yet
  const { data: rounds } = await supabase
    .from("funding_rounds")
    .select("company_id, companies(*)")
    .eq("week_of", wk);

  if (!rounds?.length) return Response.json({ ok: true, enriched: 0, note: "no rounds this week" });

  const seen = new Set<string>();
  let enriched = 0, rolesFound = 0;

  for (const row of rounds) {
    const company: any = row.companies;
    if (!company || seen.has(company.id)) continue;
    seen.add(company.id);

    // skip if already has a card
    const { data: existing } = await supabase
      .from("outreach_cards")
      .select("id")
      .eq("company_id", company.id)
      .maybeSingle();
    if (existing) continue;

    // 1. careers + ATS
    const guess = await findCareers(company.name);
    let roleRows: any[] = [];
    let atsType = "unknown";
    let careersUrl: string | null = guess?.domain ? `https://${guess.domain}/careers` : null;

    if (guess?.ats_slug) {
      const atsResult = await fetchATSRoles(guess.ats_slug);
      if (atsResult) {
        atsType = atsResult.ats;
        for (const j of atsResult.jobs.slice(0, 25)) {
          const pm = isPMRelevant(j.title);
          roleRows.push({
            company_id: company.id,
            title: j.title,
            location: j.location,
            url: j.url,
            is_pm_relevant: pm,
          });
        }
      }
    }

    if (roleRows.length) {
      await supabase.from("roles").upsert(roleRows, { onConflict: "company_id,url" });
      rolesFound += roleRows.length;
    }

    // update company meta
    await supabase
      .from("companies")
      .update({
        website: guess?.domain ? `https://${guess.domain}` : null,
        careers_url: careersUrl,
        ats_type: atsType,
        linkedin_url: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company.name)}`,
      })
      .eq("id", company.id);

    // 2. outreach generation
    const outreach = await generateOutreach(company, roleRows);
    const contactPath = `Founder/hiring on LinkedIn: https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company.name + " founder")}`;

    await supabase.from("outreach_cards").upsert(
      {
        company_id: company.id,
        job_pitch: outreach?.pitch || null,
        partnership_angle: outreach?.angle || null,
        contact_path: contactPath,
      },
      { onConflict: "company_id" }
    );
    enriched++;
  }

  return Response.json({ ok: true, week_of: wk, enriched, rolesFound });
}
