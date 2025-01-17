import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     if (error.response?.status === 401) {
//       // Handle unauthorized error (e.g., clear auth state and redirect to login)
//       localStorage.removeItem("token");
//       localStorage.removeItem("user");
//       window.location.href = "/";
//     }
//     return Promise.reject(error);
//   }
// );

export default api;
