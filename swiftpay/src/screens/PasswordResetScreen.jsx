// src/screens/PasswordResetScreen.jsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import passwordResetService from '../services/passwordResetService';
import errorHandler from '../services/errorHandler';
import i18nService from '../services/i18nService';

const t = (key) => i18nService.t(key);

const PasswordResetScreen = ({ navigation, route }) => {
  const [step, setStep] = useState('email'); // 'email' -> 'code' -> 'password'
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    isValid: false,
    errors: [],
  });

  // Étape 1: Demander la réinitialisation
  const handleRequestReset = async () => {
    setErrors({});

    if (!email.trim()) {
      setErrors({ email: 'Email requis' });
      return;
    }

    setLoading(true);
    try {
      await passwordResetService.requestPasswordReset(email);
      Alert.alert(
        t('Success'),
        'Email de réinitialisation envoyé. Vérifiez votre boîte mail.'
      );
      setStep('code');
    } catch (error) {
      Alert.alert(t('Error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  // Étape 2: Mettre à jour le mot de passe
  const handleResetPassword = async () => {
    setErrors({});

    if (!resetToken.trim()) {
      setErrors({ token: 'Code requis' });
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrors({ password: 'Mots de passe requis' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ password: 'Les mots de passe ne correspondent pas' });
      return;
    }

    const validation = passwordResetService.validatePassword(newPassword);
    if (!validation.isValid) {
      setErrors({ password: validation.errors.join(', ') });
      return;
    }

    setLoading(true);
    try {
      await passwordResetService.resetPassword(resetToken, newPassword);
      Alert.alert(
        t('Success'),
        'Mot de passe réinitialisé ! Vous pouvez maintenant vous connecter.'
      );
      navigation.replace('LoginScreen');
    } catch (error) {
      Alert.alert(t('Error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (text) => {
    setNewPassword(text);
    const validation = passwordResetService.validatePassword(text);
    setPasswordStrength(validation);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('Reset Password')}</Text>
        </View>

        {step === 'email' && (
          <View style={styles.form}>
            <Text style={styles.label}>Adresse email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Enter your email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRequestReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Envoyer le lien de réinitialisation</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'code' && (
          <View style={styles.form}>
            <Text style={styles.label}>Code de réinitialisation</Text>
            <TextInput
              style={[styles.input, errors.token && styles.inputError]}
              placeholder="Collez le code reçu par email"
              value={resetToken}
              onChangeText={setResetToken}
              editable={!loading}
            />
            {errors.token && <Text style={styles.errorText}>{errors.token}</Text>}

            <Text style={styles.label}>Nouveau mot de passe</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Nouveau mot de passe"
              secureTextEntry
              value={newPassword}
              onChangeText={handlePasswordChange}
              editable={!loading}
            />

            {newPassword && (
              <View style={styles.strengthContainer}>
                {passwordStrength.errors.map((err, idx) => (
                  <Text key={idx} style={styles.strengthError}>✗ {err}</Text>
                ))}
              </View>
            )}

            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Confirmer le mot de passe"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Réinitialiser le mot de passe</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    fontSize: 16,
    color: '#007bff',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginBottom: 12,
  },
  strengthContainer: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  strengthError: {
    color: '#856404',
    fontSize: 13,
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PasswordResetScreen;
