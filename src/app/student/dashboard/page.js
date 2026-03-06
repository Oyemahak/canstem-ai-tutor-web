// src/app/student/dashboard/page.js
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/auth/RequireAuth";
import Topbar from "@/components/layout/Topbar";
import Footer from "@/components/layout/Footer";
import { apiFetch } from "@/lib/api";

export default function StudentDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiFetch("/api/enrollments/me")
      .then((r) => setCourses(r.courses || []))
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <RequireAuth allow={["student"]}>
      <Topbar title="Student Dashboard" />
      <main className="min-h-screen p-6 bg-slate-50">
        <div className="mx-auto max-w-6xl">
          {/* Intro */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
            <div className="text-lg font-bold text-slate-900">CanSTEM Virtual Assistant</div>
            <div className="text-sm text-slate-600 mt-1">
              Your 24/7 study support. Ask questions anytime — even when our team is offline.
            </div>
          </div>

          {/* Support */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
            <div className="text-sm font-bold text-slate-900">Need Support?</div>
            <div className="text-sm text-slate-600 mt-1">
              If your question needs a teacher, contact us anytime:
            </div>
            <div className="mt-3">
              <a
                href="https://canstemeducation.com/contact-us/"
                target="_blank"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-white text-sm font-semibold hover:bg-slate-800"
              >
                Contact CanSTEM
              </a>
            </div>
          </div>

          {err && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {err}
            </div>
          )}

          <div className="text-sm text-slate-600 mb-4">Your enrolled courses:</div>

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
              No courses assigned yet. Ask admin to enroll you.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((c) => (
                <Link
                  key={c.id}
                  href={`/student/courses/${c.id}/tutor`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{c.name}</h2>
                      <p className="text-sm text-slate-600 mt-1">{c.description || ""}</p>
                    </div>
                    <span className="text-xs font-semibold rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                      {c.id}
                    </span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    Open Tutor <span aria-hidden>→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Footer />
        </div>
      </main>
    </RequireAuth>
  );
}