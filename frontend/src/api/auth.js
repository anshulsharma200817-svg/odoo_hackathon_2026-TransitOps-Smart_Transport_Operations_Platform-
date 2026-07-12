import client from "./client";
import { ROLE, ROLES } from "../lib/enumLabels";

export { ROLES };

const MOCK_USERS_KEY = "mock_users";

function readMockUsers() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function writeMockUsers(users) {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

// Seed one demo account so login can be exercised before signup/backend exist.
function seedDemoUser() {
  if (readMockUsers().length === 0) {
    writeMockUsers([{ email: "admin@transitops.dev", password: "password123", role: ROLE.FLEET_MANAGER }]);
  }
}
seedDemoUser();

function mockToken(email) {
  return `mock.${btoa(email)}.${Date.now()}`;
}

// No response at all (connection refused / CORS / DNS) means the real API
// isn't reachable yet, so fall back to the mock. A response that came back
// (4xx/5xx) means the real backend is live and its error should win.
function backendUnreachable(error) {
  return !error.response;
}

export async function login(email, password) {
  try {
    const { data } = await client.post("/auth/login/", { username: email, email, password });
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(
        error.response?.data?.detail || error.response?.data?.error || "Invalid email or password",
      );
    }
    const user = readMockUsers().find((u) => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid email or password");
    return { access: mockToken(email), refresh: mockToken(email), role: user.role };
  }
}

export async function signup(email, password, role) {
  try {
    const { data } = await client.post("/auth/signup/", { email, password, role });
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(
        error.response?.data?.detail || error.response?.data?.error || "Could not create account",
      );
    }
    const users = readMockUsers();
    if (users.some((u) => u.email === email)) {
      throw new Error("An account with this email already exists");
    }
    users.push({ email, password, role });
    writeMockUsers(users);
    return { email, role };
  }
}

export function storeSession({ access, refresh, role }) {
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
  if (role) localStorage.setItem("role", role);
}

export function clearSession() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("role");
}

export function getRole() {
  return localStorage.getItem("role");
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem("access_token"));
}
