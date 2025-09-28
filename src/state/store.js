import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../services/supabaseApi';

const StoreContext = createContext(null);

export function StoreProvider({ children }){
  const [communities, setCommunities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);

  const refresh = async ()=>{
    if (!user) {
      console.log('No user, skipping refresh');
      setLoading(false);
      return;
    }
    
    console.log('Starting refresh...');
    setLoading(true);
    try {
      console.log('Fetching communities...');
      const list = await api.listCommunities();
      console.log('Communities fetched:', list);
      
      console.log('Fetching notifications...');
      const notifs = await api.listNotifications();
      console.log('Notifications fetched:', notifs);
      
      setCommunities(list || []);
      setNotifications(notifs || []);
      console.log('Data refresh completed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      console.error('Error details:', error.message, error.code);
      // Set empty arrays on error to prevent infinite loading
      setCommunities([]);
      setNotifications([]);
      // Show error to user
      Alert.alert('Error', `Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  };

  const loadUser = async () => {
    try {
      console.log('Loading user...');
      
      // Add a timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      const userPromise = api.getCurrentUser();
      const currentUser = await Promise.race([userPromise, timeoutPromise]);
      
      console.log('Current user from API:', currentUser);
      setUser(currentUser);
      if (currentUser) {
        console.log('User found, refreshing data...');
        await refresh();
      } else {
        console.log('No user found, setting loading to false');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
      setLoading(false);
    } finally {
      setAuthLoading(false);
      console.log('Auth loading set to false');
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
