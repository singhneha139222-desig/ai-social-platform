import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import FeedScreen from './src/screens/FeedScreen';
import CreatePostScreen from './src/screens/CreatePostScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SearchScreen from './src/screens/SearchScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import MessagesScreen from './src/screens/MessagesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0052cc" />
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <SocketProvider>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: '#0052cc',
          tabBarInactiveTintColor: '#666',
          tabBarShowLabel: true
        }}
      >
        <Tab.Screen 
          name="Feed" 
          component={FeedScreen} 
          options={{ title: 'Feed' }}
        />
        <Tab.Screen 
          name="Search" 
          component={SearchScreen} 
          options={{ title: 'Search' }}
        />
        <Tab.Screen 
          name="CreatePost" 
          component={CreatePostScreen} 
          options={{ title: 'Post' }}
        />
        <Tab.Screen 
          name="Notifications" 
          component={NotificationsScreen} 
          options={{ title: 'Alerts' }}
        />
        <Tab.Screen 
          name="Messages" 
          component={MessagesScreen} 
          options={{ title: 'Chat' }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{ title: 'Profile' }}
        />
      </Tab.Navigator>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <MainNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
