// src/services/apiClient.ts
import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE ?? ""; // e.g. http://localhost:8000

export const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // centraliza logs/errores (puedes enchufar snackbar aquí)
    return Promise.reject(err);
  }
);

// Pequeña utilidad para modo mock
export const isMock = !baseURL || baseURL === "mock";
