// src/app/admin/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import Topbar from "@/components/layout/Topbar";
import { apiFetch, apiForm } from "@/lib/api";

/**
 * Admin Dashboard (Final)
 * - Tabs: Students, Staff (Teachers/Admins), Courses, Enrollments, Materials, Recycle Bin
 * - Users:
 *    - Search (email/name), filter (role/status), pagination
 *    - Create student/staff separately
 *    - Edit (name/role), Disable (soft delete), Force Delete (permanent)
 * - Courses:
 *    - Create/edit
 *    - Multi-teacher assignment via checkboxes (requires backend: PUT /api/courses/:courseId/teachers)
 *    - Hide (soft delete), Force delete (requires backend: DELETE /api/courses/:courseId/force)
 * - Enrollments:
 *    - Autocomplete search (requires backend: GET /api/users/search?q=&role=student)
 *    - Enroll by selecting a user
 *    - Remove student from course (requires backend: DELETE /api/enrollments/course/:courseId/student/:userId)
 *    - Disable course access (inactive) via PATCH /api/enrollments/:enrollmentId
 * - Materials:
 *    - Topic field + multiple file upload (requires backend to accept topic, and multipart)
 *
 * Logo:
 * - Put your logo file at: /public/canstem-logo.png
 */

function Badge({ children }) {
  return (
    <span className="text-xs font-semibold rounded-full bg-slate-100 text-slate-700 px-3 py-1">
      {children}
    </span>
  );
}

function Chip({ children }) {
  return (
    <span className="text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 px-2.5 py-1">
      {children}
    </span>
  );
}

