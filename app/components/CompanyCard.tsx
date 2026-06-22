"use client";

import { useState } from "react";

type Role = { title: string; location: string; url: string; is_pm_relevant: boolean };
type Card = { job_pitch: string | null; partnership_angle: string | null; contact_path: string | null };
export type CompanyData = {
  id: string;
  name: string;
  sector: string | null;
  geo: "india" | "global" | null;
  website: string | null;
  careers_url: string | null;
  linkedin_url: string | null;
  amount_raw: string | null;
  round_type: string | null;
  source_url: string | null;
  roles: Role[];
  card: Card | null;
};

export default function CompanyCard({ c }: { c: CompanyData }) {
  const [open, setOpen] = useState(false);
  const pmRoles = c.roles.filter((r) => r.is_pm_relevant);
  const hasPM = pmRoles.length > 0;

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen(!open)}>
        <div>
          <div className="cname">{c.name}</div>
          <div className="cmeta">
            {c.geo && <span className={`tag ${c.geo}`}>{c.geo}</span>}
            {c.sector && <span className="tag">{c.sector.replace("_", " ")}</span>}
            {c.round_type && <span className="tag">{c.round_type.replace("_", " ")}</span>}
            {c.amount_raw && <span className="tag amount">{c.amount_raw}</span>}
          </div>
        </div>
        <div className="cright">
          {hasPM && <span className="pmflag">★ {pmRoles.length} PM role{pmRoles.length > 1 ? "s" : ""}</span>}
          <span className={`chev mono ${open ? "open" : ""}`}>▸</span>
        </div>
      </div>

      {open && (
        <div className="card-body">
          {/* LEFT: the way in */}
          <div className="panel-block">
            <div className="block-label">Job pitch</div>
            {c.card?.job_pitch ? (
              c.card.job_pitch.split("\n").filter(Boolean).map((line, i) => (
                <p key={i} className="pitch-line">{line}</p>
              ))
            ) : (
              <p className="empty">No pitch generated.</p>
            )}

            <div className="block-label" style={{ marginTop: 18 }}>Partnership angle</div>
            {c.card?.partnership_angle ? (
              <p className="angle">{c.card.partnership_angle}</p>
            ) : (
              <p className="empty">No angle generated.</p>
            )}

            <div className="links">
              {c.linkedin_url && <a className="linkbtn" href={c.linkedin_url} target="_blank" rel="noopener">company ↗</a>}
              {c.card?.contact_path && (
                <a className="linkbtn" href={c.card.contact_path.split(": ").slice(1).join(": ")} target="_blank" rel="noopener">founder ↗</a>
              )}
              {c.source_url && <a className="linkbtn" href={c.source_url} target="_blank" rel="noopener">funding news ↗</a>}
            </div>
          </div>

          {/* RIGHT: open roles */}
          <div className="panel-block">
            <div className="block-label">Open roles {c.roles.length ? `(${c.roles.length})` : ""}</div>
            {c.roles.length ? (
              <div className="rolelist">
                {[...pmRoles, ...c.roles.filter((r) => !r.is_pm_relevant)].slice(0, 12).map((r, i) => (
                  <div key={i} className={`role ${r.is_pm_relevant ? "pm" : ""}`}>
                    <span>{r.is_pm_relevant ? "★ " : ""}{r.title}</span>
                    <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {r.location && <span className="role-loc">{r.location}</span>}
                      <a href={r.url} target="_blank" rel="noopener">open ↗</a>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="empty">No roles auto-detected.</p>
                {c.careers_url && (
                  <div className="links">
                    <a className="linkbtn" href={c.careers_url} target="_blank" rel="noopener">try careers page ↗</a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
