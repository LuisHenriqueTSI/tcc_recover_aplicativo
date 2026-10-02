import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as statisticsService from '../services/statistics';
import Card from '../components/Card';
import { useTheme } from '../contexts/ThemeContext';

const DashboardScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const stats = await statisticsService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.log('Erro ao carregar estatísticas:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !statistics) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total de Pets</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total_items}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pets Reunidos</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.items_resolved}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pets Perdidos</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.items_lost}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pets Encontrados</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.items_found}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Usuários Ativos</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total_users}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total de Mensagens</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total_messages}</Text>
        </Card>
      </View>

      <Card>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Taxa de Resolução</Text>
        <Text style={[styles.chartValue, { color: colors.primary }]}>
          {statistics.total_items > 0
            ? ((statistics.items_resolved / statistics.total_items) * 100).toFixed(1)
            : 0}
          %
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  statCard: {
    width: '48%',
    marginHorizontal: 4,
    marginVertical: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chartValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;
