import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { validatePasswordStrength } from '../utils/authErrors';

const PasswordStrengthIndicator = ({ password = '', isDark = false }) => {
  if (!password) return null;

  const strength = validatePasswordStrength(password);

  const rules = [
    { label: 'Mínimo de 8 caracteres', passed: strength.minLength },
    { label: 'Letra maiúscula (A-Z)', passed: strength.hasUpperCase },
    { label: 'Letra minúscula (a-z)', passed: strength.hasLowerCase },
    { label: 'Pelo menos 1 número (0-9)', passed: strength.hasNumber },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#243248' : '#E2E8F0' }]}>
      {/* Barra de Progresso e Nível de Força */}
      <View style={styles.headerRow}>
        <Text style={[styles.strengthTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          Força da senha:
        </Text>
        <Text style={[styles.strengthBadge, { color: strength.strengthColor }]}>
          {strength.strengthLabel}
        </Text>
      </View>

      <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${strength.strengthPercent}%`,
              backgroundColor: strength.strengthColor,
            },
          ]}
        />
      </View>

      {/* Regras e Checkmarks em Tempo Real */}
      <View style={styles.rulesList}>
        {rules.map((rule, idx) => (
          <View key={idx} style={styles.ruleItem}>
            <Feather
              name={rule.passed ? 'check-circle' : 'circle'}
              size={13}
              color={rule.passed ? '#16A34A' : isDark ? '#475569' : '#94A3B8'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.ruleText,
                {
                  color: rule.passed
                    ? isDark ? '#86EFAC' : '#15803D'
                    : isDark ? '#64748B' : '#94A3B8',
                  fontWeight: rule.passed ? '600' : '400',
                },
              ]}
            >
              {rule.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  strengthTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  strengthBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  rulesList: {
    gap: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleText: {
    fontSize: 11.5,
  },
});

export default React.memo(PasswordStrengthIndicator);
