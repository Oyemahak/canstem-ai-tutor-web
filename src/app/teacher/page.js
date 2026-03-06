// src/app/teacher/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import Topbar from "@/components/layout/Topbar";
import { apiFetch, apiForm } from "@/lib/api";

function Badge({ children }) {
  return (
    <span className="text-xs font-semibold rounded-full bg-slate-100 text-slate-700 px-3 py-1">
      {children}
    </span>
  );
}

function ConfirmModal({ open, title, message, confirmText = "Confirm", danger = false, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl">
        <div className="p-5 border-b border-slate-200">
          <div className="text-base font-bold text-slate-900">{title}</div>
          <div className="text-sm text-slate-600 mt-1 whitespace-pre-line">{message}</div>
        </div>
        <div className="p-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              danger ? "bg-red-600 hover:bg-red-500" : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const [students, setStudents] = useState([]);
  const [files, setFiles] = useState([]);

  // Materials controls
  const [topic, setTopic] = useState("");
  const [fileSearch, setFileSearch] = useState("");

  // Students controls
  const [studentSearch, setStudentSearch] = useState("");

  // Pagination
  const FILES_PER_PAGE = 6;
  const STUDENTS_PER_PAGE = 6;
  const [filePage, setFilePage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);

  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    danger: false,
    action: async () => {},
  });

  const loadCourses = async () => {
    const r = await apiFetch("/api/enrollments/teaching");
    const list = (r.courses || []).filter((c) => c.isLive);
    setCourses(list);
    if (!selectedCourseId && list.length) setSelectedCourseId(list[0].id);
  };

  const loadStudents = async (courseId) => {
    if (!courseId) return;
    const r = await apiFetch(`/api/enrollments/course/${courseId}/students`);
    setStudents(r.students || []);
  };

  const loadFiles = async (courseId) => {
    if (!courseId) return;
    const r = await apiFetch(`/api/files/course/${courseId}`);
    setFiles(r.files || []);
  };

  useEffect(() => {
    setErr("");
    loadCourses().catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setFilePage(1);
    setStudentPage(1);
  }, [selectedCourseId, fileSearch, studentSearch]);

  useEffect(() => {
    if (!selectedCourseId) return;
    setErr("");
    Promise.all([loadStudents(selectedCourseId), loadFiles(selectedCourseId)]).catch((e) => setErr(e.message));
  }, [selectedCourseId]);

  // --- Materials filtering + pagination
  const filteredFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
    if (!q) return files;
    return (files || []).filter((f) => {
      const hay = `${f.originalName || ""} ${f.topic || ""} ${f.uploader?.email || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [files, fileSearch]);

  const fileTotalPages = Math.max(1, Math.ceil(filteredFiles.length / FILES_PER_PAGE));
  const pagedFiles = useMemo(() => {
    const start = (filePage - 1) * FILES_PER_PAGE;
    return filteredFiles.slice(start, start + FILES_PER_PAGE);
  }, [filteredFiles, filePage]);

  // --- Students filtering + pagination
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return (students || []).filter((s) => {
      const hay = `${s.email || ""} ${s.name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, studentSearch]);

  const studentTotalPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE));
  const pagedStudents = useMemo(() => {
    const start = (studentPage - 1) * STUDENTS_PER_PAGE;
    return filteredStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [filteredStudents, studentPage]);

  // --- Upload multiple materials
  const uploadMaterials = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length || !selectedCourseId) return;

    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      picked.forEach((f) => fd.append("files", f)); // ✅ backend expects "files"
      if (topic.trim()) fd.append("topic", topic.trim());

      await apiForm(`/api/files/course/${selectedCourseId}`, fd);
      setTopic("");
      setFileSearch("");
      await loadFiles(selectedCourseId);
      e.target.value = "";
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteMaterial = (file) => {
    setConfirm({
      open: true,
      title: "Delete material?",
      message: `This will permanently delete:\n\n${file.originalName}\n\nCourse: ${selectedCourseId}`,
      confirmText: "Delete",
      danger: true,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setErr("");
        setBusy(true);
        try {
          await apiFetch(`/api/files/${file.id}`, { method: "DELETE" });
          await loadFiles(selectedCourseId);
        } catch (e2) {
          setErr(e2.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const removeStudentFromCourse = (s) => {
    setConfirm({
      open: true,
      title: "Remove student from this course?",
      message: `This will remove access for:\n\n${s.email}\n\nCourse: ${selectedCourseId}\n\n(Admin can re-enable later.)`,
      confirmText: "Remove",
      danger: true,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setErr("");
        setBusy(true);
        try {
          await apiFetch(`/api/enrollments/${s.enrollmentId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "inactive" }),
          });
          await loadStudents(selectedCourseId);
        } catch (e2) {
          setErr(e2.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId),
    [courses, selectedCourseId]
  );

  return (
    <RequireAuth allow={["teacher"]}>
      <Topbar title="Teacher" />

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        danger={confirm.danger}
        onCancel={() => setConfirm((p) => ({ ...p, open: false }))}
        onConfirm={confirm.action}
      />

      <main className="min-h-screen p-6 bg-slate-50">
        <div className="mx-auto max-w-6xl">
          {err && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {err}
            </div>
          )}

          <div className="text-sm text-slate-600 mb-4">
            Upload and manage course materials, and manage enrolled students.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Courses */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">My Courses</div>
                  <div className="text-xs text-slate-500">Courses assigned to you</div>
                </div>
                <Badge>{courses.length}</Badge>
              </div>

              {courses.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  No courses assigned yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {courses.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCourseId(c.id)}
                      className={`w-full text-left rounded-xl border p-3 transition ${
                        selectedCourseId === c.id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold">{c.id}</div>
                      <div className={`text-xs ${selectedCourseId === c.id ? "text-white/70" : "text-slate-500"}`}>
                        {c.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedCourse && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-500 mb-1">Selected course</div>
                  <div className="font-semibold text-slate-900">{selectedCourse.id}</div>
                  <div className="text-xs text-slate-600">{selectedCourse.description || selectedCourse.name}</div>
                </div>
              )}
            </div>

            {/* Middle: Materials (Admin-like) */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Materials</div>
                  <div className="text-xs text-slate-500">Course: {selectedCourseId || "-"}</div>
                </div>

                <label
                  className={`rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 cursor-pointer ${
                    busy ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  Upload Material
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={uploadMaterials}
                    disabled={busy || !selectedCourseId}
                  />
                </label>
              </div>

              <div className="p-4 space-y-3">

                {filteredFiles.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    No materials uploaded yet.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {pagedFiles.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{f.originalName}</div>
                            <div className="text-xs text-slate-500">
                              {(f.topic ? `${f.topic} • ` : "") +
                                `${Math.round((f.sizeBytes || 0) / 1024)} KB • ${new Date(
                                  f.createdAt
                                ).toLocaleString()}`}
                            </div>
                          </div>

                          <button
                            disabled={busy}
                            onClick={() => deleteMaterial(f)}
                            className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm font-semibold hover:bg-red-100 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <button
                        disabled={filePage <= 1}
                        onClick={() => setFilePage((p) => Math.max(1, p - 1))}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <div className="text-sm text-slate-700">
                        Page <b>{filePage}</b> / <b>{fileTotalPages}</b>
                      </div>
                      <button
                        disabled={filePage >= fileTotalPages}
                        onClick={() => setFilePage((p) => Math.min(fileTotalPages, p + 1))}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right: Students */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">Enrolled Students</div>
                  <div className="text-xs text-slate-500">Course: {selectedCourseId || "-"}</div>
                </div>
                <Badge>{filteredStudents.length}</Badge>
              </div>

              <div className="p-4">
                <input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students by email or name…"
                  className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 mb-3"
                />

                {filteredStudents.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    No students enrolled yet.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {pagedStudents.map((s) => (
                        <div
                          key={s.userId}
                          className="rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{s.email}</div>
                            <div className="text-xs text-slate-500 truncate">{s.name || "-"}</div>
                          </div>

                          <button
                            disabled={busy}
                            onClick={() => removeStudentFromCourse(s)}
                            className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm font-semibold hover:bg-red-100 disabled:opacity-60"
                            title="Disable access to this course"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        disabled={studentPage <= 1}
                        onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <div className="text-sm text-slate-700">
                        Page <b>{studentPage}</b> / <b>{studentTotalPages}</b>
                      </div>
                      <button
                        disabled={studentPage >= studentTotalPages}
                        onClick={() => setStudentPage((p) => Math.min(studentTotalPages, p + 1))}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <hr className="mt-8 border-slate-200" />
          <div className="mt-4 text-center text-xs text-slate-500">
            © 2025 CanSTEM Education Inc. All Rights Reserved.
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}