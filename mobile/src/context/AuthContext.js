import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { api } from "../services/api";
import { loadToken, saveToken } from "../utils/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [booting, setBooting] = useState(true);
  const tokenRef = useRef(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    const saved = loadToken();
    if (!saved) {
      setBooting(false);
      return;
    }
    api
      .profile(saved)
      .then((me) => {
        setToken(saved);
        setProfile(me);
        tokenRef.current = saved;
      })
      .catch(() => {
        saveToken(null);
        setToken(null);
        setProfile(null);
        tokenRef.current = null;
      })
      .finally(() => setBooting(false));
  }, []);

  const login = async (loginValue, password) => {
    const { token: jwt } = await api.login({ login: loginValue, password });
    const me = await api.profile(jwt);
    setToken(jwt);
    setProfile(me);
    tokenRef.current = jwt;
    saveToken(jwt);
  };

  const logout = () => {
    tokenRef.current = null;
    setToken(null);
    setProfile(null);
    saveToken(null);
  };

  const refreshProfile = useCallback(async () => {
    const t = tokenRef.current;
    if (!t) return;
    const me = await api.profile(t);
    if (tokenRef.current !== t) return;
    setProfile(me);
    return me;
  }, []);

  return (
    <AuthContext.Provider value={{ token, profile, login, logout, booting, refreshProfile }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
