import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RANKS } from '../services/gamification';
import COLORS from '../constants/theme';

const GamificationCard = ({ gamificationData, onRefresh }) => {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  if (!gamificationData) return null;

  const { xp = 0, rank, allBadges = [], unlockedBadges = [] } = gamificationData;
  const currentRank = rank?.currentRank || RANKS[0];
  const nextRank = rank?.nextRank;
  const progressPercent = Math.round((rank?.progress || 0) * 100);

  return (
    <View style={styles.wrapper}>
      {/* CARD PRINCIPAL DE NÍVEL & XP */}
      <TouchableOpacity
        style={[
          styles.cardContainer,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? '#334155' : colors.cardBorder,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        {/* Linha Superior: Ícone do Nível, Título e Total de XP */}
        <View style={styles.topRow}>
          <View style={[styles.rankIconBox, { backgroundColor: currentRank.badgeBg || '#DCFCE7' }]}>
            <MaterialIcons name={currentRank.icon || 'shield'} size={24} color={currentRank.color || '#166534'} />
          </View>

          <View style={styles.rankInfoBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.rankTitle, { color: colors.text }]}>{currentRank.title}</Text>
              <View style={[styles.levelBadge, { backgroundColor: currentRank.color }]}>
                <Text style={styles.levelBadgeText}>NÍVEL {currentRank.level}</Text>
              </View>
            </View>
            <Text style={[styles.rankSub, { color: colors.textSecondary }]}>
              {xp} Pontos de Impacto (XP) acumulados
            </Text>
          </View>

          <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
        </View>

        {/* Barra de Progresso para o Próximo Nível */}
        {nextRank ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeaderRow}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Próximo: <Text style={{ fontWeight: '800', color: colors.text }}>{nextRank.title}</Text>
              </Text>
              <Text style={[styles.progressXpText, { color: colors.primary }]}>
                Faltam {rank.xpForNext} XP ({progressPercent}%)
              </Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: currentRank.color || colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.maxRankBadge}>
            <MaterialIcons name="workspace-premium" size={16} color="#D97706" />
            <Text style={styles.maxRankText}>Patente Máxima de Guardião Lendário Conquistada! 👑</Text>
          </View>
        )}

        {/* Linha das Medalhas Conquistadas */}
        <View style={[styles.badgesRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.badgesLabel, { color: colors.textSecondary }]}>
            Conquistas ({unlockedBadges.length}/{allBadges.length}):
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
            {allBadges.map((badge) => {
              const isUnlocked = badge.isUnlocked;
              return (
                <View
                  key={badge.id}
                  style={[
                    styles.miniBadgeChip,
                    {
                      backgroundColor: isUnlocked
                        ? (isDark ? 'rgba(46, 86, 52, 0.3)' : '#DCFCE7')
                        : (isDark ? '#1E293B' : '#F1F5F9'),
                      borderColor: isUnlocked ? '#86EFAC' : (isDark ? '#334155' : '#E2E8F0'),
                      opacity: isUnlocked ? 1 : 0.45,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={badge.icon}
                    size={14}
                    color={isUnlocked ? '#15803D' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.miniBadgeTitle,
                      { color: isUnlocked ? '#15803D' : colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {badge.title.split(' ')[0]}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>

      {/* MODAL DETALHADO DO SISTEMA DE CONQUISTAS E NÍVEIS */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="workspace-premium" size={24} color={currentRank.color} />
                <View>
                  <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Guardião da Comunidade</Text>
                  <Text style={[styles.modalHeaderSub, { color: colors.textSecondary }]}>Níveis, Conquistas e Pontos</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Resumo do Status Atual */}
              <View style={[styles.modalStatusBox, { backgroundColor: currentRank.badgeBg || '#DCFCE7' }]}>
                <MaterialIcons name={currentRank.icon} size={32} color={currentRank.color} />
                <Text style={[styles.modalRankName, { color: currentRank.color }]}>{currentRank.title}</Text>
                <Text style={styles.modalRankXp}>{xp} XP Total Acumulado</Text>
                <Text style={styles.modalRankDesc}>{currentRank.description}</Text>
              </View>

              {/* Seção: Como Ganhar Mais Pontos */}
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Como Ganhar Pontos (XP)</Text>
              <View style={[styles.rulesList, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleEmoji}>🎉</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ruleTitle, { color: colors.text }]}>Reencontro Confirmado</Text>
                    <Text style={[styles.ruleSub, { color: colors.textSecondary }]}>Pet perdido de volta para casa</Text>
                  </View>
                  <Text style={styles.rulePoints}>+250 XP</Text>
                </View>

                <View style={styles.ruleItem}>
                  <Text style={styles.ruleEmoji}>🏡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ruleTitle, { color: colors.text }]}>Lar Temporário Ativo</Text>
                    <Text style={[styles.ruleSub, { color: colors.textSecondary }]}>Oferecer abrigo solidário</Text>
                  </View>
                  <Text style={styles.rulePoints}>+120 XP</Text>
                </View>

                <View style={styles.ruleItem}>
                  <Text style={styles.ruleEmoji}>🪪</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ruleTitle, { color: colors.text }]}>Cadastrar Pet no RG</Text>
                    <Text style={[styles.ruleSub, { color: colors.textSecondary }]}>Documentar animais de casa</Text>
                  </View>
                  <Text style={styles.rulePoints}>+35 XP</Text>
                </View>

                <View style={styles.ruleItem}>
                  <Text style={styles.ruleEmoji}>👁️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ruleTitle, { color: colors.text }]}>Publicação / Avistamento</Text>
                    <Text style={[styles.ruleSub, { color: colors.textSecondary }]}>Avisar animal visto ou perdido</Text>
                  </View>
                  <Text style={styles.rulePoints}>+40 XP</Text>
                </View>

                <View style={[styles.ruleItem, { borderBottomWidth: 0 }]}>
                  <Text style={styles.ruleEmoji}>📢</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ruleTitle, { color: colors.text }]}>Divulgar Cartaz / Stories</Text>
                    <Text style={[styles.ruleSub, { color: colors.textSecondary }]}>Compartilhar com QR Code</Text>
                  </View>
                  <Text style={styles.rulePoints}>+20 XP</Text>
                </View>
              </View>

              {/* Seção: Todas as Medalhas e Conquistas */}
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Todas as Conquistas ({unlockedBadges.length}/{allBadges.length})
              </Text>
              <View style={styles.allBadgesList}>
                {allBadges.map((badge) => {
                  const isUnlocked = badge.isUnlocked;
                  return (
                    <View
                      key={badge.id}
                      style={[
                        styles.badgeCardItem,
                        {
                          backgroundColor: isUnlocked
                            ? (isDark ? 'rgba(46, 86, 52, 0.25)' : '#F0FDF4')
                            : (isDark ? '#1E293B' : '#F8FAFC'),
                          borderColor: isUnlocked ? '#86EFAC' : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.badgeIconCircle,
                          {
                            backgroundColor: isUnlocked ? '#DCFCE7' : (isDark ? '#334155' : '#E2E8F0'),
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={badge.icon}
                          size={22}
                          color={isUnlocked ? '#15803D' : colors.textMuted}
                        />
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={[styles.badgeTitle, { color: colors.text }]}>{badge.title}</Text>
                          {isUnlocked ? (
                            <View style={styles.unlockedTag}>
                              <Text style={styles.unlockedTagText}>CONQUISTADA ✓</Text>
                            </View>
                          ) : (
                            <Text style={[styles.badgeXpReward, { color: colors.textMuted }]}>+{badge.xpReward} XP</Text>
                          )}
                        </View>
                        <Text style={[styles.badgeDesc, { color: colors.textSecondary }]}>
                          {badge.description}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  cardContainer: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankInfoBox: {
    flex: 1,
    marginLeft: 12,
  },
  rankTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  rankSub: {
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
  },
  progressXpText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  maxRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  maxRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  badgesLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgesScroll: {
    gap: 6,
  },
  miniBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  miniBadgeTitle: {
    fontSize: 10.5,
    fontWeight: '800',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  modalHeaderSub: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  modalScrollBody: {
    padding: 16,
    paddingBottom: 30,
  },
  modalStatusBox: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  modalRankName: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  modalRankXp: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  modalRankDesc: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 10,
    letterSpacing: 0.3,
  },
  rulesList: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.6)',
    gap: 10,
  },
  ruleEmoji: {
    fontSize: 20,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  ruleSub: {
    fontSize: 11,
  },
  rulePoints: {
    fontSize: 13,
    fontWeight: '900',
    color: '#16A34A',
  },
  allBadgesList: {
    gap: 8,
  },
  badgeCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  badgeIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  unlockedTag: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  unlockedTagText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },
  badgeXpReward: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  badgeDesc: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
});

export default GamificationCard;
