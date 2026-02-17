import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "https://code-relay-foobar-fe.vercel.app/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("nexus_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(response.data);
      } catch (err) {
        console.error("Auth fetchMe failed:", err);
        setUser(null);
        setToken(null);
        localStorage.removeItem("nexus_token");
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password,
    });

    localStorage.setItem("nexus_token", response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);

    return response.data;
  };

  const register = async (username, email, password) => {
    const response = await axios.post(`${API_BASE}/auth/register`, {
      username,
      email,
      password,
    });

    localStorage.setItem("nexus_token", response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("nexus_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
