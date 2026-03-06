"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/authClient";
import { GraduationCap, UserCog, ShieldCheck } from "lucide-react";

const TABS = [
  { key: "student", label: "Student", icon: GraduationCap, demo: "student@canstemeducation.com" },
  { key: "teacher", label: "Teacher", icon: UserCog, demo: "teacher@canstemeducation.com" },
  { key: "admin", label: "Admin", icon: ShieldCheck, demo: "admin@canstemeducation.com" },
];

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "";

  const [tab, setTab] = useState("student");
  const [email, setEmail] = useState("student@canstemeducation.com");
  const [password, setPassword] = useState("CanSTEM@123");
  const [error, setError] = useState("");

  const demoEmail = useMemo(() => TABS.find((t) => t.key === tab)?.demo, [tab]);

  useEffect(() => {
    setEmail(demoEmail || "");
    setPassword("CanSTEM@123");
    setError("");
  }, [demoEmail]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await login(email, password); // { ok, user }
      const role = res?.user?.role;

      // Optional: if user picked wrong tab, still allow login but tell them
      if (role && role !== tab) {
        // just route based on actual role
      }

      if (next) return router.replace(next);

      if (role === "admin") return router.replace("/admin");
      if (role === "teacher") return router.replace("/teacher");
      return router.replace("/student/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">CanSTEM AI Tutor</h1>
          <p className="text-sm text-slate-600 mt-1">Login (now connected to backend).</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 transition
                ${active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"}`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-white font-semibold hover:bg-slate-800 transition"
          >
            Continue
          </button>

          <p className="text-xs text-slate-500 text-center">
            Demo accounts (seeded in DB). Password: <b>CanSTEM@123</b>
          </p>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}