// src/screens/SignUpScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView, ActivityIndicator
} from 'react-native';
import { Camera, useCameraDevices, useCameraDevice } from 'react-native-vision-camera';
import LottieView from 'lottie-react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import AuthService from '../services/authService';
import FaceAuthService from '../services/faceAuthService';
import { COLORS } from '../utils/colors';
import BiometricService from '../services/biometricService';
import { captureFrameToBase64 } from '../services/faceHelpers'

export default function SignUpScreen({ navigation }) {
  const cameraRef = useRef(null);
  // Vous pouvez soit utiliser useCameraDevices, soit useCameraDevice('back')
  const devices = useCameraDevices();
  const deviceList = devices.back || devices.front ? devices : null;
  const device = useCameraDevice('front');

  const { requestOtp, verifySignupOtp, updatePreferences, confirmSignup } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ username:'', fullName:'', phone:'', email:'', password:'', confirmPassword:'' });
  const [loading, setLoading] = useState(false);
  const [signupToken, setSignupToken] = useState(null);
  const [otpToken, setOtpToken] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [prefs, setPrefs] = useState({ language:'fr', theme:'light' });
  const [faceImage, setFaceImage] = useState(null);
  const [pwdStrength, setPwdStrength] = useState(0);

  const calcStrength = pwd => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  // Demande initiale de permission caméra
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      if (status !== 'authorized') {
        Alert.alert('Permission refusée', 'La caméra est nécessaire pour Face ID');
      }
    })();
  }, []);

  // Re-demande de permission au passage à l'étape 3
  useEffect(() => {
    if (step === 2) {
      (async () => {
        const status = await Camera.requestCameraPermission();
        if (status !== 'authorized') {
          Alert.alert('Permission refusée', 'Activez la caméra dans les réglages');
        }
      })();
    }
  }, [step]);

  // Debug devices
  useEffect(() => {
    console.log('Camera devices list:', devices);
    console.log('Single device back:', device);
  }, [devices, device]);

  // 1. Création du compte
  const onSubmitForm = async () => {
    const { username, fullName, phone, email, password, confirmPassword } = form;
    if (!username || !fullName || !phone || !email || !password || !confirmPassword) {
      return Alert.alert('Erreur', 'Tous les champs sont requis');
    }
    if (password !== confirmPassword) {
      return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
    }
    setLoading(true);
    try {
      const res = await AuthService.register(email, password, fullName, username, phone);
      if (res.success) {
        setSignupToken(res.token);
        setStep(1);
      } else {
        Alert.alert('Erreur', res.message);
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Enrôlement biométrie
  const onEnrollBiometric = async () => {
    setLoading(true);
    try {
      const { publicKey } = await BiometricService.createKeys();
      const { success, signature } = await BiometricService.simplePrompt('Validez la création de la clé');
      if (!success) throw new Error('Authentification biométrique refusée');
      await AuthService.registerBiometricWithToken(
        publicKey,
        { deviceInfo: '...', signature },
        signupToken
      );
      setStep(2);
    } catch (err) {
      Alert.alert('Erreur biométrie', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Capture Face ID
  const onCaptureFace = async () => {
       try {
         const base64 = await captureFrameToBase64(cameraRef);
         setFaceImage(base64);
         const res=await AuthService.registerFaceWithToken(base64, signupToken);
    
         // enregistrement direct en base via Express
         if (res.success) {
           Alert.alert('Succès', 'Face ID enregistré !');
           setStep(3);
         } else {
           Alert.alert('Erreur', res.message || 'Échec de l’enregistrement');
         }
       } catch (err) {
         Alert.alert('Erreur', err.message || 'Impossible d’enregistrer la face');
       }
     };

  // 4. Envoi OTP
  const onSendOtp = async () => {
    setLoading(true);
    try {
      const res = await requestOtp(form.email);
      if (res.success) {
        setOtpToken(res.token);
        setStep(4);
      } else {
        Alert.alert('Erreur', res.message);
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Vérif OTP
  const onVerifyOtp = async () => {
    if (!otpCode) return Alert.alert('Erreur', 'Entrez le code OTP');
    setLoading(true);
    try {
      const res = await verifySignupOtp(form.email, otpCode);
      if (res.success && res.token) {
        setOtpToken(res.token);
        setStep(5);
      } else {
        Alert.alert('Erreur', 'OTP invalide');
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

 // 6. Préfs + confirmation finale
  const onFinish = async () => {
      setLoading(true);
      try {
        // d’abord on stocke le token et on hydrate le contexte
        await confirmSignup(otpToken);
        // maintenant updatePreferences utilisera le JWT en AsyncStorage
        Alert.alert('Bienvenue', 'Inscription terminée !');
        await updatePreferences(prefs.language, prefs.theme);
        navigation.replace('LoginScreen');
      } catch (err) {
        Alert.alert('Erreur', err.message);
      } finally {
        setLoading(false);
      }
    };
  const renderButton = (label, onPress) => (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{label}</Text>}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepIndicator}>Étape {step + 1}/6</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: `${((step + 1) / 6) * 100}%` }]} />
        </View>

        {step === 0 && (
          <>
            <LottieView source={require('../assets/animations/signup.json')} autoPlay loop style={styles.animation} />
            {['username', 'fullName', 'phone', 'email', 'password', 'confirmPassword'].map(key => {
              const isPwd = key.toLowerCase().includes('password');
              let iconName;
              switch(key) {
                case 'username':
                case 'fullName': iconName = 'person-outline'; break;
                case 'phone': iconName = 'call-outline'; break;
                case 'email': iconName = 'mail-outline'; break;
                case 'password':
                case 'confirmPassword': iconName = 'lock-closed-outline'; break;
                default: iconName = 'help-circle-outline';
              }
              return (
                <View key={key} style={styles.inputWrapper}>
                  <Icon
                    name={iconName}
                    size={20}
                    color={COLORS.violet}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder={{
                      username: "Nom d'utilisateur",
                      fullName:  'Nom complet',
                      phone:     'Téléphone',
                      email:     'Email',
                      password:  'Mot de passe',
                      confirmPassword: 'Confirmez mot de passe'
                    }[key]}
                    secureTextEntry={isPwd}
                    style={styles.input}
                    value={form[key]}
                    onChangeText={t => {
                      if (key === 'password') setPwdStrength(calcStrength(t));
                      setForm(f => ({ ...f, [key]: t }));
                    }}
                    keyboardType={ key === 'email' ? 'email-address'
                                   : key === 'phone' ? 'phone-pad'
                                   : 'default' }
                    placeholderTextColor={COLORS.placeholder}
                  />
                </View>
              );
            })}
            <Text style={styles.strengthLabel}>Force du mot de passe ≥ 3/4</Text>
            <View style={styles.strengthBarContainer}>
              <View style={[styles.strengthBar, { width: `${(pwdStrength / 4) * 100}%` }]} />
            </View>
            {renderButton('Suivant', onSubmitForm)}
          </>
        )}

        {step === 1 && (
          <>
            <LottieView source={require('../assets/animations/biometric.json')} autoPlay loop style={styles.animation} />
            <Icon name="finger-print" size={120} color={COLORS.violet} style={{ marginBottom:20 }} />
            <Text style={styles.title}>Étape 2 : Biométrie</Text>
            {renderButton('Enrôler biométrie', onEnrollBiometric)}
          </>
        )}

        {step === 2 && (
          // Center camera container
          <View style={styles.cameraContainer}>
            {!device
              ? <ActivityIndicator size="large" />
              : (
                <>
                  <Text style={styles.title}>Étape 3 : Face ID</Text>
                  {/* <LottieView source={require('../assets/animations/faceidcapture.json')} autoPlay loop style={styles.animation} /> */}
                  <View style={styles.cameraWrapper}>
                    <Camera
                      style={styles.camera}
                      device={device}
                      isActive={true}
                      photo={true}
                      ref={cameraRef}
                    />
                  </View>
                    <View style={styles.buttonRow}>{renderButton('Prendre & Vérifier', onCaptureFace)}</View>
                </>
              )}
          </View>
        )}

        {step === 3 && (
          <>
            <Text style={styles.title}>Étape 4 : Envoi OTP</Text>
            <LottieView source={require('../assets/animations/otp.json')} autoPlay loop style={styles.animationSmall} />
            {renderButton('Envoyer le code', onSendOtp)}
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.title}>Étape 5 : Vérif OTP</Text>
            <View style={styles.inputWrapper}>
              <Icon name="key-outline" size={20} color={COLORS.violet} style={styles.inputIcon} />
              <TextInput
                placeholder="Code OTP"
                placeholderTextColor={COLORS.placeholder}
                style={styles.input}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
              />
            </View>
            {renderButton('Vérifier', onVerifyOtp)}
            {renderButton('Renvoyer le code', onSendOtp)}
          </>
        )}

        {step === 5 && (
          <>
            <Text style={styles.title}>Étape 6 : Préférences</Text>
            <View style={styles.pickerRow}>
              <Text style={styles.label}>Langue</Text>
              <Picker selectedValue={prefs.language} style={styles.picker} onValueChange={v => setPrefs(p => ({ ...p, language: v }))}>
                <Picker.Item label="Français" value="fr" />
                <Picker.Item label="Anglais" value="en" />
                <Picker.Item label="Español" value="es" />
              </Picker>
            </View>
            <View style={styles.pickerRow}>
              <Text style={styles.label}>Thème</Text>
              <Picker selectedValue={prefs.theme} style={styles.picker} onValueChange={v => setPrefs(p => ({ ...p, theme: v }))}>
                <Picker.Item label="Clair" value="light" />
                <Picker.Item label="Sombre" value="dark" />
                <Picker.Item label="Système" value="system" />
              </Picker>
            </View>
            {renderButton('Terminer', onFinish)}
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: COLORS.background },
  inner: { alignItems:'center', padding:20, paddingBottom:40 },
  stepIndicator: { alignSelf:'flex-start', marginLeft:20, fontSize:14, color: COLORS.text, marginBottom:4 },
  progressBar: { width:'90%', height:4, backgroundColor: COLORS.secondary, borderRadius:2, overflow:'hidden', marginBottom:16 },
  progress: { height:4, backgroundColor: COLORS.primary },
  animation: { width:200, height:200, marginBottom:20 },
  animationSmall: { width:150, height:150, marginBottom:20 },
  title: { fontSize:26, fontWeight:'700', color: COLORS.violet, marginBottom:16, textAlign:'center' },
  cameraContainer: { flex:1, width:'100%', justifyContent:'center', alignItems:'center', marginTop:20 },
  cameraWrapper: { width:300, height:400, overflow:'hidden', borderRadius:12 },
  camera: { width:'100%', height:'100%' },
  inputWrapper: { flexDirection:'row', alignItems:'center', width:'100%', backgroundColor: COLORS.secondary, borderRadius:8, marginBottom:15 },
  inputIcon: { marginHorizontal:10 },
  input: { flex:1, paddingVertical:12, fontSize:16, color: COLORS.text },
  strengthLabel: { alignSelf:'flex-start', marginLeft:20, marginBottom:4, color: COLORS.text },
  strengthBarContainer: { width:'90%', height:6, backgroundColor: COLORS.secondary, borderRadius:3, overflow:'hidden', marginBottom:12 },
  strengthBar: { height:6, backgroundColor: COLORS.primary },
  button: { width:'100%', backgroundColor: COLORS.primary, paddingVertical:15, borderRadius:8, alignItems:'center', marginTop:10 },
  buttonDisabled: { backgroundColor: COLORS.secondary },
  buttonText: { color:'#FFF', fontSize:16, fontWeight:'600' },
  pickerRow: { width:'100%', marginBottom:16 },
  label: { fontSize:14, color: COLORS.text, marginBottom:4 },
  picker: { width:'100%', backgroundColor: COLORS.secondary, borderRadius:8 },
  camera: { width:300, height:400, marginBottom:10 },
  buttonRow: { flexDirection:'row', justifyContent:'space-around', width:'100%' },
});
