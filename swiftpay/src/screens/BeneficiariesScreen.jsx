// src/screens/BeneficiariesScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import errorHandler from '../services/errorHandler';
import i18nService from '../services/i18nService';

const t = (key) => i18nService.t(key);

const BeneficiariesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState({
    beneficiaryUserId: '',
    nickname: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadBeneficiaries();
  }, []);

  const loadBeneficiaries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/beneficiaries');
      setBeneficiaries(response.data.data || []);
    } catch (error) {
      Alert.alert(t('Error'), errorHandler.getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAddBeneficiary = async () => {
    setErrors({});

    if (!newBeneficiary.beneficiaryUserId) {
      setErrors({ beneficiaryUserId: 'ID requis' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/beneficiaries', newBeneficiary);
      Alert.alert(t('Success'), 'Bénéficiaire ajouté');
      setNewBeneficiary({ beneficiaryUserId: '', nickname: '' });
      setModalVisible(false);
      loadBeneficiaries();
    } catch (error) {
      Alert.alert(t('Error'), errorHandler.getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBeneficiary = (beneficiaryId) => {
    Alert.alert(
      'Confirmer',
      'Êtes-vous sûr de vouloir supprimer ce bénéficiaire?',
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              await api.delete(`/beneficiaries/${beneficiaryId}`);
              Alert.alert(t('Success'), 'Bénéficiaire supprimé');
              loadBeneficiaries();
            } catch (error) {
              Alert.alert(t('Error'), errorHandler.getErrorMessage(error));
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderBeneficiary = ({ item }) => (
    <View style={styles.beneficiaryCard}>
      <View style={styles.beneficiaryInfo}>
        <Text style={styles.beneficiaryName}>
          {item.nickname || item.full_name || item.username}
        </Text>
        <Text style={styles.beneficiaryEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleRemoveBeneficiary(item.beneficiary_id)}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('Beneficiaries')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {loading && !modalVisible ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : beneficiaries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucun bénéficiaire</Text>
          <TouchableOpacity
            style={styles.addButtonLarge}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.buttonText}>{t('Add Beneficiary')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={beneficiaries}
          renderItem={renderBeneficiary}
          keyExtractor={(item) => item.beneficiary_id.toString()}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Modal pour ajouter un bénéficiaire */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('Add Beneficiary')}</Text>
              <View />
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>ID du bénéficiaire</Text>
              <TextInput
                style={[styles.input, errors.beneficiaryUserId && styles.inputError]}
                placeholder="Entrez l'ID utilisateur"
                keyboardType="number-pad"
                value={newBeneficiary.beneficiaryUserId}
                onChangeText={(text) =>
                  setNewBeneficiary({ ...newBeneficiary, beneficiaryUserId: text })
                }
              />
              {errors.beneficiaryUserId && (
                <Text style={styles.errorText}>{errors.beneficiaryUserId}</Text>
              )}

              <Text style={styles.label}>Surnom (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Mon collègue"
                value={newBeneficiary.nickname}
                onChangeText={(text) =>
                  setNewBeneficiary({ ...newBeneficiary, nickname: text })
                }
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleAddBeneficiary}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('Save')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 15,
  },
  beneficiaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  beneficiaryInfo: {
    flex: 1,
  },
  beneficiaryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  beneficiaryEmail: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 24,
    color: '#dc3545',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  addButtonLarge: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    fontSize: 28,
    color: '#666',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  modalForm: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default BeneficiariesScreen;
