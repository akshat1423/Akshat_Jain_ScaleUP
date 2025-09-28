// Import polyfills first
import './src/utils/polyfills';

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, AppRegistry } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StoreProvider, useStore } from './src/state/store';
import { StatusBar } from 'expo-status-bar';
import { LoadingIcon } from './src/components/LoadingIcons';
import CommunitiesScreen from './src/screens/CommunitiesScreen';
import CommunityDetailScreen from './src/screens/CommunityDetailScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ProfileEditScreen from './src/screens/ProfileEditScreenTest';
import AuthScreen from './src/screens/AuthScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Create stack navigator for Communities
function CommunitiesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: '#08313B',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen 
        name="CommunitiesList" 
        component={CommunitiesScreen}
        options={{
          title: 'Communities',
        }}
      />
      <Stack.Screen 
        name="CommunityDetail" 
        component={CommunityDetailScreen}
        options={({ route }) => ({
          title: route.params?.communityName || 'Community',
        })}
      />
    </Stack.Navigator>
  );
}

// Create stack navigator for Profile
function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: '#08313B',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen 
        name="ProfileEdit" 
        component={ProfileEditScreen}
        options={{
          title: 'Edit Profile',
        }}
      />
    </Stack.Navigator>
  );
}

function MainApp() {
  const { user, authLoading } = useStore();

  console.log('MainApp - user:', user, 'authLoading:', authLoading);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingIcon type="wave" color="#08313B" text="Loading..." />
      </View>
    );
  }

  if (!user) {
    console.log('No user, showing AuthScreen');
    return <AuthScreen />;
  }

  console.log('User authenticated, showing main app');

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { 
            backgroundColor: '#08313B',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#E2EDF1',
            paddingTop: 8,
            paddingBottom: 8,
            height: 60,
          },
          tabBarActiveTintColor: '#08313B',
          tabBarInactiveTintColor: '#7aa0ac',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
        }}
      >
        <Tab.Screen 
          name="Communities" 
          component={CommunitiesStack}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>🏘️</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Notifications" 
          component={NotificationsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>🔔</Text>
            ),
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileStack}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>👤</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function App() {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4B6A75',
  },
});

// Register the main component for Expo
AppRegistry.registerComponent('main', () => App);

export default App;
