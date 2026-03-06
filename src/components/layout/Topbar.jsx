// src/components/layout/Topbar.jsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logout, me } from "@/lib/authClient";
import { LogOut } from "lucide-react";

function getDisplayName(user) {
  if (!user) return "";
  const name = String(user.name || "").trim();
  if (name) return name;

  const email = String(user.email || "").trim();
  if (email.includes("@")) return email.split("@")[0];
  return email || "User";
}

function getRoleLabel(user) {
  const role = String(user?.role || "").trim();
  return role ? role.toUpperCase() : "";
}

export default function Topbar({ title, backHref }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    let alive = true;
    me()
      .then((r) => alive && setUser(r?.user || null))
      .catch(() => alive && setUser(null));
    return () => {
      alive = false;
    };
  }, []);

  const headerTitle = useMemo(() => {
    // ✅ Main title should be user name (fallback to passed title if user not loaded yet)
    const name = getDisplayName(user);
    return name || title || "CanSTEM Portal";
  }, [user, title]);

  const subtitle = useMemo(() => {
    // ✅ Subtitle should be: ROLE • CanSTEM Education
    const role = getRoleLabel(user);
    return role ? `${role} • CanSTEM Education` : "CanSTEM Education";
  }, [user]);

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          {backHref ? (
            <Link href={backHref} className="text-sm font-semibold text-slate-700 hover:text-slate-900">
              ← Back
            </Link>
          ) : null}

          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/canstem-logo.png"
              alt="CanSTEM Education"
              width={80}
              height={80}
              className="rounded-xl border bg-white object-contain"
              priority
            />

            <div className="min-w-0">
              {/* ✅ Title = user name */}
              <div className="text-sm font-extrabold text-slate-900 truncate">{headerTitle}</div>
              {/* ✅ Subtitle = role + CanSTEM */}
              <div className="text-xs text-slate-500 truncate">{subtitle}</div>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}