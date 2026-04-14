// swiftpay/src/components/Loading.jsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export const LoadingSpinner = ({ message = 'Loading...', size = 'large' }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size={size} color={colors.primary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
};

export const LoadingOverlay = ({ visible = false, message = 'Loading...' }) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      <View style={[styles.overlayContent, { backgroundColor: colors.cardBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.message, { color: colors.textSecondary, marginTop: 16 }]}>
          {message}
        </Text>
      </View>
    </View>
  );
};

export const SkeletonLoader = ({ count = 3 }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.skeletonContainer}>
      {[...Array(count)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.skeletonItem,
            {
              backgroundColor: colors.backgroundSecondary,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  skeletonContainer: {
    paddingHorizontal: 16,
  },
  skeletonItem: {
    height: 80,
    marginVertical: 8,
    borderRadius: 8,
  },
});
