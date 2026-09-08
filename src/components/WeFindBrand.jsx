import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import COLORS from '../constants/theme';

/**
 * Logotipo oficial do WeFIND (Pin Verde Floresta + Cão e Gato em Marrom Caramelo)
 */
export const WeFindLogo = ({ size = 64, style }) => {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
};

/**
 * Tipografia oficial WeFIND com 'We' em Marrom da Logo e 'FIND' em Verde da Logo
 */
export const WeFindText = ({
  size = 22,
  uppercase = false,
  style,
  suffix = '',
  lightModeOnly = false,
}) => {
  const { colors, isDark } = useTheme();

  const weColor = lightModeOnly ? COLORS.weColor : (isDark ? colors.weColor : colors.weColor || COLORS.weColor);
  const findColor = lightModeOnly ? COLORS.findColor : (isDark ? colors.findColor : colors.findColor || COLORS.findColor);

  const wePart = uppercase ? 'WE' : 'We';
  const findPart = 'FIND';

  return (
    <Text style={[styles.brandText, { fontSize: size }, style]}>
      <Text style={{ color: weColor, fontWeight: '900' }}>{wePart}</Text>
      <Text style={{ color: findColor, fontWeight: '900' }}>{findPart}</Text>
      {suffix ? <Text style={{ color: isDark && !lightModeOnly ? colors.text : '#1E293B', fontWeight: '800' }}>{suffix}</Text> : null}
    </Text>
  );
};

const styles = StyleSheet.create({
  brandText: {
    letterSpacing: -0.5,
  },
});

export default {
  WeFindLogo,
  WeFindText,
};
