"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import CompanyCard, { CompanyData } from "./components/CompanyCard";

type Geo = "all" | "india" | "global";

export default function Dashboard() {
  const supabase = createBrowserClient();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<Geo>("all");
  const [onlyPM, setOnlyPM] = useState(false);
  const [week, setWeek] = useState<string>("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    // latest week present in the data
    const { data: latest } = await supabase
      .from("funding_rounds")
      .select("week_of")
      .order("week_of", { ascending: false })
      .limit(1);
    const wk = latest?.[0]?.week_of;
    setWeek(wk || "");
    if (!wk) { setCompanies([]); setLoading(false); return; }

    const { data: rounds } = await supabase
      .from("funding_rounds")
      .select(`
        amount_raw, round_type, source_url,
        companies (
          id, name, sector, geo, website, careers_url, linkedin_url,
          roles ( title, location, url, is_pm_relevant ),
          outreach_cards ( job_pitch, partnership_angle, contact_path )
        )
      `)
      .eq("week_of", wk)
      .order("amount_usd", { ascending: false, nullsFirst: false });

    const mapped: CompanyData[] = (rounds || [])
      .map((r: any) => {
        const c = r.companies;
        if (!c) return null;
        return {
          id: c.id,
          name: c.name,
          sector: c.sector,
          geo: c.geo,
          website: c.website,
          careers_url: c.careers_url,
          linkedin_url: c.linkedin_url,
          amount_raw: r.amount_raw,
          round_type: r.round_type,
          source_url: r.source_url,
          roles: c.roles || [],
          card: c.outreach_cards?.[0] || null,
        };
      })
      .filter(Boolean) as CompanyData[];

    // dedup by company id (a company could have >1 round row)
    const seen = new Set<string>();
    const unique = mapped.filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));

    setCompanies(unique);
    setLoading(false);
  }

  const filtered = companies.filter((c) => {
    if (geo !== "all" && c.geo !== geo) return false;
    if (onlyPM && !c.roles.some((r) => r.is_pm_relevant)) return false;
    return true;
  });

  return (
    <>
      <div className="topbar">
        <div className="wrap topbar-inner">
          <div className="brand">
            funded<span className="dot">.</span>
            <span className="sub">weekly intel</span>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="controls">
          <div className="seg">
            <button className={geo === "all" ? "on" : ""} onClick={() => setGeo("all")}>all</button>
            <button className={geo === "india" ? "on" : ""} onClick={() => setGeo("india")}>india</button>
            <button className={geo === "global" ? "on" : ""} onClick={() => setGeo("global")}>global</button>
          </div>
          <div className="seg">
            <button className={onlyPM ? "on" : ""} onClick={() => setOnlyPM(!onlyPM)}>★ PM roles only</button>
          </div>
          <div className="spacer" />
          {week && <span className="weekpill">week of {week}</span>}
        </div>

        <div className="list">
          {loading ? (
            <div className="state">loading board…</div>
          ) : filtered.length === 0 ? (
            <div className="state">
              {companies.length === 0
                ? "no funding data yet — run the agent to populate this week."
                : "no companies match these filters."}
            </div>
          ) : (
            filtered.map((c) => <CompanyCard key={c.id} c={c} />)
          )}
        </div>
      </div>
    </>
  );
}
