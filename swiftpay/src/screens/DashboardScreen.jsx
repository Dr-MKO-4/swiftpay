// src/screens/DashboardScreen.js
import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  FlatList,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import NFCService from '../services/nfcService';
import ModalMenu from '../components/ModalMenu';
import { useThemeColors } from '../utils/colorsUser';
import { WalletsContext } from '../contexts/WalletsContext';
import TransactionService from '../services/transactionService';

export default function DashboardScreen({ navigation }) {
  const colors = useThemeColors();
  const { wallets, ownWalletId, refreshWallets } = useContext(WalletsContext);
  const [mode, setMode] = useState('send');
  const [scanning, setScanning] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const ripple = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // menu items pour footer et menu latéral
  const menuItems = [
    { label: 'Accueil', icon: 'home-outline', action: () => { console.log('Footer/Menu: Accueil'); navigation.navigate('DashboardScreen'); } },
    { label: 'Transactions', icon: 'swap-horizontal-outline', action: () => { console.log('Footer/Menu: Transactions'); navigation.navigate('TransactionScreen'); } },
    { label: 'Portefeuille', icon: 'wallet-outline', action: () => { console.log('Footer/Menu: Wallet'); navigation.navigate('WalletScreen'); } },
    { label: 'Profil', icon: 'person-circle-outline', action: () => { console.log('Footer/Menu: Profil'); navigation.navigate('AccountScreen'); } },
  ];

  const activeWallet = wallets.find(w => w.wallet_id === ownWalletId) || { balance: 0, currency: 'XAF' };

  const fetchRecent = async () => {
    try {
      const list = await TransactionService.list({});
      setTransactions(list.slice(0, 5));
    } catch (err) {
      console.error('Erreur fetchRecent', err);
    }
  };

  useEffect(() => {
    NFCService.init();
    fetchRecent();

    NFCService.onTagDiscovered(data => {
      console.log('Passive NFC tag discovered', data);
      if (data) {
        Alert.alert('Tag NFC détecté', `Montant : ${data.amount} ${data.currency}`);
      }
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      NFCService.stop();
    };
  }, []);

  const startRipple = () => {
    ripple.setValue(0);
    Animated.timing(ripple, {
      toValue: 1,
      duration: 1200,
      easing: Easing.out(Easing.circle),
      useNativeDriver: true
    }).start();
  };
  const stopRipple = () => {
    ripple.stopAnimation();
    ripple.setValue(0);
  };

  const handleNfc = async () => {
    console.log('NFC button pressed, mode =', mode);
    if (scanning) return;
    setScanning(true);
    startRipple();
    try {
      if (mode === 'send') {
        const amount = parseFloat(activeWallet.balance) * 0.01;
        console.log('Writing NDEF payload:', amount, activeWallet.currency);
        const payload = { amount, currency: activeWallet.currency, ts: Date.now() };
        await NFCService.writeNdef(payload);
        await TransactionService.create({
          wallet_id: ownWalletId,
          type: 'transfer',
          amount,
          status: 'completed',
          description: `Envoi NFC ${amount.toFixed(2)} ${activeWallet.currency}`,
          related_wallet_id: null
        });
      } else {
        console.log('Reading NDEF...');
        const data = await NFCService.readNdef();
        console.log('NDEF read data:', data);
        const received = parseFloat(data.amount) || 0;
        await TransactionService.create({
          wallet_id: ownWalletId,
          type: 'receive',
          amount: received,
          status: 'completed',
          description: `Réception NFC ${received.toFixed(2)} ${data.currency}`,
          related_wallet_id: null
        });
      }
      await refreshWallets();
      fetchRecent();
      Alert.alert('Succès', mode === 'send' ? 'Envoi réussi' : 'Réception enregistrée');
    } catch (e) {
      console.error('Erreur handleNfc', e);
      Alert.alert('Erreur NFC', e.message);
    } finally {
      setScanning(false);
      stopRipple();
      NFCService.stop();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { console.log('Menu open'); setMenuVisible(true); }}>
          <Icon name="menu-outline" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>SwiftPay</Text>
        <Pressable onPress={() => { console.log('Go Notifications'); navigation.navigate('NotificationsScreen'); }}>
          <Icon name="notifications-outline" size={28} color={colors.text} />
        </Pressable>
      </View>

      {/* Solde */}
      <View style={[styles.card, { backgroundColor: colors.cards, shadowColor: colors.text }]}>
        <Text style={[styles.cardTitle, { color: colors.blanc }]}>Solde actuel</Text>
        <Text style={[styles.balance, { color: colors.blanc }]}>
          {parseFloat(activeWallet.balance || 0).toFixed(2)} {activeWallet.currency}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.accent }]}
          onPress={() => { console.log('Mode set to send'); setMode('send'); }}
        >
          <Icon name="send-outline" size={24} color={colors.noir} />
          <Text style={[styles.actionText, { color: colors.noir }]}>Envoyer</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.vert }]}
          onPress={() => { console.log('Mode set to receive'); setMode('receive'); }}
        >
          <Icon name="download-outline" size={24} color={colors.noir} />
          <Text style={[styles.actionText, { color: colors.noir }]}>Recevoir</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => { console.log('Go History'); navigation.navigate('TransactionScreen'); }}
        >
          <Icon name="time-outline" size={24} color={colors.noir} />
          <Text style={[styles.actionText, { color: colors.noir }]}>Historique</Text>
        </Pressable>
      </View>

      {/* Instruction */}
      <Text style={[styles.instruction, { color: colors.placeholder }]}>
        {mode === 'send' ? 'Approchez pour envoyer' : 'Approchez pour recevoir'}
      </Text>

      {/* NFC Button */}
      <View style={styles.nfcArea}>
        <Animated.View style={[styles.ripple, {
          transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 5] }) }],
          opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] })
        }]} />
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Pressable
            style={[styles.nfcButton, { backgroundColor: mode === 'send' ? colors.accent : colors.cards }]}
            onPress={handleNfc}
            disabled={scanning}
          >
            <Icon name={mode === 'send' ? 'send-outline' : 'download-outline'} size={40} color="#fff" />
          </Pressable>
        </Animated.View>
      </View>

      {/* Transactions récentes */}
      <FlatList
        data={transactions}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={[styles.txRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Icon
              name={item.type === 'credit' ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={20}
              color={item.type === 'credit' ? colors.primary : colors.accent}
            />
            <View style={styles.txInfo}>
              <Text style={[styles.txDesc, { color: colors.text }]}>{item.description}</Text>
              <Text style={[styles.txDate, { color: colors.placeholder }]}>
                {new Date(item.created_at).toLocaleDateString('fr-FR',{ day: '2-digit', month: 'short' }).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.txAmount, { color: item.type === 'credit' ? colors.primary : colors.accent }]}>
              {item.type === 'credit' ? '+' : '-'}{parseFloat(item.amount).toFixed(2)} XAF
            </Text>
          </View>
        )}
        style={{ marginTop: 8, flex: 1 }}
      />

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.footer, borderTopColor: colors.border }]}>
        {menuItems.map(({ label, icon, action }) => (
          <Pressable key={label} style={styles.footerItem} onPress={action}>
            <Icon name={icon} size={22} color={colors.blanc} />
            <Text style={[styles.footerText, { color: colors.blanc }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ModalMenu visible={menuVisible} onClose={() => setMenuVisible(false)} items={menuItems} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  card: { padding: 16, borderRadius: 12, marginBottom: 8, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 14, marginBottom: 4 },
  balance: { fontSize: 32, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  actionBtn: { alignItems: 'center', width: 100, padding: 8, borderRadius: 8 },
  actionText: { marginTop: 4, fontSize: 12 },
  instruction: { textAlign: 'center', marginBottom: 12 },
  nfcArea: { alignItems: 'center', marginBottom: 16 },
  nfcButton: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  ripple: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.1)' },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  txInfo: { flex: 1, marginLeft: 8 },
  txDesc: { fontSize: 14 },
  txDate: { fontSize: 12 },
  txAmount: { fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, marginTop: 16 },
  footerItem: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  footerText: { fontSize: 12, marginTop: 4 },
});
