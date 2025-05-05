// src/navigation/DrawerNavigator.jsx
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { useThemeColors } from '../utils/colorsUser';

import DashboardScreen      from '../screens/DashboardScreen';
import SenderReadScreen     from '../screens/SenderReadScreen';
import FaceIDReceiverScreen from '../screens/FaceIDReceiverScreen';

const Drawer = createDrawerNavigator();
const Tab    = createBottomTabNavigator();

function Tabs() {
  const colors = useThemeColors();  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle:    { backgroundColor: colors.background },
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.placeholder,
        tabBarIcon: ({ colors, size }) => {
          const iconName = route.name === 'Send' ? 'arrow-up-circle' : 'arrow-down-circle';
          return <Icon name={iconName} size={size} color={colors}/>;
        },
      })}
    >
      <Tab.Screen name="Send"    component={SenderReadScreen}/>
      <Tab.Screen name="Receive" component={FaceIDReceiverScreen}/>
    </Tab.Navigator>
  );
}

export default function DrawerNavigator() {
  const colors = useThemeColors();

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: colors.background },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.text,
        drawerLabelStyle: { fontSize: 16, color: colors.text },
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen}/>
      <Drawer.Screen 
        name="Tabs"      
        component={Tabs}         
        options={{ drawerLabel: 'Envoyer / Recevoir' }}
      />
    </Drawer.Navigator>
  );
}
