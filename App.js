import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CommunitiesScreen from './src/screens/CommunitiesScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { StoreProvider } from './src/state/store';
import { StatusBar } from 'expo-status-bar';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <StoreProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#08313B' },
            headerTintColor: '#fff',
            tabBarActiveTintColor: '#08313B',
            tabBarInactiveTintColor: '#7aa0ac',
          }}
        >
          <Tab.Screen name="Communities" component={CommunitiesScreen} />
          <Tab.Screen name="Notifications" component={NotificationsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </StoreProvider>
  );
}
