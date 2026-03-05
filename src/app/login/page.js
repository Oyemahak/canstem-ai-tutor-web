"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROLES, signIn } from "@/lib/auth";
import { GraduationCap, UserCog, ShieldCheck } from "lucide-react";

const ROLE_TABS = [
  { role: ROLES.STUDENT, label: "Student", icon: GraduationCap },
  { role: ROLES.TEACHER, label: "Teacher", icon: UserCog },
  { role: ROLES.ADMIN, label: "Admin", icon: ShieldCheck },
];

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "";

  const [role, setRole] = useState(ROLES.STUDENT);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const demo = useMemo(() => {
    if (role === ROLES.TEACHER) return { email: "teacher@canstemeducation.com", pass: "CanSTEM@123" };
    if (role === ROLES.ADMIN) return { email: "admin@canstemeducation.com", pass: "CanSTEM@123" };
    return { email: "student@canstemeducation.com", pass: "CanSTEM@123" };
  }, [role]);

  // ✅ Auto-fill demo creds whenever role changes
  useEffect(() => {
    setEmail(demo.email);
    setPassword(demo.pass);
    setError("");
  }, [demo.email, demo.pass]);

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    const res = signIn({ role, email, password });
    if (!res.ok) {
      setError(res.error);
      return;
    }

    if (next) {
      router.replace(next);
      return;
    }

    if (role === ROLES.ADMIN) router.replace("/admin");
    else if (role === ROLES.TEACHER) router.replace("/teacher");
    else router.replace("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border border-slate-200 p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">CanSTEM AI Tutor</h1>
          <p className="text-sm text-slate-600 mt-1">
            Voice-first tutor portal. Choose your role to login.
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {ROLE_TABS.map((t) => {
            const Icon = t.icon;
            const active = role === t.role;
            return (
              <button
                key={t.role}
                type="button"
                onClick={() => setRole(t.role)}
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
            Demo login for frontend testing only. Later: Google SSO (students-only by domain).
          </p>

          <div className="text-xs text-slate-500 text-center">
            Demo: <b>{demo.email}</b> / <b>{demo.pass}</b>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  // ✅ Suspense wrapper avoids Next warnings/issues with useSearchParams
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}