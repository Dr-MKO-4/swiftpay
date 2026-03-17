// src/screens/SettingsScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Picker,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import i18nService from '../services/i18nService';
import userServices from '../services/userServices';

const t = (key) => i18nService.t(key);

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [language, setLanguage] = useState(i18nService.getLanguage());
  const [theme, setTheme] = useState('light');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      // Charger les préférences depuis l'API ou AsyncStorage
      // await userServices.getPreferences();
    } catch (err) {
      console.error('Erreur lors du chargement des préférences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (value) => {
    setLanguage(value);
    i18nService.setLanguage(value);
    // Sauvegarder la préférence
  };

  const handleThemeChange = (value) => {
    setTheme(value);
    // Sauvegarder la préférence
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirmer',
      'Êtes-vous sûr de vouloir vous déconnecter?',
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Déconnexion',
          onPress: () => {
            logout();
            navigation.replace('LoginScreen');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleChangePassword = () => {
    navigation.navigate('PasswordResetScreen');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>{t('Settings')}</Text>
        </View>

        {/* Profil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Nom d'utilisateur</Text>
              <Text style={styles.settingValue}>{user?.username}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Email</Text>
              <Text style={styles.settingValue}>{user?.email}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleChangePassword}
          >
            <Text style={styles.settingLabel}>Changer le mot de passe</Text>
          </TouchableOpacity>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Authentification biométrique</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
            />
          </View>
        </View>

        {/* Préférences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Langue</Text>
            <Picker
              selectedValue={language}
              onValueChange={handleLanguageChange}
              style={styles.picker}
            >
              <Picker.Item label="Français" value="fr" />
              <Picker.Item label="English" value="en" />
              <Picker.Item label="Español" value="es" />
            </Picker>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Thème</Text>
            <Picker
              selectedValue={theme}
              onValueChange={handleThemeChange}
              style={styles.picker}
            >
              <Picker.Item label="Clair" value="light" />
              <Picker.Item label="Sombre" value="dark" />
              <Picker.Item label="Système" value="system" />
            </Picker>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Switch
              value={notificationEnabled}
              onValueChange={setNotificationEnabled}
            />
          </View>
        </View>

        {/* À Propos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingValue}>1.0.0</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Conditions d'utilisation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingLabel}>Politique de confidentialité</Text>
          </TouchableOpacity>
        </View>

        {/* Déconnexion */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={[styles.buttonText, styles.logoutButtonText]}>
              Déconnexion
            </Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  section: {
    marginTop: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingValue: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  picker: {
    width: 150,
    height: 40,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    margin: 10,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonText: {
    color: '#fff',
  },
});

export default SettingsScreen;
