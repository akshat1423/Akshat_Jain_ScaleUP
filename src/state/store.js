import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/supabaseApi';

const StoreContext = createContext(null);

export function StoreProvider({ children }){
  const [communities, setCommunities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const refresh = async ()=>{
    if (!user) return;
    
    setLoading(true);
    try {
      const list = await api.listCommunities();
      const notifs = await api.listNotifications();
      setCommunities(list);
      setNotifications(notifs);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      console.log('Loading user...');
      const currentUser = await api.getCurrentUser();
      console.log('Current user from API:', currentUser);
      setUser(currentUser);
      if (currentUser) {
        console.log('User found, refreshing data...');
        await refresh();
      } else {
        console.log('No user found');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const value = { 
    user, 
    setUser,
    communities, 
    setCommunities, 
    notifications, 
    setNotifications, 
    loading, 
    authLoading,
    refresh, 
    api 
  };
  
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
