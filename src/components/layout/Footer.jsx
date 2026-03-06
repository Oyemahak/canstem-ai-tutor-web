// src/components/layout/Footer.jsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-xs text-slate-600 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
        <div>© 2026 CanSTEM Education Private School Inc. All Rights Reserved.</div>
      </div>
    </footer>
  );
}