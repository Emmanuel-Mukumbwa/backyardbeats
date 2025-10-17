// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from "react";
import axios from '../api/axiosConfig';

export const AuthContext = createContext();

const SAFE_KEYS = [
  'bb_token', 'bb_auth', 'bb_user',
  'authToken', 'userRole', 'userName', 'userId', 'isLoggedIn'
];

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Decode full JWT payload (no signature verification)
function decodeJwtPayload(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to decode JWT payload', e);
    return null;
  }
}

// Keep backward-compatible helper that returns user id
function decodeJwtUserId(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return payload.userId || payload.id || null;
}

// Clear auth-related localStorage keys
function clearAuthStorage() {
  try {
    SAFE_KEYS.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    // ignore
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // user object (may include token)
  const [loading, setLoading] = useState(true);

  // Verify token on mount and hydrate user state
  const verifyAndHydrate = useCallback(async () => {
    setLoading(true);
    try {
      // 1) discover token from known storage spots
      let token = localStorage.getItem('bb_token') || null;
      if (!token) {
        const rawBbAuth = localStorage.getItem('bb_auth');
        if (rawBbAuth) {
          const parsed = safeParse(rawBbAuth);
          if (parsed && parsed.token) token = parsed.token;
          else if (typeof rawBbAuth === 'string' && rawBbAuth.length > 0) token = rawBbAuth;
        }
      }
      if (!token) token = localStorage.getItem('authToken') || null;

      if (!token) {
        // no token: ensure storage cleared and user null
        clearAuthStorage();
        setUser(null);
        return;
      }

      // 2) local expiration check if payload contains exp
      const payload = decodeJwtPayload(token);
      if (payload && payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          // token expired
          clearAuthStorage();
          setUser(null);
          return;
        }
      }

      // 3) server-side verification to fetch fresh user (/auth/check or /auth/me)
      try {
        const res = await axios.get('/auth/check'); // axios attaches Authorization header
        if (res?.data?.user) {
          const remoteUser = res.data.user;
          const composed = { ...remoteUser, token };
          setUser(composed);

          // persist canonical formats
          try {
            localStorage.setItem('bb_token', token);
            localStorage.setItem('authToken', token);
            localStorage.setItem('bb_user', JSON.stringify({ ...remoteUser, token }));
            localStorage.setItem('bb_auth', JSON.stringify({ token, user: remoteUser }));
            if (remoteUser.role) localStorage.setItem('userRole', remoteUser.role);
            if (remoteUser.username || remoteUser.name) localStorage.setItem('userName', remoteUser.username || remoteUser.name);
            if (remoteUser.userId || remoteUser.id) localStorage.setItem('userId', String(remoteUser.userId ?? remoteUser.id));
            localStorage.setItem('isLoggedIn', 'true');
          } catch (e) {
            // ignore storage failures
          }
          return;
        } else {
          // unexpected shape — treat as invalid
          clearAuthStorage();
          setUser(null);
          return;
        }
      } catch (err) {
        // On any verification failure, clear stale auth to avoid auto-login with invalid token
        // If you want to be more permissive for network errors, adjust this behavior.
        clearAuthStorage();
        setUser(null);
        return;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyAndHydrate();

    // Listen for storage changes (logout in another tab)
    const onStorage = (e) => {
      if (!e.key) return;
      if (SAFE_KEYS.includes(e.key) && !localStorage.getItem('bb_token')) {
        setUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [verifyAndHydrate]);

  // Save user to all expected storage locations
  const saveAllStorages = (userData) => {
    try {
      const token = userData.token || localStorage.getItem('bb_token') || localStorage.getItem('authToken') || null;
      const userObj = { ...userData };
      delete userObj.token;

      if (token) localStorage.setItem('bb_token', token);
      localStorage.setItem('bb_user', JSON.stringify({ ...userObj, token }));
      localStorage.setItem('bb_auth', JSON.stringify({ token, user: userObj }));

      if (token) localStorage.setItem('authToken', token);
      if (userObj.role) localStorage.setItem('userRole', userObj.role);
      if (userObj.username || userObj.name || userObj.fullName) {
        localStorage.setItem('userName', userObj.username || userObj.name || userObj.fullName);
      }
      if (userObj.userId || userObj.id) localStorage.setItem('userId', String(userObj.userId ?? userObj.id));
      localStorage.setItem('isLoggedIn', 'true');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error saving auth to storage', e);
    }
  };

  const login = (userData) => {
    if (!userData) return;
    const token = userData.token || null;

    let composedUser = { ...userData };
    if (!composedUser.userId && token) {
      const decodedId = decodeJwtUserId(token);
      if (decodedId) composedUser.userId = String(decodedId);
    }

    setUser(composedUser);
    saveAllStorages(composedUser);
  };

  const updateUser = (updates) => {
    const newUser = { ...user, ...updates };
    setUser(newUser);
    try {
      const token = newUser.token || localStorage.getItem('bb_token') || localStorage.getItem('authToken');
      const userCopy = { ...newUser };
      delete userCopy.token;

      localStorage.setItem('bb_user', JSON.stringify({ ...userCopy, token }));

      const bbAuth = localStorage.getItem('bb_auth');
      if (bbAuth) {
        const parsed = safeParse(bbAuth) || {};
        parsed.user = userCopy;
        parsed.token = token;
        localStorage.setItem('bb_auth', JSON.stringify(parsed));
      }
      if (userCopy.role) localStorage.setItem('userRole', userCopy.role);
      if (userCopy.username || userCopy.name || userCopy.fullName) {
        localStorage.setItem('userName', userCopy.username || userCopy.name || userCopy.fullName);
      }
      if (userCopy.userId || userCopy.id) localStorage.setItem('userId', String(userCopy.userId ?? userCopy.id));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error updating user storage', e);
    }
  };

  const logout = async () => {
    try {
      // best-effort server logout
      await axios.post('/auth/logout').catch(() => {});
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
      try {
        SAFE_KEYS.forEach(k => localStorage.removeItem(k));
      } catch (e) {
        // ignore
      }
    }
  };

  // manual refresh/verify if needed
  const refresh = async () => {
    await verifyAndHydrate();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};
