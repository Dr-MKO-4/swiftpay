// src/screens/ReceiverEmulatorScreen.jsx
import React, { useEffect, useContext } from 'react';
import { SafeAreaView, Text, StyleSheet, Alert, Animated } from 'react-native';
import NFCService from '../services/nfcService';
import { useTheme } from '../utils/colorsUser';
import { WalletsContext } from '../contexts/WalletsContext';

export default function ReceiverEmulatorScreen({ navigation, route }) {
  const { userId } = route.params;
  const { colors } = useTheme();
  useEffect(() => {
    NFCService.init()
      .then(() => {
        NFCService.setApduHandler({ userId });
        NFCService.onTagDiscovered(data => {
          if (data?.amount) navigation.replace('ReceiverConfirmScreen', { amount: data.amount });
          else Alert.alert('Donnée invalide');
        });
      })
      .catch(err => { Alert.alert('NFC indisponible', err.toString()); navigation.goBack(); });
    return () => { NFCService.stop(); };
  }, []);
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>Prêt à recevoir…</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:'center', alignItems:'center' },
  text:{ fontSize:18 }
});
