import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getStatistics } from '../services/statistics';
import { listPendingReports, resolveReport } from '../services/reports';
import { deleteItem } from '../services/items';
import * as storiesService from '../services/stories';

const AdminScreen = () => {
  const { user, isAdmin } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [reports, setReports] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const loadAdminData = async (isRefresh = false) => {
    if (!isAdmin) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [stats, pendingReports, successStories] = await Promise.all([
        getStatistics(),
        listPendingReports(),
        storiesService.listSuccessStories(),
      ]);
      setStatistics(stats || {});
      setReports(pendingReports || []);
      setStories(successStories || []);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível carregar o painel administrativo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, [isAdmin])
  );

  const handleReviewReport = (report, removePublication) => {
    const actionLabel = removePublication ? 'Excluir publicação' : 'Manter publicação';
    Alert.alert(
      actionLabel,
      removePublication
        ? 'A publicação será excluída permanentemente.'
        : 'A denúncia será encerrada e a publicação permanecerá visível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setProcessingId(report.id);
            try {
              await resolveReport(
                report.id,
                user.id,
                removePublication ? 'publication_removed' : 'publication_kept'
              );
              if (removePublication) {
                await deleteItem(report.item_id, { actorId: user.id, actorIsAdmin: true });
              }
              setReports((current) => current.filter((item) => item.id !== report.id));
            } catch (error) {
              Alert.alert('Erro', error.message || 'Não foi possível atualizar a denúncia.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteStory = (story) => {
    Alert.alert(
      'Excluir História',
      `Tem certeza de que deseja excluir permanentemente a história de "${story.petName}" enviada por "${story.author}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await storiesService.deleteSuccessStory(story.id);
              Alert.alert('Sucesso', 'História de reencontro excluída.');
              setStories((current) => current.filter((s) => s.id !== story.id));
            } catch (error) {
              Alert.alert('Erro', error.message || 'Não foi possível excluir a história.');
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="lock-outline" size={42} color="#9CA3AF" />
        <Text style={styles.deniedTitle}>Acesso restrito</Text>
        <Text style={styles.deniedText}>
          Esta área está disponível apenas para administradores.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const metrics = [
    {
      label: 'Usuários',
      value: statistics?.total_users || 0,
      icon: 'people-outline',
      color: '#2563EB',
      background: '#EFF6FF',
    },
    {
      label: 'Publicações',
      value: statistics?.total_items || 0,
      icon: 'pets',
      color: '#059669',
      background: '#ECFDF5',
    },
    {
      label: 'Histórias',
      value: stories.length,
      icon: 'auto-stories',
      color: '#7C3AED',
      background: '#F5F3FF',
    },
    {
      label: 'Denúncias',
      value: reports.length,
      icon: 'flag',
      color: '#B91C1C',
      background: '#FEF2F2',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAdminData(true)}
          colors={['#2563EB']}
        />
      }
    >
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.eyebrow}>CONTROLE DO APP</Text>
          <Text style={styles.title}>Painel administrativo</Text>
        </View>
        <View style={styles.adminBadge}>
          <Feather name="shield" size={16} color="#2563EB" />
          <Text style={styles.adminBadgeText}>ADM</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: metric.background }]}>
              <MaterialIcons name={metric.icon} size={20} color={metric.color} />
            </View>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {/* Denúncias Pendentes */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Denúncias pendentes</Text>
          <Text style={styles.sectionSubtitle}>Publicações aguardando análise</Text>
        </View>
        <TouchableOpacity
          onPress={() => loadAdminData(true)}
          style={styles.refreshButton}
          accessibilityLabel="Atualizar painel"
        >
          <Feather name="refresh-cw" size={17} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {reports.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="check" size={24} color="#059669" />
          </View>
          <Text style={styles.emptyTitle}>Tudo em dia</Text>
          <Text style={styles.emptyText}>Nenhuma denúncia pendente para análise.</Text>
        </View>
      ) : (
        reports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.reportTopRow}>
              <View style={styles.reportIcon}>
                <MaterialIcons name="flag" size={19} color="#B91C1C" />
              </View>
              <View style={styles.reportMain}>
                <Text style={styles.reportTitle}>
                  {report.items?.title || 'Publicação sem título'}
                </Text>
                <Text style={styles.reportMeta}>
                  Denunciado por {report.reporter?.name || report.reporter?.email || 'Usuário'}
                </Text>
              </View>
              <Text style={styles.reportDate}>
                {report.created_at ? new Date(report.created_at).toLocaleDateString('pt-BR') : ''}
              </Text>
            </View>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Motivo</Text>
              <Text style={styles.reasonText}>{report.reason}</Text>
              {report.details ? <Text style={styles.details}>{report.details}</Text> : null}
            </View>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color="#6B7280" />
              <Text style={styles.locationText}>
                {report.items?.city || 'Cidade não informada'}
                {report.items?.state ? `, ${report.items.state}` : ''}
              </Text>
            </View>
            <View style={styles.reviewActions}>
              <TouchableOpacity
                style={styles.keepButton}
                onPress={() => handleReviewReport(report, false)}
                disabled={processingId === report.id}
              >
                <Feather name="check" size={15} color="#047857" />
                <Text style={styles.keepText}>Manter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleReviewReport(report, true)}
                disabled={processingId === report.id}
              >
                <Feather name="trash-2" size={15} color="#fff" />
                <Text style={styles.removeText}>
                  {processingId === report.id ? 'Processando...' : 'Excluir publicação'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Histórias de Reencontro Publicadas */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <View>
          <Text style={styles.sectionTitle}>Histórias Publicadas ({stories.length})</Text>
          <Text style={styles.sectionSubtitle}>Relatos de reencontros enviados pelos usuários</Text>
        </View>
      </View>

      {stories.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={[styles.emptyIcon, { backgroundColor: '#F5F3FF' }]}>
            <MaterialIcons name="auto-stories" size={24} color="#7C3AED" />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma história cadastrada</Text>
          <Text style={styles.emptyText}>
            Quando os usuários compartilharem relatos de reencontro, eles aparecerão aqui.
          </Text>
        </View>
      ) : (
        stories.map((story) => (
          <View key={String(story.id)} style={styles.storyAdminCard}>
            <View style={styles.storyAdminHeader}>
              <View style={styles.storyAdminIcon}>
                <MaterialIcons name="pets" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storyAdminTitle}>
                  {story.petName} • {story.author}
                </Text>
                <Text style={styles.storyAdminMeta}>
                  {story.location || 'Brasil'} • ⭐ {story.rating || 5}/5
                </Text>
              </View>
              <TouchableOpacity
                style={styles.storyAdminDeleteButton}
                onPress={() => handleDeleteStory(story)}
                accessibilityLabel="Excluir história"
              >
                <Feather name="trash-2" size={14} color="#DC2626" />
                <Text style={styles.storyAdminDeleteText}>Excluir</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.storyAdminQuote} numberOfLines={3}>
              "{story.testimonial}"
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 42 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 28,
  },
  deniedTitle: { color: '#1F2937', fontSize: 19, fontWeight: '800', marginTop: 12 },
  deniedText: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  eyebrow: { color: '#2563EB', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#111827', fontSize: 24, fontWeight: '800', marginTop: 4 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  adminBadgeText: { color: '#2563EB', fontSize: 11, fontWeight: '800' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 26 },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 13,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: { color: '#111827', fontSize: 22, fontWeight: '800' },
  metricLabel: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: '#1F2937', fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { color: '#6B7280', fontSize: 12, marginTop: 3 },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { color: '#1F2937', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#6B7280', fontSize: 13, marginTop: 4, textAlign: 'center' },
  reportCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  reportTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  reportIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reportMain: { flex: 1 },
  reportTitle: { color: '#1F2937', fontSize: 14, fontWeight: '800' },
  reportMeta: { color: '#6B7280', fontSize: 11, marginTop: 4 },
  reportDate: { color: '#9CA3AF', fontSize: 10 },
  reasonBox: { backgroundColor: '#F8FAFC', borderRadius: 9, padding: 10, marginTop: 12 },
  reasonLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  reasonText: { color: '#374151', fontSize: 13, fontWeight: '700', marginTop: 3 },
  details: { color: '#6B7280', fontSize: 12, lineHeight: 18, marginTop: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  locationText: { color: '#6B7280', fontSize: 12, marginLeft: 5 },
  reviewActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  keepButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  keepText: { color: '#047857', fontSize: 12, fontWeight: '800' },
  removeButton: {
    flex: 1.25,
    backgroundColor: '#B91C1C',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  removeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // Estilos de Histórias no Admin
  storyAdminCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  storyAdminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  storyAdminIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  storyAdminTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  storyAdminMeta: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  storyAdminDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  storyAdminDeleteText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  storyAdminQuote: {
    fontSize: 12.5,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 18,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
});

export default AdminScreen;
