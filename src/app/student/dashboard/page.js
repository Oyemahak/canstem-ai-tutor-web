import Link from "next/link";
import RequireAuth from "@/components/auth/RequireAuth";
import { ROLES } from "@/lib/auth";
import Topbar from "@/components/layout/Topbar";

const courses = [
  { id: "FRE1D", name: "French (FRE1D)", desc: "Vocabulary, grammar, speaking practice" },
  { id: "MHF4U", name: "Advanced Functions (MHF4U)", desc: "Functions, transformations, trig, exponential" },
  { id: "ENG4U", name: "English (ENG4U)", desc: "Critical reading, essays, writing support" },
];

export default function StudentDashboardPage() {
  return (
    <RequireAuth allow={[ROLES.STUDENT]}>
      <Topbar title="Student Dashboard" />
      <main className="min-h-screen p-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-600 mb-5">
            Choose your course to start voice tutoring.
          </p>

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
                    <p className="text-sm text-slate-600 mt-1">{c.desc}</p>
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
        </div>
      </main>
    </RequireAuth>
  );
}