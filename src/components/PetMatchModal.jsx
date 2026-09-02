import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import COLORS from '../constants/theme';
import OptimizedImage from './OptimizedImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Modal visual que exibe uma lista de possíveis correspondências e comparador lado a lado
 */
export default function PetMatchModal({
  visible,
  onClose,
  newItem,
  matchedItem,
  matchedItems = [],
  initialIndex = 0,
  onViewDetails,
  onStartChat,
}) {
  const { colors, isDark } = useTheme();

  // Consolida lista de candidatos
  const candidates = (matchedItems && matchedItems.length > 0)
    ? matchedItems
    : (matchedItem ? [matchedItem] : []);

  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex || 0);
    }
  }, [visible, initialIndex]);

  if (!visible || candidates.length === 0) return null;

  const currentMatch = candidates[Math.min(currentIndex, candidates.length - 1)] || candidates[0];
  const matchData = currentMatch?.match || {};
  const percentage = matchData.percentage || 75;
  const matchLevel = matchData.level || 'Grande Chance 🔍';
  const badgeColor = matchData.badgeColor || '#10B981';

  const isNewItemLost = newItem?.status === 'lost';
  const newItemPhoto = newItem?.photo_urls?.[0] || newItem?.photos?.[0] || null;
  const currentMatchPhoto = currentMatch.photoUrl || currentMatch.photo_urls?.[0] || null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {/* Topo / Header com Ícone, Contador e Fechar */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7' }]}>
                <MaterialIcons name="auto-awesome" size={22} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {candidates.length > 1
                    ? `Correspondências (${candidates.length})`
                    : 'Match Inteligente!'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {candidates.length > 1
                    ? `${candidates.length} animais compatíveis encontrados na região`
                    : 'Encontramos um pet com alta probabilidade'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9' }]}
              accessibilityLabel="Fechar modal"
            >
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Seletor Rápido de Abas de Candidatos quando houver mais de 1 */}
          {candidates.length > 1 && (
            <View style={styles.tabSelectorContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                {candidates.map((cand, idx) => {
                  const isSelected = idx === currentIndex;
                  const candScore = cand.match?.percentage || 70;
                  const candBadgeColor = cand.match?.badgeColor || '#10B981';
                  const candPhoto = cand.photoUrl || cand.photo_urls?.[0];

                  return (
                    <TouchableOpacity
                      key={cand.id || idx}
                      style={[
                        styles.tabChip,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7')
                            : (isDark ? '#1E293B' : '#F1F5F9'),
                          borderColor: isSelected ? candBadgeColor : (isDark ? '#334155' : '#E2E8F0'),
                        },
                      ]}
                      onPress={() => setCurrentIndex(idx)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.tabChipImageWrapper}>
                        {candPhoto ? (
                          <OptimizedImage uri={candPhoto} style={styles.tabChipImage} resizeMode="cover" />
                        ) : (
                          <MaterialIcons name="pets" size={14} color={colors.primary} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.tabChipText,
                          {
                            color: isSelected ? (isDark ? '#34D399' : '#065F46') : colors.textSecondary,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {cand.animal_name || cand.title || `Opção ${idx + 1}`}
                      </Text>
                      <View style={[styles.tabChipBadge, { backgroundColor: candBadgeColor }]}>
                        <Text style={styles.tabChipBadgeText}>{candScore}%</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Controles de Navegação Anterior / Próximo */}
            {candidates.length > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  onPress={handlePrev}
                  disabled={currentIndex === 0}
                  style={[styles.pageNavBtn, { opacity: currentIndex === 0 ? 0.35 : 1, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                >
                  <MaterialIcons name="chevron-left" size={20} color={colors.text} />
                  <Text style={[styles.pageNavText, { color: colors.text }]}>Anterior</Text>
                </TouchableOpacity>

                <Text style={[styles.pageCounterText, { color: colors.textMuted }]}>
                  {currentIndex + 1} de {candidates.length}
                </Text>

                <TouchableOpacity
                  onPress={handleNext}
                  disabled={currentIndex === candidates.length - 1}
                  style={[styles.pageNavBtn, { opacity: currentIndex === candidates.length - 1 ? 0.35 : 1, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                >
                  <Text style={[styles.pageNavText, { color: colors.text }]}>Próximo</Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}

            {/* Badge de Porcentagem em Destaque */}
            <View style={[styles.percentageBadgeCard, { backgroundColor: isDark ? '#132218' : '#ECFDF5', borderColor: badgeColor }]}>
              <View style={styles.percentageRow}>
                <Text style={[styles.percentageNumber, { color: badgeColor }]}>{percentage}%</Text>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.percentageLabel, { color: badgeColor }]}>DE PROBABILIDADE</Text>
                  <Text style={[styles.percentageLevel, { color: isDark ? '#E2E8F0' : '#1E3E24' }]}>{matchLevel}</Text>
                  {matchData.distanceKm != null && (
                    <Text style={[styles.distanceText, { color: colors.primary }]}>
                      📍 Aprox. {matchData.distanceKm} km de distância
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Comparação Lado a Lado dos Dois Animais */}
            <View style={styles.compareContainer}>
              {/* Pet 1 (Cadastrado Agora) */}
              <View style={[styles.petCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder }]}>
                <View style={styles.imageWrapper}>
                  {newItemPhoto ? (
                    <Image source={{ uri: newItemPhoto }} style={styles.petImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                      <MaterialIcons name="pets" size={32} color={colors.primary} />
                    </View>
                  )}
                  <View style={[styles.statusTag, { backgroundColor: isNewItemLost ? '#EA580C' : '#16A34A' }]}>
                    <Text style={styles.statusTagText}>{isNewItemLost ? 'PERDIDO' : 'ENCONTRADO'}</Text>
                  </View>
                </View>

                <Text style={[styles.petCardName, { color: colors.text }]} numberOfLines={1}>
                  {newItem?.animal_name || newItem?.title || 'Seu Cadastro'}
                </Text>
                <Text style={[styles.petCardDetails, { color: colors.textSecondary }]} numberOfLines={2}>
                  {newItem?.species || 'Animal'} • {newItem?.breed || 'SRD'}{'\n'}
                  {newItem?.neighborhood || newItem?.city || ''}
                </Text>
              </View>

              {/* Ícone de Conexão Central */}
              <View style={[styles.connectionCircle, { backgroundColor: badgeColor }]}>
                <MaterialIcons name="sync-alt" size={18} color="#FFFFFF" />
              </View>

              {/* Pet 2 (Correspondente Atual) */}
              <View style={[styles.petCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.cardBorder }]}>
                <View style={styles.imageWrapper}>
                  {currentMatchPhoto ? (
                    <OptimizedImage uri={currentMatchPhoto} style={styles.petImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.placeholderImage, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                      <MaterialIcons name="pets" size={32} color="#10B981" />
                    </View>
                  )}
                  <View style={[styles.statusTag, { backgroundColor: !isNewItemLost ? '#EA580C' : '#16A34A' }]}>
                    <Text style={styles.statusTagText}>{!isNewItemLost ? 'PERDIDO' : 'ENCONTRADO'}</Text>
                  </View>
                </View>

                <Text style={[styles.petCardName, { color: colors.text }]} numberOfLines={1}>
                  {currentMatch.animal_name || currentMatch.title || 'Pet Correspondente'}
                </Text>
                <Text style={[styles.petCardDetails, { color: colors.textSecondary }]} numberOfLines={2}>
                  {currentMatch.species || 'Animal'} • {currentMatch.breed || 'SRD'}{'\n'}
                  {currentMatch.neighborhood || currentMatch.city || ''}
                </Text>
              </View>
            </View>

            {/* Motivos e Fatores de Compatibilidade */}
            {matchData.reasons && matchData.reasons.length > 0 && (
              <View style={[styles.reasonsBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder }]}>
                <Text style={[styles.reasonsTitle, { color: colors.text }]}>Fatores de Semelhança:</Text>
                {matchData.reasons.map((reason, idx) => (
                  <View key={idx} style={styles.reasonRow}>
                    <MaterialIcons name="check-circle" size={15} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={[styles.reasonText, { color: isDark ? '#CBD5E1' : '#334155' }]}>{reason}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Lista com todas as opções se houver mais de 1 candidato */}
            {candidates.length > 1 && (
              <View style={[styles.fullListSection, { borderTopColor: colors.cardBorder }]}>
                <Text style={[styles.fullListTitle, { color: colors.text }]}>
                  Todas as Correspondências Encontradas ({candidates.length}):
                </Text>

                {candidates.map((cand, idx) => {
                  const isSelected = idx === currentIndex;
                  const candScore = cand.match?.percentage || 70;
                  const candBadgeColor = cand.match?.badgeColor || '#10B981';
                  const candPhoto = cand.photoUrl || cand.photo_urls?.[0];

                  return (
                    <TouchableOpacity
                      key={cand.id || idx}
                      style={[
                        styles.listItemRow,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4')
                            : (isDark ? '#1E293B' : '#FFFFFF'),
                          borderColor: isSelected ? candBadgeColor : colors.cardBorder,
                        },
                      ]}
                      onPress={() => setCurrentIndex(idx)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.listItemImageWrapper}>
                        {candPhoto ? (
                          <OptimizedImage uri={candPhoto} style={styles.listItemImage} resizeMode="cover" />
                        ) : (
                          <View style={[styles.listItemPlaceholder, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                            <MaterialIcons name="pets" size={20} color={colors.primary} />
                          </View>
                        )}
                        <View style={[styles.listItemScoreBadge, { backgroundColor: candBadgeColor }]}>
                          <Text style={styles.listItemScoreText}>{candScore}%</Text>
                        </View>
                      </View>

                      <View style={styles.listItemContent}>
                        <Text style={[styles.listItemName, { color: colors.text }]} numberOfLines={1}>
                          {cand.animal_name || cand.title || 'Pet'}
                        </Text>
                        <Text style={[styles.listItemSub, { color: colors.textSecondary }]} numberOfLines={1}>
                          {cand.species || 'Animal'} • {cand.breed || 'SRD'} • {cand.gender || ''}
                        </Text>
                        <Text style={[styles.listItemLoc, { color: colors.textMuted }]} numberOfLines={1}>
                          📍 {cand.neighborhood || cand.city || 'Região'}
                          {cand.match?.distanceKm != null ? ` (${cand.match.distanceKm} km)` : ''}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.listItemDetailBtn, { backgroundColor: isSelected ? candBadgeColor : colors.primaryLight }]}
                        onPress={() => {
                          onClose();
                          if (typeof onViewDetails === 'function') {
                            onViewDetails(cand.id);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.listItemDetailBtnText,
                            { color: isSelected ? '#FFFFFF' : colors.primary },
                          ]}
                        >
                          Ver
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Botões de Ação no Rodapé */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => {
                onClose();
                if (typeof onViewDetails === 'function') {
                  onViewDetails(currentMatch.id);
                }
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons name="visibility" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.primaryActionBtnText}>Ver Detalhes deste Pet</Text>
            </TouchableOpacity>

            {currentMatch.owner_id && (
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { borderColor: COLORS.primary }]}
                onPress={() => {
                  onClose();
                  if (typeof onStartChat === 'function') {
                    onStartChat(currentMatch.owner_id, currentMatch.id, currentMatch.title);
                  }
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="chat" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.secondaryActionBtnText, { color: COLORS.primary }]}>
                  {isNewItemLost ? 'Conversar com quem encontrou' : 'Conversar com o Tutor'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.dismissBtnText, { color: colors.textMuted }]}>Continuar e ver depois</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  // Abas de Candidatos
  tabSelectorContainer: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  tabsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  tabChipImageWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipImage: {
    width: '100%',
    height: '100%',
  },
  tabChipText: {
    fontSize: 12,
  },
  tabChipBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tabChipBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  // Paginação
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 2,
  },
  pageNavText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  pageCounterText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  body: {
    paddingHorizontal: 16,
    maxHeight: 460,
  },

  percentageBadgeCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 14,
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageNumber: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  percentageLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  percentageLevel: {
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 2,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  compareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    position: 'relative',
  },
  petCard: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: 105,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  petCardName: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
    marginBottom: 2,
  },
  petCardDetails: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  connectionCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },

  reasonsBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  reasonsTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  // Lista Completa de Correspondências
  fullListSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  fullListTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  listItemImageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  listItemImage: {
    width: '100%',
    height: '100%',
  },
  listItemPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemScoreBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  listItemScoreText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  listItemName: {
    fontSize: 13,
    fontWeight: '800',
  },
  listItemSub: {
    fontSize: 11,
    marginTop: 1,
  },
  listItemLoc: {
    fontSize: 10,
    marginTop: 2,
  },
  listItemDetailBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  listItemDetailBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
  },
  secondaryActionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dismissBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
