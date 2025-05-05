// src/screens/SenderReadScreen.jsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import NFCService from '../services/nfcService';
import { useTheme } from '../utils/colorsUser';

export default function SenderReadScreen({ navigation }) {
  const { colors } = useTheme();
  useEffect(() => {
    NFCService.readNdef()
      .then(data => {
        if (data?.userId) navigation.replace('SendFormScreen', { receiverId: data.userId });
        else throw new Error('Donnée NFC invalide');
      })
      .catch(err => { Alert.alert('NFC Error', err.message); navigation.goBack(); });
    return () => { NFCService.stop(); };
  }, []);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>Approchez pour lire le destinataire…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:'center', alignItems:'center' },
  text:{ fontSize:16 }
});
