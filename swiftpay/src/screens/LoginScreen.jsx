// src/screens/LoginScreen.jsx
import React, { useState, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, KeyboardAvoidingView, Platform, Alert 
} from 'react-native';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../utils/colors';

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();

  const handleLogin = useCallback(async () => {
    console.log('🔐 handleLogin pressed', { email, password });
    if (!email || !password) {
      return Alert.alert('Erreur', 'Tous les champs sont requis');
    }
    setLoading(true);
    try {
      const res = await login(email, password);
      console.log('📨 login response', res);

      if (res.otpRequired) {
        // passe à l’empreinte/OTP
        navigation.navigate('FingerprintScreen', { 
          email,
          loginToken: res.token,
          otpRequired: true 
        });
      } else {
        // pas d’OTP, va direct au dashboard
        navigation.navigate('DashboardScreen');
      }
    } catch (err) {
      console.warn('❌ login error', err);
      Alert.alert('Erreur', err.message || 'Échec de la connexion');
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigation]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        <LottieView 
          source={require('../assets/animations/login.json')} 
          autoPlay 
          loop 
          style={styles.animation}
        />

        <View style={styles.titleContainer}>
          <Icon name="log-in-outline" size={32} color={COLORS.violet} />
          <Text style={styles.title}>Connexion</Text>
        </View>

        <View style={styles.inputRow}>
          <Icon name="mail-outline" size={20} color={COLORS.violet} style={styles.inputIcon} />
          <TextInput
            placeholder="Email"
            placeholderTextColor={COLORS.placeholder}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputRow}>
          <Icon name="lock-closed-outline" size={20} color={COLORS.violet} style={styles.inputIcon} />
          <TextInput
            placeholder="Mot de passe"
            placeholderTextColor={COLORS.placeholder}
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Icon name="arrow-forward-circle" size={22} color="#FFF" style={loading && { opacity: 0.6 }} />
          <Text style={styles.buttonText}>
            {loading ? 'Chargement...' : 'Se connecter'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('SignUpScreen')} disabled={loading}>
          <Text style={styles.link}>Pas de compte ? Inscription</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: 40 },
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  animation: { width: 200, height: 200, marginBottom: 20 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 34, fontWeight: '800', color: COLORS.violet, marginLeft: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 8
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: COLORS.text },
  button: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20
  },
  buttonDisabled: { backgroundColor: COLORS.secondary },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  link: { color: COLORS.violet, marginTop: 20, fontSize: 14 }
});
