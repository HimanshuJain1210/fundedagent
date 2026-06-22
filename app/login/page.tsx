"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const supabase = createBrowserClient();

  async function sendLink() {
    if (!email) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>funded<span style={{ color: "var(--accent)" }}>.</span></h1>
        <p>Weekly intel on newly funded startups — with a tailored way in. Sign in to view this week&apos;s board.</p>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendLink()}
        />
        <button onClick={sendLink} disabled={status === "sending" || !email}>
          {status === "sending" ? "sending…" : "send magic link"}
        </button>
        {status === "sent" && <div className="login-msg ok">Link sent. Check your inbox.</div>}
        {status === "error" && <div className="login-msg err">Couldn&apos;t send. Check the email and try again.</div>}
      </div>
    </div>
  );
}
