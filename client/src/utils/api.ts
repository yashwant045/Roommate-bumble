import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const authData = localStorage.getItem("roommate-bumble-auth");
      if (authData) {
        try {
          const { accessToken } = JSON.parse(authData);
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          }
        } catch (e) {
          console.error("Error parsing auth data from localStorage:", e);
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent Token Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/refresh" &&
      originalRequest.url !== "/auth/login" &&
      originalRequest.url !== "/auth/register"
    ) {
      originalRequest._retry = true;
      if (typeof window !== "undefined") {
        const authData = localStorage.getItem("roommate-bumble-auth");
        if (authData) {
          try {
            const parsed = JSON.parse(authData);
            const { refreshToken } = parsed;
            if (refreshToken) {
              // Attempt to refresh the access token
              const res = await axios.post(`${API_URL}/auth/refresh`, {
                refreshToken,
              });

              if (res.data.success && res.data.data.accessToken) {
                const newAccessToken = res.data.data.accessToken;
                
                // Update local storage
                parsed.accessToken = newAccessToken;
                localStorage.setItem("roommate-bumble-auth", JSON.stringify(parsed));
                
                // Retry the original request with new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
              }
            }
          } catch (refreshErr) {
            console.error("Token refresh failed:", refreshErr);
            // Clear storage and redirect to login or trigger logout
            localStorage.removeItem("roommate-bumble-auth");
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("auth-logout"));
            }
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
