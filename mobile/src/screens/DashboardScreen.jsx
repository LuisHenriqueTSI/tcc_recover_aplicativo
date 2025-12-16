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

const DashboardScreen = ({ navigation }) => {
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Total de Itens</Text>
          <Text style={styles.statValue}>{statistics.total_items}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Itens Resolvidos</Text>
          <Text style={styles.statValue}>{statistics.items_resolved}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Itens Perdidos</Text>
          <Text style={styles.statValue}>{statistics.items_lost}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Itens Encontrados</Text>
          <Text style={styles.statValue}>{statistics.items_found}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Usuários Ativos</Text>
          <Text style={styles.statValue}>{statistics.total_users}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Total de Mensagens</Text>
          <Text style={styles.statValue}>{statistics.total_messages}</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.chartTitle}>Taxa de Resolução</Text>
        <Text style={styles.chartValue}>
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
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
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
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  chartValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
  },
});

export default DashboardScreen;
