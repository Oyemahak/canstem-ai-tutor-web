"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { me } from "@/lib/authClient";

export default function RequireAuth({ allow = [], children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const res = await me(); // { ok:true, user:{...} }
        const role = res?.user?.role;

        if (!role) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        if (allow.length && !allow.includes(role)) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        if (mounted) setLoading(false);
      } catch (e) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [allow, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-sm text-slate-600">Loading…</div>
      </div>
    );
  }

  return children;
}