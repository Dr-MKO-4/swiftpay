//src/components/FeedbackOverlay.jsx
// src/components/FeedbackOverlay.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { useThemeColors } from '../utils/colorsUser';
export default function FeedbackOverlay({ visible, type, message, onClose }) {
  // choisis l’anim selon type
  const COLORS = useThemeColors();
  const animSource =
    type === 'error'
      ? require('../assets/animations/error.json')
      : require('../assets/animations/success.json');

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <LottieView
            source={animSource}
            autoPlay
            loop={false}
            style={styles.animation}
          />
          <Text style={[styles.text, type==='error' ? styles.error : styles.success]}>
            {message}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.btn}>
            <Text style={styles.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:'center',
    alignItems:'center'
  },
  box: {
    width: 280,
    padding: 20,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems:'center'
  },
  animation: { width: 120, height:120 },
  text: { marginTop: 12, fontSize:16, textAlign:'center' },
  error: { color: COLORS.error },
  success: { color: COLORS.success },
  btn: {
    marginTop:16,
    backgroundColor: COLORS.primary,
    paddingVertical:8,
    paddingHorizontal:24,
    borderRadius:8
  },
  btnText: { color:'#FFF', fontWeight:'600' }
});
