import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { listItems, renewItem } from '../services/items';
import { getRenewalInfo } from '../services/itemExpiration';

const statusConfig = {
  ativos: { title: 'Ativas', color: '#16A34A', background: '#DCFCE7', icon: 'check-circle' },
  renovar: { title: 'Precisam de atenção', color: '#D97706', background: '#FEF3C7', icon: 'clock' },
  inativos: { title: 'Inativas', color: '#71717A', background: '#F4F4F5', icon: 'pause-circle' },
};

const getCategoryIcon = (item) => item.category === 'animal' ? 'heart' : 'map-pin';

const MeusAnunciosScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [renewingId, setRenewingId] = useState(null);

  const loadItems = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const data = await listItems({ owner_id: user.id, resolved: false });
    setItems(data || []);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleRenew = async (itemId) => {
    try {
      setRenewingId(itemId);
      await renewItem(itemId);
      await loadItems();
      Alert.alert('Publicação renovada', 'Ela voltou a aparecer para a comunidade.');
    } catch (error) {
      Alert.alert('Não foi possível renovar', error?.message || 'Tente novamente.');
    } finally {
      setRenewingId(null);
    }
  };

  const grouped = items.reduce((acc, item) => {
    const renewalInfo = getRenewalInfo(item);
    const category = !renewalInfo.canRenew || renewalInfo.inactive ? 'inativos' : renewalInfo.needsRenewal ? 'renovar' : 'ativos';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ ...item, renewalInfo });
    return acc;
  }, {});

  const renderItem = (item) => {
    const config = statusConfig[item.renewalInfo.inactive ? 'inativos' : item.renewalInfo.needsRenewal ? 'renovar' : 'ativos'];
    const location = [item.city, item.state].filter(Boolean).join(', ');
    return (
      <TouchableOpacity key={item.id} style={styles.itemCard} onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })} activeOpacity={0.82}>
        <View style={[styles.itemIcon, { backgroundColor: config.background }]}>
          <Feather name={getCategoryIcon(item)} size={22} color={config.color} />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.title || 'Sem título'}</Text>
          <View style={styles.metaLine}>
            <Feather name="map-pin" size={12} color="#A1A1AA" />
            <Text style={styles.itemMeta} numberOfLines={1}>{location || 'Localização não informada'}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: config.background }]}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <Text style={[styles.statusText, { color: config.color }]}>{item.renewalInfo.inactive ? 'Inativa' : item.renewalInfo.needsRenewal ? `Renovar em ${item.renewalInfo.daysRemaining} dia(s)` : 'Ativa'}</Text>
          </View>
        </View>
        {item.renewalInfo.inactive && item.renewalInfo.canRenew ? (
          <TouchableOpacity style={styles.renewButton} onPress={() => handleRenew(item.id)} disabled={renewingId === item.id}>
            {renewingId === item.id ? <ActivityIndicator size="small" color="#fff" /> : <><Feather name="rotate-cw" size={14} color="#fff" /><Text style={styles.renewText}>Renovar</Text></>}
          </TouchableOpacity>
        ) : <Feather name="chevron-right" size={20} color="#A1A1AA" />}
      </TouchableOpacity>
    );
  };

  const renderSection = (key) => {
    const list = grouped[key] || [];
    if (!list.length) return null;
    const config = statusConfig[key];
    return (
      <View style={styles.section} key={key}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}><Feather name={config.icon} size={17} color={config.color} /><Text style={styles.sectionTitle}>{config.title}</Text></View>
          <Text style={styles.count}>{list.length}</Text>
        </View>
        {list.map(renderItem)}
      </View>
    );
  };

  const activeCount = (grouped.ativos || []).length;
  const attentionCount = (grouped.renovar || []).length + (grouped.inativos || []).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadItems(true)} tintColor="#2563EB" colors={['#2563EB']} />}>
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{items.length}</Text><Text style={styles.summaryLabel}>pets</Text></View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color: '#15803D' }]}>{activeCount}</Text><Text style={styles.summaryLabel}>ativas</Text></View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}><Text style={[styles.summaryValue, { color: '#B45309' }]}>{attentionCount}</Text><Text style={styles.summaryLabel}>atenção</Text></View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#2563EB" style={styles.loader} /> : null}
      {!loading && !items.length ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Feather name="inbox" size={28} color="#2563EB" /></View>
          <Text style={styles.emptyTitle}>Nada publicado ainda</Text>
          <Text style={styles.emptyText}>Quando você publicar um pet perdido ou encontrado, ele aparecerá aqui.</Text>
          <TouchableOpacity style={styles.publishButton} onPress={() => navigation.navigate('RegisterItem')}><Feather name="plus" size={17} color="#fff" /><Text style={styles.publishText}>Criar publicação</Text></TouchableOpacity>
        </View>
      ) : null}
      {!loading && renderSection('ativos')}
      {!loading && renderSection('renovar')}
      {!loading && renderSection('inativos')}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  content: { padding: 16, paddingBottom: 44 },
  summaryBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 22 },
  summaryItem: { flex: 1 },
  summaryValue: { color: '#0F172A', fontSize: 21, fontWeight: '800' },
  summaryLabel: { color: '#64748B', fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryDivider: { height: 30, width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 10 },
  loader: { marginTop: 32 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  count: { color: '#475569', backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: '800' },
  itemCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', minHeight: 84 },
  itemIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  itemContent: { flex: 1, minWidth: 0 },
  itemTitle: { color: '#0F172A', fontSize: 14, fontWeight: '800', marginBottom: 5 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemMeta: { color: '#94A3B8', fontSize: 12, flex: 1 },
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, marginTop: 7 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: '800' },
  renewButton: { backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 7 },
  renewText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  empty: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 26, alignItems: 'center', marginTop: 4 },
  emptyIcon: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyTitle: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  emptyText: { color: '#64748B', textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 18 },
  publishButton: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 7 },
  publishText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

export default MeusAnunciosScreen;
