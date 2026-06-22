"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "signing" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const supabase = createBrowserClient();

  async function signIn() {
    if (!email || !password) return;
    setStatus("signing");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrMsg(error.message || "Sign in failed.");
      setStatus("error");
    } else {
      window.location.href = "/";
    }
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
          onKeyDown={(e) => e.key === "Enter" && signIn()}
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
        />
        <button onClick={signIn} disabled={status === "signing" || !email || !password}>
          {status === "signing" ? "signing in…" : "sign in"}
        </button>
        {status === "error" && <div className="login-msg err">{errMsg}</div>}
      </div>
    </div>
  );
}
