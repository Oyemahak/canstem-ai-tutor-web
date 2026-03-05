import RequireAuth from "@/components/auth/RequireAuth";
import { ROLES } from "@/lib/auth";
import Topbar from "@/components/layout/Topbar";

const teacherCourses = [
  { id: "FRE1D", name: "French (FRE1D)", status: "Ready" },
  { id: "MHF4U", name: "Advanced Functions (MHF4U)", status: "Needs Upload" },
  { id: "ENG4U", name: "English (ENG4U)", status: "Ready" },
];

export default function TeacherDashboard() {
  return (
    <RequireAuth allow={[ROLES.TEACHER]}>
      <Topbar title="Teacher Dashboard" />
      <main className="min-h-screen p-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-600 mb-5">
            Manage course materials used by the AI Tutor (uploads + indexing will connect to backend later).
          </p>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-slate-500 border-b border-slate-200">
              <div className="col-span-6">Course</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {teacherCourses.map((c) => (
              <div key={c.id} className="grid grid-cols-12 px-4 py-4 border-b border-slate-100 items-center">
                <div className="col-span-6">
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.id}</div>
                </div>

                <div className="col-span-3">
                  <span className="text-xs font-semibold rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                    {c.status}
                  </span>
                </div>

                <div className="col-span-3 text-right">
                  <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                    Upload Material
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Next: backend will store files per course + build the RAG knowledge base.
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}