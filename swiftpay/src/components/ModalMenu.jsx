// src/components/ModalMenu.js
import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useThemeColors } from '../utils/colorsUser';

export default function ModalMenu({ visible, onClose, items }) {
  const colors = useThemeColors();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={[styles.container, { backgroundColor: colors.cards, borderColor: colors.border }]}>
        {items.map(({ label, icon, action }, i) => (
          <Pressable
            key={i}
            style={styles.row}
            onPress={() => {
              action();
              onClose();
            }}
          >
            <Icon name={icon} size={20} color={colors.text} style={styles.icon} />
            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 180,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  icon: {
    marginRight: 12
  },
  label: {
    fontSize: 14
  }
});
