// src/screens/SenderSuccessScreen.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '../utils/colorsUser';

export default function SenderSuccessScreen({ navigation }) {
  const colors = useThemeColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>Paiement réussi 🎉</Text>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('DashboardScreen')}>
        <Text style={styles.buttonText}>Accueil</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:'center', alignItems:'center' },
  text:{ fontSize:20, marginBottom:20 },
  button:{ padding:12, borderRadius:8 },
  buttonText:{ color:'#fff' }
});
