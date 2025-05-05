// src/screens/ReceiverConfirmScreen.jsx
import React, { useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import NFCService from '../services/nfcService';
import { useThemeColors } from '../utils/colorsUser';
import TransactionService from '../services/transactionService';
import { WalletsContext } from '../contexts/WalletsContext';

export default function ReceiverConfirmScreen({ navigation, route }) {
  const { amount } = route.params;
  const colors = useThemeColors();
  const { ownWalletId, refreshWallets } = useContext(WalletsContext);

  useEffect(() => {
    (async () => {
      NFCService.setApduHandler({ ack: true });
      await TransactionService.create({
        wallet_id: ownWalletId,
        type: 'receive',
        amount,
        status: 'completed',
        description: `Réception de ${amount}€`,
      });
      await refreshWallets();
    })();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>Montant reçu : {amount} €</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('DashboardScreen')}>
        <Text style={styles.btnText}>Terminer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:'center', alignItems:'center' },
  text:{ fontSize:18, marginBottom:20 },
  btn:{ padding:12, borderRadius:8 },
  btnText:{ color:'#fff' }
});
