import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../services/api';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      if (storedToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const res = await authAPI.me();
        setUser(res.data.data.user);
        setToken(storedToken);
      }
    } catch (error) {
      console.log('Failed to load user', error);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const res = await authAPI.login(credentials);
    const { token, user } = res.data.data;
    await SecureStore.setItemAsync('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    setToken(token);
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    const { token, user } = res.data.data;
    await SecureStore.setItemAsync('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(user);
    setToken(token);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
