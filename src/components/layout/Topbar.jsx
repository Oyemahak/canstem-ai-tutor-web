"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, signOut } from "@/lib/auth";
import { LogOut, ShieldCheck, GraduationCap, UserCog } from "lucide-react";
import { useEffect, useState } from "react";

function roleIcon(role) {
  if (role === "admin") return <ShieldCheck size={16} />;
  if (role === "teacher") return <UserCog size={16} />;
  return <GraduationCap size={16} />;
}

export default function Topbar({ title, backHref }) {
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  const onLogout = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {backHref ? (
            <Link href={backHref} className="text-sm font-semibold text-slate-700 hover:text-slate-900">
              ← Back
            </Link>
          ) : null}

          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900">{title}</span>
            <span className="text-xs text-slate-500">CanSTEM Education</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {session?.role && (
            <span className="inline-flex items-center gap-2 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 px-3 py-1">
              {roleIcon(session.role)}
              {session.role.toUpperCase()}
            </span>
          )}

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50"
            title="Logout"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}