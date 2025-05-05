// src/screens/FaceIDReceiverScreen.jsx
import React, { useRef, useState, useEffect } from 'react';
import {
  SafeAreaView, View, Text, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert, Dimensions,
  Animated, Easing
} from 'react-native';
import { Camera } from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ModalMenu from '../components/ModalMenu';
import NFCService from '../services/nfcService';
import FaceService from '../services/faceAuthService';
import { useTheme } from '../utils/colorsUser';

const { width } = Dimensions.get('window');
const SIZE = width * 0.7;

export default function FaceIDReceiverScreen({ navigation }) {
  const camRef = useRef(null);
  const devices = Camera.useCameraDevices();
  const device = devices.front;

  const [hasPerm, setHasPerm] = useState(false);
  const [processing, setProcessing] = useState({ capture: false, verify: false });
  const [menuVisible, setMenuVisible] = useState(false);
  const ripple = useRef(new Animated.Value(0)).current;
  const blink  = useRef(new Animated.Value(1)).current;
  const { colors } = useTheme();

  useEffect(() => {
    Camera.requestCameraPermission().then(s => setHasPerm(s === 'authorized'));
    NFCService.init();
  }, []);

  const animateFeedback = () => {
    ripple.setValue(0);
    Animated.timing(ripple, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.circle),
      useNativeDriver: true
    }).start();
    blink.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(blink,{ toValue:0.3, duration:400, useNativeDriver:true }),
        Animated.timing(blink,{ toValue:1,   duration:400, useNativeDriver:true }),
      ])
    ).start();
  };

  const captureAndVerify = async () => {
    if (!camRef.current) return;

    animateFeedback();
    setProcessing(p => ({ ...p, capture: true }));
    const frames = [];
    for (let i = 0; i < 10; i++) {
      try {
        const pic = await camRef.current.takeSnapshot({ quality:0.5, skipMetadata:true });
        const b64 = await RNFS.readFile(pic.path, 'base64');
        frames.push(`data:image/jpeg;base64,${b64}`);
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.warn('Frame capture failed', err);
      }
    }

    setProcessing(p => ({ ...p, verify: true }));
    try {
      const json = await FaceService.verifyLiveness(frames);
      if (json.success) {
        navigation.replace('EmitterEmulatorScreen', { receiverId: json.userId });
      } else {
        Alert.alert('Échec Face ID', json.message);
      }
    } catch (err) {
      console.error('FaceID service error', err);
      Alert.alert('Erreur', 'Impossible de joindre le serveur FaceID');
    } finally {
      setProcessing({ capture: false, verify: false });
    }
  };

  if (!device || !hasPerm) {
    return (
      <SafeAreaView style={[styles.full, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary}/>
        <Text style={[styles.loading, { color: colors.text }]}>Initialisation caméra…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={()=>setMenuVisible(true)}>
          <Ionicons name="menu-outline" size={28} color="#fff"/>
        </TouchableOpacity>
        <Text style={styles.logo}>SwiftPay</Text>
        <TouchableOpacity onPress={()=>navigation.navigate('NotificationsScreen')}>
          <Ionicons name="notifications-outline" size={28} color="#fff"/>
        </TouchableOpacity>
      </View>

      <View style={styles.faceContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Face ID – Réception</Text>
        <View style={styles.frame}>
          <Camera
            ref={camRef}
            style={styles.preview}
            device={device}
            isActive={!processing.capture && !processing.verify}
            photo
          />
          {(processing.capture||processing.verify) && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#fff"/>
              <Text style={styles.overlayText}>
                {processing.capture ? 'Clignez…' : 'Vérification…'}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.btn, (processing.capture||processing.verify) && { opacity:0.6 }]}
          onPress={captureAndVerify}
          disabled={processing.capture||processing.verify}
        >
          <Ionicons name="camera" size={24} color="#fff"/>
          <Text style={styles.btnText}>
            {processing.capture||processing.verify ? 'Patientez…' : 'Démarrer'}
          </Text>
        </TouchableOpacity>
      </View>

      <ModalMenu
        visible={menuVisible}
        onClose={()=>setMenuVisible(false)}
        items={[
          { label:'Accueil', icon:'home-outline', action:()=>navigation.navigate('DashboardScreen') },
          { label:'Transactions', icon:'swap-horizontal-outline', action:()=>navigation.navigate('TransactionScreen') },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  full:          { flex:1, justifyContent:'center', alignItems:'center' },
  loading:       { marginTop:12 },
  container:     { flex:1 },
  header:        { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16 },
  logo:          { color:'#fff', fontSize:20, fontWeight:'bold' },
  faceContainer: { alignItems:'center', padding:20 },
  title:         { fontSize:22, marginBottom:12 },
  frame:         { width:SIZE, height:SIZE, borderRadius:SIZE/2, overflow:'hidden', borderWidth:3, borderColor:'#ccc', marginBottom:16 },
  preview:       { flex:1 },
  overlay:       { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'center', alignItems:'center' },
  overlayText:   { color:'#fff', marginTop:8 },
  btn:           { flexDirection:'row', backgroundColor:'#8b3fbe', padding:12, borderRadius:8 },
  btnText:       { color:'#fff', marginLeft:8 },
});
