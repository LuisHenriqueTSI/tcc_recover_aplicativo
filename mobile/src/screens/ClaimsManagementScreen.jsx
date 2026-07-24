import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getPendingClaimsForItem, approveClaim, rejectClaim } from '../services/itemClaims';
import { listItems } from '../services/items';
import Button from '../components/Button';
import Card from '../components/Card';

export default function ClaimsManagementScreen({ navigation }) {
  const { user } = useAuth();
  const [myFoundItems, setMyFoundItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingClaimId, setProcessingClaimId] = useState(null);
  const [expandedClaimId, setExpandedClaimId] = useState(null);

  useEffect(() => {
    if (user) {
      loadFoundItems();
    }
  }, [user]);

  const loadFoundItems = async () => {
    setLoading(true);
    try {
      const items = await listItems({ owner_id: user.id, status: 'found' });
      setMyFoundItems(items || []);

      if (items && items.length > 0) {
        const pendingClaimsForAll = [];
        for (const item of items) {
          const pendingClaims = await getPendingClaimsForItem(item.id);
          pendingClaimsForAll.push(...(pendingClaims || []).map(claim => ({
            ...claim,
            itemId: item.id,
            itemTitle: item.title,
          })));
        }

        setClaims(pendingClaimsForAll || []);

        const firstItemWithClaims = items.find(item => pendingClaimsForAll.some(claim => claim.itemId === item.id)) || items[0];
        setSelectedItem(firstItemWithClaims);
        setExpandedClaimId(null);
      } else {
        setClaims([]);
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('[ClaimsManagement] Erro ao carregar itens encontrados:', err);
      Alert.alert('Erro', 'Falha ao carregar seus itens encontrados');
    } finally {
      setLoading(false);
    }
  };

  const loadClaimsForItem = async (itemId) => {
    try {
      const pendingClaims = await getPendingClaimsForItem(itemId);
      setClaims((pendingClaims || []).map(claim => ({
        ...claim,
        itemId,
        itemTitle: myFoundItems.find(item => item.id === itemId)?.title || 'Item',
      })));
    } catch (err) {
      console.error('[ClaimsManagement] Erro ao carregar reivindicações:', err);
    }
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setExpandedClaimId(null);
    loadClaimsForItem(item.id);
  };

  const handleApproveClaim = async (claimId) => {
    setProcessingClaimId(claimId);
    try {
      await approveClaim(claimId);
      Alert.alert(
        'Reivindicação aprovada!',
        'O usuário pode agora entrar em contato com você. Vocês podem combinar a devolução do item.',
        [{ text: 'OK', onPress: () => {
          setClaims(claims.filter(c => c.id !== claimId));
          setExpandedClaimId(null);
        }}]
      );
    } catch (err) {
      Alert.alert('Erro', 'Falha ao aprovar reivindicação: ' + err.message);
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleRejectClaim = async (claimId) => {
    Alert.alert(
      'Rejeitar reivindicação?',
      'O usuário será notificado que sua reivindicação foi rejeitada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: async () => {
            setProcessingClaimId(claimId);
            try {
              await rejectClaim(claimId, 'Rejeitado pelo dono do item');
              setClaims(claims.filter(c => c.id !== claimId));
              setExpandedClaimId(null);
              Alert.alert('Reivindicação rejeitada', 'O usuário foi notificado.');
            } catch (err) {
              Alert.alert('Erro', 'Falha ao rejeitar reivindicação: ' + err.message);
            } finally {
              setProcessingClaimId(null);
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Card style={styles.messageCard}>
          <Text style={styles.messageText}>Faça login para gerenciar reivindicações</Text>
        </Card>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (myFoundItems.length === 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.messageCard}>
          <Text style={styles.messageText}>Você não cadastrou itens encontrados</Text>
          <Text style={styles.messageSubtext}>
            Quando você registrar um item como "achei", as pessoas que o perderam poderão reivindicá-lo aqui.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Abas com itens encontrados */}
      <View style={styles.itemTabs}>
        <FlatList
          data={myFoundItems}
          keyExtractor={item => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.itemTab,
                selectedItem?.id === item.id && styles.itemTabActive,
              ]}
              onPress={() => handleSelectItem(item)}
            >
              <Text
                style={[
                  styles.itemTabText,
                  selectedItem?.id === item.id && styles.itemTabTextActive,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {((claims || []).filter(claim => claim.itemId === item.id).length > 0) && selectedItem?.id === item.id && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{(claims || []).filter(claim => claim.itemId === item.id).length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.itemTabsContent}
        />
      </View>

      {/* Lista de reivindicações */}
      {claims.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhuma reivindicação pendente</Text>
          <Text style={styles.emptySubtext}>
            Quando alguém reivindicar este item, aparecerá aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={claims}
          keyExtractor={claim => claim.id.toString()}
          contentContainerStyle={styles.claimsList}
          renderItem={({ item: claim }) => (
            <View key={claim.id} style={styles.claimCard}>
              <TouchableOpacity
                style={styles.claimHeader}
                onPress={() => setExpandedClaimId(expandedClaimId === claim.id ? null : claim.id)}
              >
                <View style={styles.claimantInfo}>
                  <Text style={styles.claimantName}>
                    {claim.profiles?.name || 'Usuário'}
                  </Text>
                  <Text style={styles.claimTime}>
                    {new Date(claim.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <Text style={styles.expandIcon}>
                  {expandedClaimId === claim.id ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {expandedClaimId === claim.id && (
                <View style={styles.claimDetails}>
                  <View style={styles.messageSection}>
                    <Text style={styles.sectionTitle}>Mensagem:</Text>
                    <Text style={styles.claimMessage}>{claim.message}</Text>
                    {claim.itemTitle && (
                      <Text style={styles.itemLabel}>Item: {claim.itemTitle}</Text>
                    )}
                  </View>

                  {claim.proof_photo_url && (
                    <View style={styles.photoSection}>
                      <Text style={styles.sectionTitle}>Foto de comprovação:</Text>
                      <Image
                        source={{ uri: claim.proof_photo_url }}
                        style={styles.proofPhoto}
                      />
                    </View>
                  )}

                  <View style={styles.actions}>
                    <Button
                      title={processingClaimId === claim.id ? 'Processando...' : 'Rejeitar'}
                      variant="secondary"
                      onPress={() => handleRejectClaim(claim.id)}
                      disabled={processingClaimId === claim.id}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={processingClaimId === claim.id ? 'Processando...' : 'Aprovar'}
                      onPress={() => handleApproveClaim(claim.id)}
                      disabled={processingClaimId === claim.id}
                      style={{ flex: 1, marginLeft: 8 }}
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messageCard: {
    margin: 16,
    marginTop: 24,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  messageSubtext: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  itemTabs: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  itemTabsContent: {
    paddingHorizontal: 16,
  },
  itemTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTabActive: {
    backgroundColor: '#4F46E5',
  },
  itemTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    maxWidth: 150,
  },
  itemTabTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  claimsList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  claimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  claimantInfo: {
    flex: 1,
  },
  claimantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  claimTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  expandIcon: {
    fontSize: 14,
    color: '#6B7280',
  },
  claimDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  messageSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  claimMessage: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  itemLabel: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 6,
    fontWeight: '600',
  },
  photoSection: {
    marginBottom: 16,
  },
  proofPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
