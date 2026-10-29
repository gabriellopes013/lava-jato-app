import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ClientHomeScreen from './src/screens/ClientHomeScreen';
import AdminHomeScreen from './src/screens/AdminHomeScreen';
import EmployeeHomeScreen from './src/screens/EmployeeHomeScreen'; // Nova tela do funcionário

LogBox.ignoreLogs(['[Reanimated] Dependencies should only be used on the web']);
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login" 
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ClientHome" component={ClientHomeScreen} />
        <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
        <Stack.Screen name="EmployeeHome" component={EmployeeHomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}