const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const apiFetch = (path: string, options: RequestInit = {}) => {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
  });
};
