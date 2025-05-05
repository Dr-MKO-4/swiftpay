// src/screens/EmitterEmulatorScreen.jsx
import React, { useEffect, useRef, useContext } from 'react';
import { SafeAreaView, Text, StyleSheet, Alert, Animated } from 'react-native';
import NFCService from '../services/nfcService';
import TransactionService from '../services/transactionService';
import { useThemeColors } from '../utils/colorsUser';
import { WalletsContext } from '../contexts/WalletsContext';

export default function EmitterEmulatorScreen({ navigation, route }) {
  const { receiverId, amount } = route.params;
  const colors = useThemeColors();
  const ripple = useRef(new Animated.Value(0)).current;
  const { ownWalletId, refreshWallets } = useContext(WalletsContext);

  useEffect(() => {
    NFCService.init()
      .then(() => {
        NFCService.setApduHandler({ userId: receiverId, amount });
        NFCService.onTagDiscovered(async data => {
          if (data?.ack) {
            try {
              await TransactionService.create({
                wallet_id: ownWalletId,
                type: 'transfer',
                amount,
                status: 'completed',
                description: `Envoi à ${receiverId}`,
                related_wallet_id: receiverId
              });
              await refreshWallets();
              navigation.replace('SenderSuccessScreen');
            } catch (err) {
              Alert.alert('Erreur transaction', err.message);
              navigation.goBack();
            }
          } else {
            Alert.alert('Pas d\'ACK reçu');
          }
        });
      })
      .catch(err => {
        Alert.alert('NFC indisponible', err.toString());
        navigation.goBack();
      });
    return () => { NFCService.stop(); };
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>Envoi en cours…</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:'center', alignItems:'center' },
  text:{ fontSize:18 }
});

