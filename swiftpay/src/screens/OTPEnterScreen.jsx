// src/screens/OTPEnterScreen.jsx
import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../utils/colors';

export default function OTPEnterScreen({ navigation, route }) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { verifyOtp, requestOtp } = useAuth();      // on importe requestOtp

  const handleVerify = async () => {
    if (!code) return Alert.alert('Erreur', 'Entrez le code OTP');
    setLoading(true);
    try {
      const res = await verifyOtp(email, code);
      if (res.success) {
        // navigation.replace('DashboardScreen');
      } else {
        Alert.alert('Erreur', res.message || 'OTP invalide');
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const res = await requestOtp(email);
      if (res.success) {
        Alert.alert('Succès', 'Le code OTP a été renvoyé à ' + email);
      } else {
        Alert.alert('Erreur', res.message || 'Impossible de renvoyer le code');
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Code OTP envoyé à {email}</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="Entrez le code"
        placeholderTextColor={COLORS.placeholder}
        value={code}
        onChangeText={setCode}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? '…' : 'Vérifier'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.buttonOutline, loading && styles.buttonDisabled]}
        onPress={handleResend}
        disabled={loading}
      >
        <Text style={[styles.buttonOutlineText, { color: COLORS.violet }]}>
          {loading ? '…' : 'Renvoyer le code'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', padding: 20,
    backgroundColor: COLORS.background
  },
  label: {
    marginBottom: 12, color: COLORS.text, fontSize: 16
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    color: COLORS.text
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  buttonDisabled: {
    backgroundColor: COLORS.secondary
  },
  buttonText: {
    color: '#FFF', fontWeight: '600'
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: COLORS.violet,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonOutlineText: {
    fontWeight: '600'
  }
});
