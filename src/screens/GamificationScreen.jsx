import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import GamificationCard from '../components/GamificationCard';
import { getUserGamificationData } from '../services/gamification';

const GamificationScreen = () => {
  const { user, userProfile } = useAuth();
  const { colors } = useTheme();
  const [gamificationData, setGamificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadGamificationData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getUserGamificationData(user?.id, userProfile);
      setGamificationData(data);
    } catch (loadError) {
      console.error('[GamificationScreen] Erro ao carregar conquistas:', loadError);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userProfile]);

  useFocusEffect(
    useCallback(() => {
      loadGamificationData();
    }, [loadGamificationData])
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Carregando suas conquistas...
        </Text>
      </View>
    );
  }

  if (error || !gamificationData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <MaterialIcons name="workspace-premium" size={32} color={colors.textMuted} />
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Não foi possível carregar suas conquistas.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { borderColor: colors.border }]}
          onPress={loadGamificationData}
          activeOpacity={0.75}
        >
          <Text style={[styles.retryText, { color: colors.primary }]}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.intro}>
        <Text style={[styles.title, { color: colors.text }]}>Sua jornada na comunidade</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Acompanhe seu nível, seus pontos de impacto e as conquistas que você pode desbloquear.
        </Text>
      </View>
      <GamificationCard gamificationData={gamificationData} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  intro: {
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 5,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 16,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 9,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default GamificationScreen;
