// src/screens/SplashScreen.jsx

import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const SplashScreen = () => {
  const navigation = useNavigation();
  const { loading, userToken } = useAuth();

  const scale1 = useRef(new Animated.Value(0)).current;
  const opacity1 = useRef(new Animated.Value(1)).current; // <- Ajouté pour logo1
  const scale2 = useRef(new Animated.Value(0)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;
  
  const [animationDone, setAnimationDone] = useState(false);

  // Animation
  useEffect(() => {
    Animated.sequence([
      Animated.sequence([
        Animated.timing(scale1, { toValue: 1.2, duration: 1800, useNativeDriver: true }),
        Animated.timing(scale1, { toValue: 1.0, duration: 1400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(opacity1, { toValue: 0, duration: 200, useNativeDriver: true }),  // <- Disparition logo1
        Animated.timing(opacity2, { toValue: 1, duration: 200, useNativeDriver: true }),  // <- Apparition logo2
      ]),
      Animated.sequence([
        Animated.timing(scale2, { toValue: 1.2, duration: 800,  useNativeDriver: true }),
        Animated.timing(scale2, { toValue: 1.0, duration: 400,  useNativeDriver: true }),
      ]),
    ]).start(() => {
      setAnimationDone(true);
    });
  }, []);

  // Navigation après chargement ET animation
  useEffect(() => {
    if (!loading && animationDone) {
      navigation.replace(userToken ? 'Drawer' : 'LoginScreen');
    }
  }, [loading, animationDone, userToken]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assets/images/logoapp.png')}
        style={[styles.logo, { opacity: opacity1, transform: [{ scale: scale1 }] }]}
        resizeMode="contain"
      />
      <Animated.Image
        source={require('../assets/images/logosecure.png')}
        style={[styles.logo, { opacity: opacity2, transform: [{ scale: scale2 }] }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', alignItems:'center' },
  logo: { width:200, height:200, position:'absolute' },
});

export default SplashScreen;
