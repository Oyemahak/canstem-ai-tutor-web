import RequireAuth from "@/components/auth/RequireAuth";
import { ROLES } from "@/lib/auth";
import Topbar from "@/components/layout/Topbar";

const users = [
  { email: "student@canstemeducation.com", role: "STUDENT", status: "Active" },
  { email: "teacher@canstemeducation.com", role: "TEACHER", status: "Active" },
  { email: "admin@canstemeducation.com", role: "ADMIN", status: "Active" },
];

export default function AdminDashboard() {
  return (
    <RequireAuth allow={[ROLES.ADMIN]}>
      <Topbar title="Admin Dashboard" />
      <main className="min-h-screen p-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-slate-600 mb-5">
            Manage users, access, and platform settings (backend integration later).
          </p>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-slate-500 border-b border-slate-200">
              <div className="col-span-6">User</div>
              <div className="col-span-3">Role</div>
              <div className="col-span-3 text-right">Status</div>
            </div>

            {users.map((u) => (
              <div key={u.email} className="grid grid-cols-12 px-4 py-4 border-b border-slate-100 items-center">
                <div className="col-span-6">
                  <div className="font-semibold text-slate-900">{u.email}</div>
                </div>
                <div className="col-span-3">
                  <span className="text-xs font-semibold rounded-full bg-slate-100 text-slate-700 px-3 py-1">
                    {u.role}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 px-3 py-1">
                    {u.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Next: connect DB + role management + Google SSO (domain restriction).
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}