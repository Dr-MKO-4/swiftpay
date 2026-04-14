// swiftpay/src/components/Card.jsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export const Card = ({ 
  children, 
  onPress = null, 
  style = null,
  padding = 16,
  borderRadius = 12,
  elevation = 2
}) => {
  const { colors } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
      paddingVertical: padding,
      paddingHorizontal: padding,
      borderRadius,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <View style={cardStyle}>{children}</View>
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

export const GradientCard = ({ children, style = null, padding = 16 }) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View
      style={[
        styles.gradient,
        {
          backgroundColor: colors.primary,
          paddingVertical: padding,
          paddingHorizontal: padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  gradient: {
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
  },
});