function PrimaryButton({ children, disabled, onClick, type = "button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, disabled, onClick, type = "button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function DangerButton({ children, disabled, onClick, type = "button" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2.5 text-sm font-semibold hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  danger = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl">
        <div className="p-5 border-b border-slate-200">
          <div className="text-base font-bold text-slate-900">{title}</div>
          <div className="text-sm text-slate-600 mt-1 whitespace-pre-line">
            {message}
          </div>
        </div>
        <div className="p-5 flex items-center justify-end gap-2">
          <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${danger ? "bg-red-600 hover:bg-red-500" : "bg-slate-900 hover:bg-slate-800"
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pager({ page, totalPages, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <SecondaryButton disabled={page <= 1} onClick={onPrev}>
        Prev
      </SecondaryButton>
      <div className="text-sm text-slate-700">
        {page}/{totalPages}
      </div>
      <SecondaryButton disabled={page >= totalPages} onClick={onNext}>
        Next
      </SecondaryButton>
    </div>
  );
}

function normalize(s) {
  return String(s || "").trim();
}

function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("students"); // students | staff | courses | enroll | materials | recycle
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Data
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseStudents, setCourseStudents] = useState([]);
  const [files, setFiles] = useState([]);

  // Create forms
  const [newStudent, setNewStudent] = useState({ email: "", name: "", password: "" });
  const [newStaff, setNewStaff] = useState({ email: "", name: "", role: "teacher", password: "" });
  const [newCourse, setNewCourse] = useState({ id: "", name: "", description: "" });

  // Edit state
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserDraft, setEditUserDraft] = useState({ name: "", role: "student" });

  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editCourseDraft, setEditCourseDraft] = useState({ name: "", description: "" });
  const [editCourseTeacherIds, setEditCourseTeacherIds] = useState([]);

  // Confirm modal
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    danger: false,
    action: async () => { },
  });

  // Users search/filter/pagination
  const [userSearch, setUserSearch] = useState("");
  const debUserSearch = useDebouncedValue(userSearch, 200);

  const [userStatusFilter, setUserStatusFilter] = useState("active"); // active|disabled|all
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 10;

  // Enrollment: student autocomplete + selection
  const [enrollQuery, setEnrollQuery] = useState("");
  const debEnrollQuery = useDebouncedValue(enrollQuery, 250);
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [pickedStudent, setPickedStudent] = useState(null); // {id,email,name,role}
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestBoxRef = useRef(null);

  // Materials
  const [topic, setTopic] = useState("");
  const [uploading, setUploading] = useState(false);

  // ---------- Derived ----------
  const teachers = useMemo(
    () => users.filter((u) => u.role === "teacher" && u.isActive),
    [users]
  );

  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);
  const disabledUsers = useMemo(() => users.filter((u) => !u.isActive), [users]);

  const liveCourses = useMemo(() => courses.filter((c) => c.isLive), [courses]);
  const hiddenCourses = useMemo(() => courses.filter((c) => !c.isLive), [courses]);

  // tab-specific user role filters
  const tabRoleFilter = tab === "students" ? "student" : tab === "staff" ? "staff" : "all";

  const filteredUsers = useMemo(() => {
    const q = normalize(debUserSearch).toLowerCase();

    const base =
      userStatusFilter === "active"
        ? activeUsers
        : userStatusFilter === "disabled"
          ? disabledUsers
          : users;

    return (base || []).filter((u) => {
      if (tabRoleFilter === "student" && u.role !== "student") return false;
      if (tabRoleFilter === "staff" && !["teacher", "admin"].includes(u.role)) return false;

      if (!q) return true;
      const hay = `${u.email || ""} ${u.name || ""} ${u.role || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [activeUsers, disabledUsers, users, tabRoleFilter, userStatusFilter, debUserSearch]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const pagedUsers = useMemo(() => {
    const start = (userPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, userPage]);

  // ---------- Loaders ----------
  const loadUsers = async () => {
    const r = await apiFetch("/api/users");
    setUsers(r.users || []);
  };

  const loadCourses = async () => {
    const r = await apiFetch("/api/courses");
    setCourses(r.courses || []);
    if (!selectedCourseId && r.courses?.length) setSelectedCourseId(r.courses[0].id);
  };

  const loadCourseStudents = async (courseId) => {
    if (!courseId) return;
    const r = await apiFetch(`/api/enrollments/course/${courseId}/students`);
    setCourseStudents(r.students || []);
  };

  const loadFiles = async (courseId) => {
    if (!courseId) return;
    const r = await apiFetch(`/api/files/course/${courseId}`);
    setFiles(r.files || []);
  };

  useEffect(() => {
    setErr("");
    Promise.all([loadUsers(), loadCourses()]).catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setErr(""), [tab]);

  useEffect(() => {
    if (!selectedCourseId) return;
    loadCourseStudents(selectedCourseId).catch((e) => setErr(e.message));
    loadFiles(selectedCourseId).catch((e) => setErr(e.message));
  }, [selectedCourseId]);

  useEffect(() => {
    setUserPage(1);
  }, [debUserSearch, userStatusFilter, tabRoleFilter]);

  // close enroll suggestion dropdown on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (!suggestBoxRef.current) return;
      if (!suggestBoxRef.current.contains(e.target)) setSuggestOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Enrollment suggestions (search by email OR name via backend)
  useEffect(() => {
    const q = normalize(debEnrollQuery);
    if (!q) {
      setStudentSuggestions([]);
      return;
    }

    (async () => {
      try {
        const r = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}&role=student`);
        setStudentSuggestions(r.users || []);
      } catch {
        // ignore
      }
    })();
  }, [debEnrollQuery]);

  // ---------- Helpers ----------
  const openConfirm = ({ title, message, confirmText, danger, action }) => {
    setConfirm({
      open: true,
      title,
      message,
      confirmText,
      danger: !!danger,
      action: action || (async () => { }),
    });
  };

  // ---------- Users actions ----------
  const startEditUser = (u) => {
    setEditingUserId(u.id);
    setEditUserDraft({ name: u.name || "", role: u.role });
  };

  const saveEditUser = async () => {
    if (!editingUserId) return;
    setBusy(true);
    setErr("");
    try {
      await apiFetch(`/api/users/${editingUserId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editUserDraft.name || null,
          role: editUserDraft.role,
        }),
      });
      setEditingUserId(null);
      await loadUsers();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const disableUser = (u) => {
    openConfirm({
      title: "Disable user?",
      message: `This will disable login for:\n\n${u.email}\n\nYou can restore from Recycle Bin.`,
      confirmText: "Disable",
      danger: true,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setBusy(true);
        setErr("");
        try {
          await apiFetch(`/api/users/${u.id}`, { method: "DELETE" });
          await loadUsers();
        } catch (e) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const restoreUser = (u) => {
    openConfirm({
      title: "Restore user?",
      message: `Restore login access for:\n\n${u.email}`,
      confirmText: "Restore",
      danger: false,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setBusy(true);
        setErr("");
        try {
          await apiFetch(`/api/users/${u.id}`, {
            method: "PATCH",
            body: JSON.stringify({ isActive: true }),
          });
          await loadUsers();
        } catch (e) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const forceDeleteUser = (u) => {
    openConfirm({
      title: "Permanently delete user?",
      message:
        `This will permanently delete:\n\n${u.email}\n\n` +
        `This removes them from the portal and deletes related enrollments/history.\n\nContinue?`,
      confirmText: "Delete permanently",
      danger: true,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setBusy(true);
        setErr("");
        try {
          await apiFetch(`/api/users/${u.id}/force`, { method: "DELETE" });
          await loadUsers();
        } catch (e) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const createStudent = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ ...newStudent, role: "student" }),
      });
      setNewStudent({ email: "", name: "", password: "" });
      await loadUsers();
      setTab("students");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const createStaff = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(newStaff),
      });
      setNewStaff({ email: "", name: "", role: "teacher", password: "" });
      await loadUsers();
      setTab("staff");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  // ---------- Courses actions ----------
  const startEditCourse = (c) => {
    setEditingCourseId(c.id);
    setEditCourseDraft({ name: c.name || "", description: c.description || "" });
    setEditCourseTeacherIds((c.teachers || []).map((t) => t.id));
  };

  const createCourse = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const idUpper = (newCourse.id || "").toUpperCase();
      await apiFetch("/api/courses", {
        method: "POST",
        body: JSON.stringify({
          id: idUpper,
          name: newCourse.name,
          description: newCourse.description || undefined,
        }),
      });
      setNewCourse({ id: "", name: "", description: "" });
      await loadCourses();
      setSelectedCourseId(idUpper);
      setTab("courses");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const updateCourse = async (courseId, patch) => {
    setBusy(true);
    setErr("");
    try {
      await apiFetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await loadCourses();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setCourseTeachers = async (courseId, teacherIds) => {
    setBusy(true);
    setErr("");
    try {
      await apiFetch(`/api/courses/${courseId}/teachers`, {
        method: "PUT",
        body: JSON.stringify({ teacherIds }),
      });
      await loadCourses();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveEditCourse = async () => {
    if (!editingCourseId) return;
    setBusy(true);
    setErr("");
    try {
      await apiFetch(`/api/courses/${editingCourseId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editCourseDraft.name,
          description: editCourseDraft.description || null,
        }),
      });

      await apiFetch(`/api/courses/${editingCourseId}/teachers`, {
        method: "PUT",
        body: JSON.stringify({ teacherIds: editCourseTeacherIds }),
      });

      setEditingCourseId(null);
      await loadCourses();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const hideCourse = (c) => {
    openConfirm({
      title: "Hide course?",
      message: `This will hide ${c.id} from students/teachers.\n\nYou can restore from Recycle Bin.`,
      confirmText: "Hide",
      danger: true,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        await updateCourse(c.id, { isLive: false });
      },
    });
  };

  const restoreCourse = (c) => {
    openConfirm({
      title: "Restore course?",
      message: `Make ${c.id} live again?`,
      confirmText: "Restore",
      danger: false,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        await updateCourse(c.id, { isLive: true });
      },
    });
  };

  const forceDeleteCourse = (c) => {
    openConfirm({
      title: "Permanently delete course?",
      message:
        `This will permanently delete ${c.id} including:\n` +
        `• enrollments\n• files\n• conversation history\n\nContinue?`,
      confirmText: "Delete permanently",
      danger: true,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setBusy(true);
        setErr("");
        try {
          await apiFetch(`/api/courses/${c.id}/force`, { method: "DELETE" });
          await loadCourses();
          if (selectedCourseId === c.id) setSelectedCourseId("");
        } catch (e) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  // ---------- Enrollments ----------
  const enrollPickedStudent = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return setErr("Select a course first.");
    if (!pickedStudent?.email) return setErr("Pick a student from suggestions.");

    setBusy(true);
    setErr("");
    try {
      await apiFetch("/api/enrollments", {
        method: "POST",
        body: JSON.stringify({
          studentEmail: pickedStudent.email,
          courseId: selectedCourseId,
        }),
      });
      setEnrollQuery("");
      setPickedStudent(null);
      setStudentSuggestions([]);
      setSuggestOpen(false);
      await loadCourseStudents(selectedCourseId);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const removeStudentFromCourse = (row) => {
    openConfirm({
      title: "Remove student from course?",
      message: `Remove ${row.email} from ${selectedCourseId}?\n\nThey will no longer see this course.`,
      confirmText: "Remove",
      danger: true,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setBusy(true);
        setErr("");
        try {
          await apiFetch(`/api/enrollments/course/${selectedCourseId}/student/${row.userId}`, {
            method: "DELETE",
          });
          await loadCourseStudents(selectedCourseId);
        } catch (e) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const disableStudentAccess = (row) => {
    openConfirm({
      title: "Disable course access?",
      message: `Set ${row.email} to inactive for ${selectedCourseId}?\n\nThey won’t see the course until re-enabled.`,
      confirmText: "Disable access",
      danger: true,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setBusy(true);
        setErr("");
        try {
          await apiFetch(`/api/enrollments/${row.enrollmentId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "inactive" }),
          });
          await loadCourseStudents(selectedCourseId);
        } catch (e) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  // ---------- Materials ----------
  const uploadMaterials = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length || !selectedCourseId) return;

    setErr("");
    setUploading(true);

    try {
      const fd = new FormData();

      // ✅ backend expects field name "files"
      picked.forEach((f) => fd.append("files", f));

      if (normalize(topic)) fd.append("topic", normalize(topic));

      await apiForm(`/api/files/course/${selectedCourseId}`, fd);

      await loadFiles(selectedCourseId);
      e.target.value = "";
      setTopic("");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteMaterial = (file) => {
    openConfirm({
      title: "Delete file?",
      message: `Delete "${file.originalName}"?\n\nThis removes the material from the course.`,
      confirmText: "Delete",
      danger: true,
      action: async () => {
        setConfirm((p) => ({ ...p, open: false }));
        setBusy(true);
        setErr("");
        try {
          await apiFetch(`/api/files/${file.id}`, { method: "DELETE" });
          await loadFiles(selectedCourseId);
        } catch (e) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  // ---------- UI ----------
  const tabButton = (key, label) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`rounded-xl px-4 py-2 text-sm font-semibold border ${tab === key
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white border-slate-200 hover:bg-slate-50"
        }`}
    >
      {label}
    </button>
  );

  return (
    <RequireAuth allow={["admin"]}>
      <Topbar title="Admin Dashboard" />

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
          {/* Header with logo */}
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <img
                src="/canstem-logo.png"
                alt="CanSTEM"
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white object-contain"
              />
              <div>
                <div className="text-lg font-extrabold text-slate-900">Admin Control Center</div>
                <div className="text-xs text-slate-500">Manage students, staff, courses, enrollments, and materials</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {tabButton("students", "Students")}
            {tabButton("staff", "Staff")}
            {tabButton("courses", "Courses")}
            {tabButton("enroll", "Enrollments")}
            {tabButton("materials", "Materials")}
            {tabButton("recycle", "Recycle Bin")}
          </div>

          {err && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {err}
            </div>
          )}

          {/* Shared course selector */}
          {(tab === "enroll" || tab === "materials") && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-bold text-slate-900 mb-2">Select Course</div>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-slate-500">
                Tip: enrollments/materials apply to the selected course.
              </div>
            </div>
          )}

          {/* STUDENTS TAB */}
          {tab === "students" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Create student */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-bold text-slate-900 mb-3">Create Student</div>
                <form className="space-y-3" onSubmit={createStudent}>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    placeholder="Student email"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent((p) => ({ ...p, email: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    placeholder="Student name (optional)"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    placeholder="Password (min 8 chars)"
                    type="password"
                    value={newStudent.password}
                    onChange={(e) => setNewStudent((p) => ({ ...p, password: e.target.value }))}
                  />
                  <PrimaryButton
                    type="submit"
                    disabled={busy || !newStudent.email || (newStudent.password || "").length < 8}
                  >
                    Create Student
                  </PrimaryButton>
                  <div className="text-xs text-slate-500">
                    Recommended for testing: firstname@canstemeducation.com / firstname12345
                  </div>
                </form>
              </div>

              {/* Students list */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-6">
                      <input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search students by email or name…"
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <select
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <Pager
                        page={userPage}
                        totalPages={totalUserPages}
                        onPrev={() => setUserPage((p) => Math.max(1, p - 1))}
                        onNext={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  <div className="col-span-6">Student</div>
                  <div className="col-span-3">Role</div>
                  <div className="col-span-3 text-right">Actions</div>
                </div>

                {pagedUsers.map((u) => (
                  <div key={u.id} className="grid grid-cols-12 px-4 py-4 border-b border-slate-100 items-center">
                    <div className="col-span-6 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{u.email}</div>
                      {editingUserId === u.id ? (
                        <input
                          className="mt-2 w-full rounded-xl border border-slate-200 p-2 text-sm"
                          value={editUserDraft.name}
                          placeholder="Name"
                          onChange={(e) => setEditUserDraft((p) => ({ ...p, name: e.target.value }))}
                        />
                      ) : (
                        <div className="text-xs text-slate-500 truncate">{u.name || "-"}</div>
                      )}
                    </div>

                    <div className="col-span-3">
                      <Badge>{u.role}</Badge>
                      {!u.isActive && <span className="ml-2"><Chip>disabled</Chip></span>}
                    </div>

                    <div className="col-span-3 text-right flex items-center justify-end gap-2">
                      {editingUserId === u.id ? (
                        <>
                          <PrimaryButton disabled={busy} onClick={saveEditUser}>
                            Save
                          </PrimaryButton>
                          <SecondaryButton disabled={busy} onClick={() => setEditingUserId(null)}>
                            Cancel
                          </SecondaryButton>
                        </>
                      ) : (
                        <>
                          <SecondaryButton disabled={busy} onClick={() => { setEditingUserId(u.id); setEditUserDraft({ name: u.name || "", role: "student" }); }}>
                            Edit
                          </SecondaryButton>
                          {u.isActive ? (
                            <DangerButton disabled={busy} onClick={() => disableUser(u)}>
                              Disable
                            </DangerButton>
                          ) : (
                            <SecondaryButton disabled={busy} onClick={() => restoreUser(u)}>
                              Restore
                            </SecondaryButton>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAFF TAB */}
          {tab === "staff" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Create staff */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-bold text-slate-900 mb-3">Create Staff</div>
                <form className="space-y-3" onSubmit={createStaff}>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    placeholder="Staff email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff((p) => ({ ...p, email: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    placeholder="Name (optional)"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))}
                  />
                  <select
                    className="w-full rounded-xl border border-slate-200 p-3"
                    value={newStaff.role}
                    onChange={(e) => setNewStaff((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="teacher">teacher</option>
                    <option value="admin">admin</option>
                  </select>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    placeholder="Password (min 8 chars)"
                    type="password"
                    value={newStaff.password}
                    onChange={(e) => setNewStaff((p) => ({ ...p, password: e.target.value }))}
                  />
                  <PrimaryButton type="submit" disabled={busy || !newStaff.email || (newStaff.password || "").length < 8}>
                    Create Staff
                  </PrimaryButton>
                </form>
              </div>

              {/* Staff list */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-6">
                      <input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search staff by email or name…"
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <select
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <Pager
                        page={userPage}
                        totalPages={totalUserPages}
                        onPrev={() => setUserPage((p) => Math.max(1, p - 1))}
                        onNext={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  <div className="col-span-6">Staff</div>
                  <div className="col-span-3">Role</div>
                  <div className="col-span-3 text-right">Actions</div>
                </div>

                {pagedUsers.map((u) => (
                  <div key={u.id} className="grid grid-cols-12 px-4 py-4 border-b border-slate-100 items-center">
                    <div className="col-span-6 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{u.email}</div>
                      {editingUserId === u.id ? (
                        <input
                          className="mt-2 w-full rounded-xl border border-slate-200 p-2 text-sm"
                          value={editUserDraft.name}
                          placeholder="Name"
                          onChange={(e) => setEditUserDraft((p) => ({ ...p, name: e.target.value }))}
                        />
                      ) : (
                        <div className="text-xs text-slate-500 truncate">{u.name || "-"}</div>
                      )}
                    </div>

                    <div className="col-span-3">
                      {editingUserId === u.id ? (
                        <select
                          className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                          value={editUserDraft.role}
                          onChange={(e) => setEditUserDraft((p) => ({ ...p, role: e.target.value }))}
                        >
                          <option value="teacher">teacher</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <Badge>{u.role}</Badge>
                      )}
                      {!u.isActive && <span className="ml-2"><Chip>disabled</Chip></span>}
                    </div>

                    <div className="col-span-3 text-right flex items-center justify-end gap-2">
                      {editingUserId === u.id ? (
                        <>
                          <PrimaryButton disabled={busy} onClick={saveEditUser}>
                            Save
                          </PrimaryButton>
                          <SecondaryButton disabled={busy} onClick={() => setEditingUserId(null)}>
                            Cancel
                          </SecondaryButton>
                        </>
                      ) : (
                        <>
                          <SecondaryButton
                            disabled={busy}
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditUserDraft({ name: u.name || "", role: u.role });
                            }}
                          >
                            Edit
                          </SecondaryButton>

                          {u.isActive ? (
                            <DangerButton disabled={busy} onClick={() => disableUser(u)}>
                              Disable
                            </DangerButton>
                          ) : (
                            <>
                              <SecondaryButton disabled={busy} onClick={() => restoreUser(u)}>
                                Restore
                              </SecondaryButton>
                              <DangerButton disabled={busy} onClick={() => forceDeleteUser(u)}>
                                Delete
                              </DangerButton>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COURSES TAB */}
          {tab === "courses" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Create course */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-bold text-slate-900 mb-3">Create Course</div>
                <form className="space-y-3" onSubmit={createCourse}>
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    placeholder="Course ID (ex: ENG4U)"
                    value={newCourse.id}
                    onChange={(e) => setNewCourse((p) => ({ ...p, id: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    placeholder="Course Name"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse((p) => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 p-3"
                    placeholder="Description (optional)"
                    value={newCourse.description}
                    onChange={(e) => setNewCourse((p) => ({ ...p, description: e.target.value }))}
                  />
                  <PrimaryButton type="submit" disabled={busy || !newCourse.id || !newCourse.name}>
                    Create Course
                  </PrimaryButton>
                </form>
              </div>

              {/* Courses list */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-3 text-xs font-semibold text-slate-500 border-b border-slate-200">
                  <div className="col-span-5">Course</div>
                  <div className="col-span-4">Teachers</div>
                  <div className="col-span-3 text-right">Actions</div>
                </div>

                {liveCourses.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 px-4 py-4 border-b border-slate-100 items-start">
                    <div className="col-span-5">
                      <div className="font-semibold text-slate-900">{c.id}</div>

                      {editingCourseId === c.id ? (
                        <div className="mt-2 space-y-2">
                          <input
                            className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                            value={editCourseDraft.name}
                            placeholder="Course name"
                            onChange={(e) => setEditCourseDraft((p) => ({ ...p, name: e.target.value }))}
                          />
                          <input
                            className="w-full rounded-xl border border-slate-200 p-2 text-sm"
                            value={editCourseDraft.description}
                            placeholder="Description"
                            onChange={(e) => setEditCourseDraft((p) => ({ ...p, description: e.target.value }))}
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          {c.name} • {c.description || "-"}
                        </div>
                      )}
                    </div>

                    <div className="col-span-4">
                      {editingCourseId === c.id ? (
                        <div className="rounded-xl border border-slate-200 p-3 space-y-2 max-h-44 overflow-auto">
                          {teachers.length === 0 ? (
                            <div className="text-sm text-slate-600">No active teachers.</div>
                          ) : (
                            teachers.map((t) => {
                              const checked = editCourseTeacherIds.includes(t.id);
                              return (
                                <label key={t.id} className="flex items-center gap-2 text-sm text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      setEditCourseTeacherIds((prev) => {
                                        const next = new Set(prev);
                                        if (e.target.checked) next.add(t.id);
                                        else next.delete(t.id);
                                        return Array.from(next);
                                      });
                                    }}
                                  />
                                  <span className="truncate">{t.email}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-700">
                          {(c.teachers || []).length === 0 ? (
                            <span className="text-slate-500">Unassigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(c.teachers || []).slice(0, 3).map((t) => (
                                <Chip key={t.id}>{t.email.split("@")[0]}</Chip>
                              ))}
                              {(c.teachers || []).length > 3 && <Chip>+{c.teachers.length - 3}</Chip>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="col-span-3 text-right flex items-center justify-end gap-2">
                      {editingCourseId === c.id ? (
                        <>
                          <PrimaryButton disabled={busy || !editCourseDraft.name} onClick={saveEditCourse}>
                            Save
                          </PrimaryButton>
                          <SecondaryButton disabled={busy} onClick={() => setEditingCourseId(null)}>
                            Cancel
                          </SecondaryButton>
                        </>
                      ) : (
                        <>
                          <SecondaryButton disabled={busy} onClick={() => startEditCourse(c)}>
                            Edit
                          </SecondaryButton>
                          <DangerButton disabled={busy} onClick={() => hideCourse(c)}>
                            Hide
                          </DangerButton>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {liveCourses.length === 0 && (
                  <div className="p-4 text-sm text-slate-700">No live courses yet.</div>
                )}
              </div>
            </div>
          )}

          {/* ENROLLMENTS TAB */}
          {tab === "enroll" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Enroll */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-bold text-slate-900 mb-3">Enroll Student</div>

                <form className="space-y-3" onSubmit={enrollPickedStudent}>
                  <div className="relative" ref={suggestBoxRef}>
                    <input
                      className="w-full rounded-xl border border-slate-200 p-3"
                      placeholder="Search student by name or email…"
                      value={enrollQuery}
                      onChange={(e) => {
                        setEnrollQuery(e.target.value);
                        setSuggestOpen(true);
                        setPickedStudent(null);
                      }}
                      onFocus={() => setSuggestOpen(true)}
                    />

                    {suggestOpen && studentSuggestions.length > 0 && (
                      <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                        {studentSuggestions.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => {
                              setPickedStudent(u);
                              setEnrollQuery(`${u.name ? u.name + " • " : ""}${u.email}`);
                              setSuggestOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                          >
                            <div className="text-sm font-semibold text-slate-900">
                              {u.name || u.email}
                            </div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <PrimaryButton disabled={busy || !selectedCourseId || !pickedStudent?.email} type="submit">
                    Enroll to {selectedCourseId || "Course"}
                  </PrimaryButton>

                  <div className="text-xs text-slate-500">
                    Pick a student from the dropdown (search works by email or name).
                  </div>
                </form>
              </div>

              {/* Enrolled list + CRUD */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Enrolled Students</div>
                    <div className="text-xs text-slate-500">Course: {selectedCourseId}</div>
                  </div>
                  <Badge>{courseStudents.length}</Badge>
                </div>

                {courseStudents.length === 0 ? (
                  <div className="p-4 text-sm text-slate-700">No students enrolled yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {courseStudents.map((s) => (
                      <div key={s.userId} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{s.email}</div>
                          <div className="text-xs text-slate-500 truncate">{s.name || "-"}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <SecondaryButton disabled={busy} onClick={() => disableStudentAccess(s)}>
                            Disable
                          </SecondaryButton>
                          <DangerButton disabled={busy} onClick={() => removeStudentFromCourse(s)}>
                            Remove
                          </DangerButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MATERIALS TAB */}
          {tab === "materials" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Course Materials</div>
                  <div className="text-xs text-slate-500">
                    Course: <b>{selectedCourseId}</b>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic (optional) e.g. Unit 1 • Trigonometry"
                    className="w-full sm:w-85 rounded-xl border border-slate-200 p-2.5 text-sm"
                  />

                  <label className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 cursor-pointer text-center">
                    {uploading ? "Uploading…" : "Upload files"}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={uploadMaterials}
                      disabled={!selectedCourseId || uploading}
                    />
                  </label>
                </div>
              </div>

              {files.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  No materials uploaded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {f.originalName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {f.topic ? (
                            <>
                              <span className="mr-2">Topic: <b>{f.topic}</b></span>•{" "}
                            </>
                          ) : null}
                          {Math.round((f.sizeBytes || 0) / 1024)} KB •{" "}
                          {new Date(f.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <DangerButton disabled={busy} onClick={() => deleteMaterial(f)}>
                        Delete
                      </DangerButton>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 text-xs text-slate-500">
                Next: these files will be indexed into the course knowledge base when OpenAI integration is enabled.
              </div>
            </div>
          )}

          {/* RECYCLE BIN TAB */}
          {tab === "recycle" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Disabled users */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Disabled Users</div>
                    <div className="text-xs text-slate-500">Restore or permanently delete</div>
                  </div>
                  <Badge>{disabledUsers.length}</Badge>
                </div>

                {disabledUsers.length === 0 ? (
                  <div className="p-4 text-sm text-slate-700">Recycle bin is empty.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {disabledUsers.map((u) => (
                      <div key={u.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{u.email}</div>
                          <div className="text-xs text-slate-500">{u.role}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <SecondaryButton disabled={busy} onClick={() => restoreUser(u)}>
                            Restore
                          </SecondaryButton>
                          <DangerButton disabled={busy} onClick={() => forceDeleteUser(u)}>
                            Delete
                          </DangerButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hidden courses */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">Hidden Courses</div>
                    <div className="text-xs text-slate-500">Restore or permanently delete</div>
                  </div>
                  <Badge>{hiddenCourses.length}</Badge>
                </div>

                {hiddenCourses.length === 0 ? (
                  <div className="p-4 text-sm text-slate-700">Recycle bin is empty.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {hiddenCourses.map((c) => (
                      <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{c.id}</div>
                          <div className="text-xs text-slate-500 truncate">{c.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <SecondaryButton disabled={busy} onClick={() => restoreCourse(c)}>
                            Restore
                          </SecondaryButton>
                          <DangerButton disabled={busy} onClick={() => forceDeleteCourse(c)}>
                            Delete
                          </DangerButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 text-xs text-slate-500">
                Note: Users are soft-deleted (disabled). Courses are hidden (soft delete). Permanent delete removes records completely.
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
            © 2026 CanSTEM Education Private School Inc. All Rights Reserved.
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}