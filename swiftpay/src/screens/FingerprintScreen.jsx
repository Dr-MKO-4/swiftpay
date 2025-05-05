// src/screens/FingerprintScreen.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import BiometricService from '../services/biometricService';
import { COLORS } from '../utils/colors';

export default function FingerprintScreen({ navigation, route }) {
  const { email, otpRequired } = route.params;
  const { verifyOtp } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Vérifier capteur
        const { available } = await BiometricService.isSupported();
        if (!available) throw new Error('Biométrie non disponible');
        // Prompt biométrie
        const { success } = await BiometricService.simplePrompt('Confirmez votre identité');
        if (!success) throw new Error('Authentification échouée');
        // une fois validé, on passe à l’OTP
        navigation.replace('OTPEnterScreen', { email });
      } catch (err) {
        Alert.alert('Erreur', err.message, [
          { text: 'Retour', onPress: () => navigation.replace('LoginScreen') }
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary}/>
        <Text style={styles.text}>Vérification biométrique…</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:COLORS.background},
  text:{marginTop:12,color:COLORS.text}
});
