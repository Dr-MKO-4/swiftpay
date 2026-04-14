// swiftpay/src/config/colors.js
/**
 * ThemeColors - Couleurs pour Light et Dark mode
 */

const colors = {
  light: {
    // Primaires
    primary: '#2563EB',
    primaryDark: '#1E40AF',
    primaryLight: '#DBEAFE',

    // Secondaires
    secondary: '#10B981',
    secondaryDark: '#059669',
    secondaryLight: '#D1FAE5',

    // Dangers
    danger: '#EF4444',
    dangerDark: '#DC2626',
    dangerLight: '#FEE2E2',

    // Warnings
    warning: '#F59E0B',
    warningDark: '#D97706',
    warningLight: '#FEF3C7',

    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    backgroundTertiary: '#F3F4F6',

    // Text
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',

    // Borders
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // Cards
    cardBackground: '#FFFFFF',
    cardBorder: '#E5E7EB',
    cardShadow: 'rgba(0, 0, 0, 0.1)',

    // Status
    success: '#10B981',
    successLight: '#D1FAE5',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
  },

  dark: {
    // Primaires
    primary: '#60A5FA',
    primaryDark: '#3B82F6',
    primaryLight: '#1E40AF',

    // Secondaires
    secondary: '#34D399',
    secondaryDark: '#10B981',
    secondaryLight: '#059669',

    // Dangers
    danger: '#F87171',
    dangerDark: '#EF4444',
    dangerLight: '#DC2626',

    // Warnings
    warning: '#FBBF24',
    warningDark: '#F59E0B',
    warningLight: '#D97706',

    // Backgrounds
    background: '#111827', // Very dark gray
    backgroundSecondary: '#1F2937', // Dark gray
    backgroundTertiary: '#374151', // Medium gray

    // Text
    textPrimary: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    textInverse: '#111827',

    // Borders
    border: '#374151',
    borderLight: '#4B5563',

    // Cards
    cardBackground: '#1F2937',
    cardBorder: '#374151',
    cardShadow: 'rgba(0, 0, 0, 0.5)',

    // Status
    success: '#34D399',
    successLight: '#10B981',
    error: '#F87171',
    errorLight: '#EF4444',
    info: '#60A5FA',
    infoLight: '#3B82F6',
  },
};

// Export helper pour obtenir les couleurs du thème actuel
export const getThemeColors = (isDarkMode = false) => {
  return isDarkMode ? colors.dark : colors.light;
};

export default colors;
