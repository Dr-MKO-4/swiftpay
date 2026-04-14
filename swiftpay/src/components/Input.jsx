// swiftpay/src/components/Input.jsx
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export const Input = ({
  label = '',
  placeholder = '',
  value = '',
  onChangeText = () => {},
  error = '',
  keyboardType = 'default',
  secureTextEntry = false,
  editable = true,
  multiline = false,
  maxLength = null,
  style = null,
  icon = null,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: error ? colors.danger : colors.border,
            borderWidth: error ? 1 : 1,
          },
        ]}
      >
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              borderWidth: 0,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          multiline={multiline}
          maxLength={maxLength}
        />
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});
