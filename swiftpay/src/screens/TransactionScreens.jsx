import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ModalMenu from '../components/ModalMenu';
import { useThemeColors } from '../utils/colorsUser';
import { WalletsContext } from '../contexts/WalletsContext';
import TransactionService from '../services/transactionService';

export default function TransactionScreen({ navigation }) {
  const colors = useThemeColors();
  const { ownWalletId } = useContext(WalletsContext);
  const [menuVisible, setMenuVisible] = useState(false);

  // Définition du menu
  const menuItems = [
    { label: 'Accueil', icon: 'home-outline', action: () => navigation.navigate('DashboardScreen') },
    { label: 'Transactions', icon: 'swap-horizontal-outline', action: () => navigation.navigate('TransactionScreen') },
    { label: 'Portefeuille', icon: 'wallet-outline', action: () => navigation.navigate('WalletScreen') },
    { label: 'Profil', icon: 'person-circle-outline', action: () => navigation.navigate('AccountScreen') },
  ];

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'credit' | 'debit'

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = { wallet_id: ownWalletId };
      if (filterType !== 'all') params.type = filterType;
      if (search) params.q = search;
      const list = await TransactionService.list(params);
      setTransactions(list);
    } catch (err) {
      console.error('Erreur fetch transactions', err);
      Alert.alert('Erreur', 'Impossible de charger les transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const renderItem = ({ item }) => (
    <View style={[styles.txRow, { backgroundColor: colors.card, borderColor: colors.border }]}>      
      <Icon
        name={item.type === 'credit' ? 'arrow-down-circle' : 'arrow-up-circle'}
        size={20}
        color={item.type === 'credit' ? colors.primary : colors.accent}
      />
      <View style={styles.txInfo}>
        <Text style={[styles.txDesc, { color: colors.text }]}>{item.description}</Text>
        <Text style={[styles.txDate, { color: colors.placeholder }]}>          
          {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: item.type === 'credit' ? colors.primary : colors.accent }]}>        
        {item.type === 'credit' ? '+' : '-'}{parseFloat(item.amount).toFixed(2)} {item.currency || ''}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setMenuVisible(true)}>
          <Icon name="menu-outline" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Transactions</Text>
        <Pressable onPress={() => navigation.navigate('NotificationsScreen')}>
          <Icon name="notifications-outline" size={28} color={colors.text} />
        </Pressable>
      </View>

      {/* Search & Filters */}
      <View style={styles.controls}>
        <TextInput
          style={[styles.searchInput, { borderColor: colors.border, color: colors.text }]}
          placeholder="Rechercher..."
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchTransactions}
          returnKeyType="search"
        />
        <View style={styles.filterRow}>
          {['all', 'credit', 'debit'].map(type => (
            <Pressable
              key={type}
              style={[
                styles.filterBtn,
                { backgroundColor: filterType === type ? colors.primary : colors.cards }
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[styles.filterText, { color: filterType === type ? colors.cards : colors.text }]}>                
                {type === 'all' ? 'Toutes' : type === 'credit' ? 'Entrées' : 'Sorties'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={transactions}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.placeholder }]}>Aucune transaction</Text>
          </View>
        )}
        style={{ flex: 1 }}
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
  controls: { marginBottom: 12 },
  searchInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 40, marginBottom: 8 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-around' },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  filterText: { fontSize: 12, fontWeight: '600' },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  txInfo: { flex: 1, marginLeft: 8 },
  txDesc: { fontSize: 14, fontWeight: '500' },
  txDate: { fontSize: 12, marginTop: 4 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, marginTop: 16 },
  footerItem: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  footerText: { fontSize: 12, marginTop: 4 },
});
