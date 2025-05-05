import React, { useState, useContext } from 'react';
import {
  SafeAreaView, View, Text, Pressable, StyleSheet,
  FlatList, TextInput, RefreshControl, Alert,
  TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useThemeColors } from '../utils/colorsUser';
import { WalletsContext } from '../contexts/WalletsContext';
import SideMenuContent from '../components/SideMenuContent';
import { useAuth } from '../contexts/AuthContext';

export default function WalletScreen({ navigation }) {
  const colors = useThemeColors();
  const {
    wallets, ownWalletId, refreshWallets,
    depositToActive, selectWallet, createWallet
  } = useContext(WalletsContext);
  const { logout } = useAuth();

  const [menuVisible, setMenuVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [newCurrency, setNewCurrency] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeWallet = wallets.find(w => w.wallet_id === ownWalletId) || { balance: 0, currency: '' };

  const footerItems = [
    { label: 'Accueil', icon: 'home-outline', action: () => navigation.navigate('DashboardScreen') },
    { label: 'Transactions', icon: 'swap-horizontal-outline', action: () => navigation.navigate('TransactionScreen') },
    { label: 'Wallet', icon: 'wallet-outline', action: () => navigation.navigate('WalletScreen') },
    { label: 'Profil', icon: 'person-outline', action: () => navigation.navigate('AccountScreen') },
  ];

  const menuItems = [...footerItems, { label: 'Déconnexion', icon: 'log-out-outline', action: () => logout() }];

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshWallets();
    setRefreshing(false);
  };

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return Alert.alert('Erreur', 'Veuillez saisir un montant valide');
    setDepositing(true);
    try {
      await depositToActive(amt);
      setDepositAmount('');
      Alert.alert('Succès', `+${amt.toFixed(2)} ${activeWallet.currency}`);
    } catch (e) {
      console.error('Deposit error', e.response?.data || e);
      Alert.alert('Erreur', 'Le dépôt a échoué');
    } finally {
      setDepositing(false);
    }
  };

  const handleCreateWallet = async () => {
    if (!newCurrency) return Alert.alert('Erreur', 'Entrez un code de devise (ex: USD)');
    try {
      await createWallet(newCurrency.toUpperCase());
      setNewCurrency('');
      Alert.alert('Succès', `Portefeuille ${newCurrency.toUpperCase()} créé`);
    } catch (e) {
      console.error('Create wallet error', e.response?.data || e);
      Alert.alert('Erreur', 'La création a échoué');
    }
  };

  const renderWallet = ({ item }) => {
    const isActive = item.wallet_id === ownWalletId;
    return (
      <Pressable
        style={[styles.walletRow, { backgroundColor: isActive ? colors.primary : colors.cards, borderColor: colors.border }]}
        onPress={() => selectWallet(item.wallet_id)}
      >
        <Text style={[styles.walletText, { color: isActive ? colors.cards : colors.text }]}>
          {item.currency} — {parseFloat(item.balance).toFixed(2)}
        </Text>
        {isActive && <Icon name="checkmark-circle" size={20} color={colors.accent} />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setMenuVisible(true)}><Icon name="menu-outline" size={28} color={colors.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Portefeuille</Text>
        <Pressable onPress={() => navigation.navigate('NotificationsScreen')}><Icon name="notifications-outline" size={28} color={colors.text} /></Pressable>
      </View>

      {/* Solde actif */}
      <View style={[styles.card, { backgroundColor: colors.cards, shadowColor: colors.text }]}>
        <Text style={[styles.cardTitle, { color: colors.blanc }]}>Solde du portefeuille actif</Text>
        <Text style={[styles.balance, { color: colors.blanc }]}>{parseFloat(activeWallet.balance).toFixed(2)} {activeWallet.currency}</Text>
      </View>

      {/* Déposer */}
      <View style={styles.controls}>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Montant à ajouter"
          placeholderTextColor={colors.placeholder}
          value={depositAmount}
          onChangeText={setDepositAmount}
          keyboardType="numeric"
          editable={!depositing}
        />
        <Pressable style={[styles.depositBtn, { backgroundColor: colors.accent }]} onPress={handleDeposit} disabled={depositing}>
          <Text style={[styles.depositText, { color: colors.cards }]}>{depositing ? '...' : 'Ajouter'}</Text>
        </Pressable>
      </View>

      {/* Créer wallet */}
      <View style={[styles.controls, { marginBottom: 20 }]}>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Nouvelle devise (ex: EUR)"
          placeholderTextColor={colors.placeholder}
          value={newCurrency}
          onChangeText={setNewCurrency}
        />
        <Pressable style={[styles.depositBtn, { backgroundColor: colors.primary }]} onPress={handleCreateWallet}>
          <Text style={[styles.depositText, { color: colors.cards }]}>Créer</Text>
        </Pressable>
      </View>

      {/* Liste */}
      <FlatList
        data={wallets}
        keyExtractor={w => w.wallet_id.toString()}
        renderItem={renderWallet}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={[styles.emptyText, { color: colors.placeholder }]}>Aucun portefeuille</Text></View>}
        style={{ flex: 1, marginTop: 8 }}
      />

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.footer, borderTopColor: colors.border }]}>
        {footerItems.map(({ label, icon, action }) => (
          <Pressable key={label} style={styles.footerItem} onPress={action}>
            <Icon name={icon} size={22} color={colors.blanc} />
            <Text style={[styles.footerText, { color: colors.blanc }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Side menu */}
      {menuVisible && (
        <>
          <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}><View style={styles.backdrop} /></TouchableWithoutFeedback>
          <View style={[styles.sideMenu, { backgroundColor: colors.background }]}>
            <SideMenuContent items={menuItems} close={() => setMenuVisible(false)} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  card: { padding: 16, borderRadius: 12, marginBottom: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 14, marginBottom: 4 },
  balance: { fontSize: 32, fontWeight: '700' },
  controls: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 40, marginRight: 8 },
  depositBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  depositText: { fontSize: 14, fontWeight: '600' },
  walletRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  walletText: { fontSize: 16, fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, marginTop: 16 },
  footerItem: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  footerText: { fontSize: 12, marginTop: 4 },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sideMenu: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '80%', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 }
});
