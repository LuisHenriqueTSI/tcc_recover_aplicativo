import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { getClaimsForItem } from '../services/itemClaims';
import { approveVerification, rejectVerification } from '../services/proofVerification';
import { listItems } from '../services/items';
import Button from '../components/Button';
import Card from '../components/Card';
import COLORS from '../constants/theme';

export default function ClaimsManagementScreen({ navigation }) {
  const { user } = useAuth();
  const [myFoundItems, setMyFoundItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [historyClaims, setHistoryClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingClaimId, setProcessingClaimId] = useState(null);
  const [expandedClaimId, setExpandedClaimId] = useState(null);

  const loadFoundItems = async () => {
    setLoading(true);
    try {
      const items = await listItems({ owner_id: user.id, status: 'found' });
      setMyFoundItems(items || []);

      if (items && items.length > 0) {
        const claimsForAll = [];
        for (const item of items) {
          const itemClaims = await getClaimsForItem(item.id);
          claimsForAll.push(...(itemClaims || []).map(claim => ({
            ...claim,
            itemId: item.id,
            itemTitle: item.title,
          })));
        }

        setClaims(claimsForAll.filter(claim => claim.status === 'pending'));
        setHistoryClaims(claimsForAll.filter(claim => claim.status !== 'pending'));

        setExpandedClaimId(null);
      } else {
        setClaims([]);
        setHistoryClaims([]);
      }
    } catch (err) {
      console.error('[ClaimsManagement] Erro ao carregar pets encontrados:', err);
      Alert.alert('Erro', 'Falha ao carregar seus pets encontrados');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadFoundItems();
      }
    }, [user])
  );

  const handleApproveClaim = async (claim) => {
    const claimId = claim.id;
    setProcessingClaimId(claimId);
    try {
      await approveVerification(claimId, {
        itemId: claim.itemId,
        claimantId: claim.claimant_id,
        itemTitle: claim.itemTitle || 'o pet',
      });
      Alert.alert(
        'Reivindicação aprovada!',
        'O usuário pode agora entrar em contato com você. Vocês podem combinar a devolução do pet.',
        [{ text: 'OK', onPress: () => {
          setClaims(claims.filter(c => c.id !== claimId));
          setHistoryClaims([{ ...claim, status: 'approved' }, ...historyClaims.filter(c => c.id !== claimId)]);
          setExpandedClaimId(null);
        }}]
      );
    } catch (err) {
      Alert.alert('Erro', 'Falha ao aprovar reivindicação: ' + err.message);
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleRejectClaim = async (claim) => {
    const claimId = claim.id;
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
              await rejectVerification(claimId, 'Rejeitado pelo tutor da publicação', {
                itemId: claim.itemId,
                claimantId: claim.claimant_id,
                itemTitle: claim.itemTitle || 'o pet',
              });
              setClaims(claims.filter(c => c.id !== claimId));
              setHistoryClaims([{ ...claim, status: 'rejected' }, ...historyClaims.filter(c => c.id !== claimId)]);
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (myFoundItems.length === 0) {
    return (
      <View style={styles.container}>
        <Card style={styles.messageCard}>
          <Text style={styles.messageText}>Você não cadastrou pets encontrados</Text>
          <Text style={styles.messageSubtext}>
            Quando você registrar um pet como "encontrei", a pessoa que o perdeu poderá reivindicá-lo aqui.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Solicitações pendentes */}
      {claims.length === 0 && historyClaims.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhuma solicitação encontrada</Text>
          <Text style={styles.emptySubtext}>
            As solicitações de devolução dos seus animais aparecerão aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...claims, ...historyClaims]}
          keyExtractor={claim => `${claim.id}_${claim.status}`}
          contentContainerStyle={styles.claimsList}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              {claims.length > 0 && (
                <View style={styles.pendingSummary}>
                  <Text style={styles.pendingSummaryText}>{claims.length} aguardando sua análise</Text>
                </View>
              )}
            </View>
          )}
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
                  <Text style={styles.claimItemTitle}>{claim.itemTitle || 'Animal publicado'}</Text>
                  <Text style={styles.claimTime}>
                    {new Date(claim.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <View style={styles.statusColumn}>
                  <View style={[styles.statusPill, claim.status === 'pending' ? styles.pendingPill : claim.status === 'approved' ? styles.approvedPill : styles.rejectedPill]}>
                    <Text style={styles.statusPillText}>{claim.status === 'pending' ? 'Pendente' : claim.status === 'approved' ? 'Aprovada' : 'Rejeitada'}</Text>
                  </View>
                  <Text style={styles.expandIcon}>{expandedClaimId === claim.id ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {expandedClaimId === claim.id && (
                <View style={styles.claimDetails}>
                  <View style={styles.messageSection}>
                    <Text style={styles.sectionTitle}>Mensagem:</Text>
                    <Text style={styles.claimMessage}>{claim.message}</Text>
                    {claim.itemTitle && (
                      <Text style={styles.itemLabel}>Pet: {claim.itemTitle}</Text>
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

                  {claim.rejection_reason && claim.status === 'rejected' && (
                    <View style={styles.rejectionBox}>
                      <Text style={styles.sectionTitle}>Motivo da rejeição:</Text>
                      <Text style={styles.rejectionText}>{claim.rejection_reason}</Text>
                    </View>
                  )}

                  {claim.status === 'pending' && <View style={styles.actions}>
                    <Button
                      title={processingClaimId === claim.id ? 'Processando...' : 'Rejeitar'}
                      variant="secondary"
                      onPress={() => handleRejectClaim(claim)}
                      disabled={processingClaimId === claim.id}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={processingClaimId === claim.id ? 'Processando...' : 'Aprovar'}
                      onPress={() => handleApproveClaim(claim)}
                      disabled={processingClaimId === claim.id}
                      style={{ flex: 1, marginLeft: 8 }}
                    />
                  </View>}
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
  listHeader: {
    marginBottom: 2,
  },
  pendingSummary: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  pendingSummaryText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '800',
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
  claimItemTitle: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    marginBottom: 3,
  },
  claimTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  expandIcon: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 6,
  },
  statusColumn: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pendingPill: {
    backgroundColor: '#FEF3C7',
  },
  approvedPill: {
    backgroundColor: '#DCFCE7',
  },
  rejectedPill: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '800',
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
    color: COLORS.primary,
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
  rejectionBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  rejectionText: {
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
