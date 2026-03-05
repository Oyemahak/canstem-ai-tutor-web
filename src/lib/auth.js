export const ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin",
};

const STORAGE_KEY = "canstem_tutor_session_v1";

// demo accounts for UI testing only
const DEMO_USERS = [
  { role: ROLES.STUDENT, email: "student@canstemeducation.com", password: "CanSTEM@123" },
  { role: ROLES.TEACHER, email: "teacher@canstemeducation.com", password: "CanSTEM@123" },
  { role: ROLES.ADMIN, email: "admin@canstemeducation.com", password: "CanSTEM@123" },
];

export function signIn({ role, email, password }) {
  const user = DEMO_USERS.find(
    (u) =>
      u.role === role &&
      u.email.toLowerCase() === String(email).trim().toLowerCase() &&
      u.password === password
  );

  if (!user) {
    return { ok: false, error: "Invalid credentials. Use the demo login shown below." };
  }

  const session = { role: user.role, email: user.email, name: user.role.toUpperCase() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return { ok: true, session };
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}