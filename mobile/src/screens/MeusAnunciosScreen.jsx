import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { listItems, renewItem } from '../services/items';
import { getRenewalInfo } from '../services/itemExpiration';

const MeusAnunciosScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renewingId, setRenewingId] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    loadItems();
  }, [user?.id]);

  const loadItems = async () => {
    setLoading(true);
    const data = await listItems({ owner_id: user.id, resolved: false });
    setItems(data || []);
    setLoading(false);
  };

  const handleRenew = async (itemId) => {
    try {
      setRenewingId(itemId);
      await renewItem(itemId);
      await loadItems();
    } catch (error) {
      console.error('Erro ao renovar publicação:', error);
    } finally {
      setRenewingId(null);
    }
  };

  const grouped = items.reduce((acc, item) => {
    const renewalInfo = getRenewalInfo(item);
    const category = !renewalInfo.canRenew ? 'inativos' : renewalInfo.inactive ? 'inativos' : (renewalInfo.needsRenewal ? 'renovar' : 'ativos');
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const renderSection = (title, key) => {
    const list = grouped[key] || [];
    if (!list.length) return null;
    return (
      <View style={styles.section} key={key}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {list.map(item => {
          const renewalInfo = getRenewalInfo(item);
          return (
            <View key={item.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title || 'Sem título'}</Text>
                <Text style={styles.itemMeta}>{!renewalInfo.canRenew ? 'Não renovável' : renewalInfo.inactive ? 'Inativo' : renewalInfo.needsRenewal ? `Renovar em ${renewalInfo.daysRemaining} dia(s)` : 'Ativo'}</Text>
              </View>
              {renewalInfo.inactive && (
                <TouchableOpacity style={styles.renewButton} onPress={() => handleRenew(item.id)} disabled={renewingId === item.id}>
                  {renewingId === item.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.renewButtonText}>Renovar</Text>}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Minhas publicações</Text>
      <Text style={styles.description}>Suas publicações aparecem aqui com status claro para renovação ou exclusão futura.</Text>
      {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} /> : null}
      {renderSection('Ativas', 'ativos')}
      {renderSection('Prontas para renovar', 'renovar')}
      {renderSection('Inativas', 'inativos')}
      {!loading && !items.length && <Text style={styles.empty}>Nenhuma publicação encontrada.</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  description: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemMeta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  renewButton: { backgroundColor: '#4F46E5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  renewButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  empty: { color: '#6B7280', marginTop: 12, textAlign: 'center' },
});

export default MeusAnunciosScreen;
