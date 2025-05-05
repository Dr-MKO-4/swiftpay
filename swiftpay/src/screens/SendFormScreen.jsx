// src/screens/SendFormScreen.jsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import { useThemeColors } from '../utils/colorsUser';

export default function SendFormScreen({ route, navigation }) {
  const { receiverId } = route.params;
  const [inputId, setInputId] = useState(receiverId);
  const [amount, setAmount] = useState('');
  const colors = useThemeColors();

  const onValidate = () => {
    if (inputId !== receiverId) return Alert.alert('ID non reconnu', 'Vérifiez l’identifiant');
    ReactNativeBiometrics.simplePrompt({ promptMessage: 'Validez le paiement' })
      .then(res => {
        if (res.success) navigation.navigate('FaceIDAuthScreen', { receiverId, amount: parseFloat(amount) });
        else { Alert.alert('Échec auth', 'Paiement annulé'); navigation.goBack(); }
      })
      .catch(() => Alert.alert('Erreur biométrie'));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={inputId} onChangeText={setInputId} placeholder="ID bénéficiaire" placeholderTextColor={colors.placeholder}/>
      <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]} value={amount} onChangeText={setAmount} placeholder="Montant" placeholderTextColor={colors.placeholder} keyboardType="numeric"/>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onValidate}>
        <Text style={styles.buttonText}>Valider</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:20 },
  input:{ borderWidth:1, borderRadius:6, padding:12, marginBottom:16 },
  button:{ padding:12, borderRadius:8 },
  buttonText:{ color:'#fff', textAlign:'center', fontWeight:'600' }
});
