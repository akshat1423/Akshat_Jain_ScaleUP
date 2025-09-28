import React from 'react';
import { Text, View, AppRegistry } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StoreProvider } from './src/state/store';
import { StatusBar } from 'expo-status-bar';

const Tab = createBottomTabNavigator();

function DummyScreen({ name }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{name} Screen</Text>
    </View>
  );
}

function App() {
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
          <Tab.Screen name="Communities" children={() => <DummyScreen name="Communities" />} />
          <Tab.Screen name="Notifications" children={() => <DummyScreen name="Notifications" />} />
          <Tab.Screen name="Profile" children={() => <DummyScreen name="Profile" />} />
        </Tab.Navigator>
      </NavigationContainer>
    </StoreProvider>
  );
}

// Register the main component
AppRegistry.registerComponent('main', () => App);

export default App;
