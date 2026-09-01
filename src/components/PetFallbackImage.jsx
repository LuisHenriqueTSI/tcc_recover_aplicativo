import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import COLORS from '../constants/theme';

export default function PetFallbackImage({
  species = 'dog',
  breed,
  color,
  size,
  style,
  compact = false,
}) {
  const { colors, isDark } = useTheme();

  const normSpecies = String(species || '').toLowerCase();

  let iconComponent = <MaterialIcons name="pets" size={compact ? 28 : 44} color={COLORS.primary} />;
  let speciesLabel = 'Animal';

  if (normSpecies.includes('dog') || normSpecies.includes('cão') || normSpecies.includes('cachorro')) {
    iconComponent = <FontAwesome5 name="dog" size={compact ? 26 : 42} color={COLORS.primary} />;
    speciesLabel = 'Cão';
  } else if (normSpecies.includes('cat') || normSpecies.includes('gato')) {
    iconComponent = <FontAwesome5 name="cat" size={compact ? 26 : 42} color={COLORS.primary} />;
    speciesLabel = 'Gato';
  } else if (normSpecies.includes('horse') || normSpecies.includes('cavalo') || normSpecies.includes('equino')) {
    iconComponent = <FontAwesome5 name="horse" size={compact ? 26 : 42} color={COLORS.primary} />;
    speciesLabel = 'Cavalo';
  } else if (normSpecies.includes('bird') || normSpecies.includes('ave') || normSpecies.includes('passaro')) {
    iconComponent = <MaterialIcons name="flutter-dash" size={compact ? 28 : 44} color={COLORS.primary} />;
    speciesLabel = 'Ave';
  }

  const traits = [breed, color, size].filter(Boolean).join(' • ');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#132218' : '#EAF2EB',
          borderColor: isDark ? '#1E3626' : '#CDE1D1',
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isDark ? '#1E3626' : '#FFFFFF',
            shadowColor: '#000',
            shadowOpacity: isDark ? 0.3 : 0.08,
          },
        ]}
      >
        {iconComponent}
      </View>

      {!compact && (
        <View style={styles.textContainer}>
          <View style={styles.badgeRow}>
            <MaterialIcons name="image-not-supported" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>Sem foto anexada</Text>
          </View>

          {traits ? (
            <Text style={[styles.traitsText, { color: isDark ? '#E2E8F0' : '#1E293B' }]} numberOfLines={2}>
              {speciesLabel}: {traits}
            </Text>
          ) : (
            <Text style={[styles.traitsText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Veja os detalhes e descrição do {speciesLabel.toLowerCase()} abaixo
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    alignItems: 'center',
    maxWidth: '90%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 86, 52, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  traitsText: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17,
  },
});
