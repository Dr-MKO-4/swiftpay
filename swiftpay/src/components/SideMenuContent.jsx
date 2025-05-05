// src/components/SideMenuContent.js
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/Ionicons'
import { useThemeColors } from '../utils/colorsUser'
import { useAuth } from '../contexts/AuthContext'

export default function SideMenuContent({ items, close }) {
  const colors = useThemeColors()
  const { logout } = useAuth()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.items}>
        {items.map(({ label, icon, action }) => (
          <TouchableOpacity
            key={label}
            style={[styles.item, { borderBottomColor: colors.border }]}
            onPress={() => { action(); close() }}
          >
            {icon && (
              <Icon
                name={icon}
                size={20}
                color={colors.primary}
                style={styles.icon}
              />
            )}
            <Text style={[styles.label, { color: colors.text }]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.primary }]}
        onPress={() => { logout(); close() }}
      >
        <Icon name="log-out-outline" size={20} color={colors.cards} style={styles.icon}/>
        <Text style={[styles.logoutText, { color: colors.cards }]}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',           // prend toute la largeur du drawer
    justifyContent: 'space-between', // items en haut, logout en bas
    paddingTop: 60,
  },
  items: {
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  icon: {
    marginRight: 12,
  },
  label: {
    fontSize: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  logoutText: {
    fontSize: 18,
    marginLeft: 12,
  },
})
