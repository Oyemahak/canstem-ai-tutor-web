import { apiFetch } from "@/lib/api";

export async function login(email, password) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export async function me() {
  return apiFetch("/api/auth/me");
}