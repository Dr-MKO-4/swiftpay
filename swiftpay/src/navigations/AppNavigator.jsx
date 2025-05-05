// src/navigation/AppNavigator.jsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WalletsProvider } from '../contexts/WalletsContext';

import { AuthProvider, useAuth } from '../contexts/AuthContext';

import SplashScreen   from '../screens/SplashScreen';
import LoginScreen    from '../screens/LoginScreen';
import SignUpScreen   from '../screens/SignUpScreen';
import Fingerprint    from '../screens/FingerprintScreen';
import OTPEnterScreen from '../screens/OTPEnterScreen';
import DrawerNavigator from './DrawerNavigator';
import SendFormScreen       from '../screens/SendFormScreen';
import FaceIDAuthScreen     from '../screens/FaceIDAuthScreen';
import ReceiverEmulatorScreen     from '../screens/ReceiverEmulatorScreen';
import ReceiverConfirmScreen from '../screens/ReceiverConfirmScreen';
import EmitterEmulatorScreen  from '../screens/EmitterEmulatorScreen';
import SenderSuccessScreen    from '../screens/SenderSuccessScreen';
import TransactionScreen      from '../screens/TransactionScreens';
import WalletScreen           from '../screens/WalletScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { userToken } = useAuth();

  return (
    <NavigationContainer>
       <Stack.Navigator
   initialRouteName={ userToken ? 'Drawer' : 'Splash' }
   screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen}/>
        {!userToken ? (
  <>
    <Stack.Screen name="LoginScreen"       component={LoginScreen}/>
    <Stack.Screen name="SignUpScreen"      component={SignUpScreen}/>
    <Stack.Screen name="FingerprintScreen" component={Fingerprint}/>
    <Stack.Screen name="OTPEnterScreen"    component={OTPEnterScreen}/>
  </>
  ) : (
    <>
      <Stack.Screen name="Drawer" component={DrawerNavigator}/>
      <Stack.Screen name="SendFormScreen"    component={SendFormScreen} />
      <Stack.Screen name="FaceIDAuthScreen"  component={FaceIDAuthScreen} />
      <Stack.Screen name="ReceiverEmulatorScreen"     component={ReceiverEmulatorScreen} />
      <Stack.Screen name="ReceiverConfirmScreen"      component={ReceiverConfirmScreen} />
      <Stack.Screen name="EmitterEmulatorScreen"      component={EmitterEmulatorScreen} />
      <Stack.Screen name="SenderSuccessScreen"        component={SenderSuccessScreen} />
      <Stack.Screen name="TransactionScreen"          component={TransactionScreen} />
      <Stack.Screen name="WalletScreen"               component={WalletScreen} />
    </>
  )}

      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function Providers() {
  return (
    <WalletsProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </WalletsProvider>
  );
}
