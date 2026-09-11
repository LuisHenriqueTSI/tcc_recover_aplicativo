import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
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
import { getWeeklyRanking } from '../services/ranking';
import COLORS from '../constants/theme';

const RankingScreen = () => {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRanking = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await getWeeklyRanking(user?.id, userProfile?.city);
      setData(result);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, userProfile?.city]);

  useFocusEffect(useCallback(() => {
    loadRanking();
  }, [loadRanking]));

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando ranking...</Text>
      </View>
    );
  }

  const ownPosition = data?.ownPosition;
  const hasRanking = (data?.topTen || []).length > 0;
  const podiumColors = [COLORS.gold, COLORS.secondary, '#64748B'];
  const podium = (data?.topTen || []).slice(0, 3);
  const remainingMembers = (data?.topTen || []).slice(3);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRanking(true)} colors={[colors.primary]} />}
    >
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.heroTopLine}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="emoji-events" size={27} color={COLORS.gold} />
          </View>
          <View style={styles.weekPill}>
            <MaterialIcons name="autorenew" size={13} color="#E5EFE7" />
            <Text style={styles.weekPillText}>SEMANAL</Text>
          </View>
        </View>
        <Text style={styles.heroEyebrow}>PLACAR DA COMUNIDADE</Text>
        <Text style={styles.heroTitle}>Reconheça quem está ajudando</Text>
        <Text style={styles.heroText}>
          Ações de impacto desta semana{data?.city ? ` em ${data.city}` : ''}.
        </Text>
      </View>

      {ownPosition ? (
        <View style={[styles.positionCard, { backgroundColor: colors.card, borderColor: COLORS.secondaryBorder }]}>
          <View style={[styles.positionIcon, { backgroundColor: COLORS.secondaryLight }]}>
            <Text style={[styles.positionNumber, { color: COLORS.secondaryDark }]}>#{ownPosition.position}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.positionLabel, { color: colors.textSecondary }]}>Sua posição</Text>
            <Text style={[styles.positionName, { color: colors.text }]}>{ownPosition.score} pontos nesta semana</Text>
          </View>
          <MaterialIcons name="trending-up" size={24} color={colors.primary} />
        </View>
      ) : (
        <View style={[styles.emptyPosition, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <MaterialIcons name="flag" size={24} color={COLORS.secondary} />
          <Text style={[styles.emptyPositionText, { color: colors.text }]}>
            Faça uma ação de impacto para entrar no ranking desta semana.
          </Text>
        </View>
      )}

      {hasRanking && (
        <View style={[styles.podiumCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.podiumHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Destaques da semana</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Quem mais colaborou até agora</Text>
            </View>
            <MaterialIcons name="military-tech" size={25} color={COLORS.secondary} />
          </View>
          <View style={styles.podiumRow}>
            {[podium[1], podium[0], podium[2]].map((member, index) => {
              if (!member) return <View key={`empty-${index}`} style={styles.podiumSlot} />;
              const podiumPosition = member.position;
              const isWinner = podiumPosition === 1;
              return (
                <View key={String(member.userId)} style={[styles.podiumSlot, isWinner && styles.winnerSlot]}>
                  <View style={[styles.podiumAvatar, { backgroundColor: isWinner ? COLORS.secondaryLight : colors.primaryLight, borderColor: podiumColors[podiumPosition - 1] }]}>
                    <Text style={[styles.podiumAvatarText, { color: isWinner ? COLORS.secondaryDark : colors.primary }]}>
                      {member.name[0]}
                    </Text>
                  </View>
                  <View style={[styles.podiumPosition, { backgroundColor: podiumColors[podiumPosition - 1] }]}>
                    <Text style={styles.podiumPositionText}>{podiumPosition}</Text>
                  </View>
                  <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{member.name}</Text>
                  <Text style={[styles.podiumScore, { color: COLORS.secondaryDark }]}>{member.score} pts</Text>
                  <View style={[styles.podiumBase, { backgroundColor: podiumPosition === 1 ? COLORS.secondary : colors.primaryLight, height: isWinner ? 54 : 38 }]} />
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ranking semanal</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>A pontuação reinicia toda segunda-feira</Text>
        </View>
        <MaterialIcons name="leaderboard" size={24} color={COLORS.secondary} />
      </View>

      {!hasRanking ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <MaterialIcons name="groups" size={38} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>O placar está começando</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Seja o primeiro a colaborar nesta semana.</Text>
        </View>
      ) : (
        remainingMembers.map((member) => {
          const isCurrentUser = String(member.userId) === String(user?.id);
          const medalColor = podiumColors[member.position - 1];
          return (
            <View
              key={String(member.userId)}
              style={[
                styles.memberCard,
                { backgroundColor: colors.card, borderColor: isCurrentUser ? COLORS.secondary : colors.cardBorder },
                isCurrentUser && styles.currentMemberCard,
              ]}
            >
              <View style={[styles.rankBadge, { backgroundColor: member.position <= 3 ? `${medalColor}22` : colors.primaryLight }]}>
                <Text style={[styles.rankText, { color: member.position <= 3 ? medalColor : colors.primary }]}>
                  {member.position}
                </Text>
              </View>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{member.name[0]}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>{member.name}{isCurrentUser ? ' (você)' : ''}</Text>
                <Text style={[styles.memberMeta, { color: colors.textSecondary }]}>
                  {member.actions} {member.actions === 1 ? 'ação' : 'ações'} de impacto
                </Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={[styles.score, { color: COLORS.secondaryDark }]}>{member.score}</Text>
                <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>pts</Text>
              </View>
            </View>
          );
        })
      )}
      {hasRanking && data.topTen.length <= 3 && (
        <Text style={[styles.rankingEndText, { color: colors.textSecondary }]}>
          Continue colaborando para aparecer entre os próximos destaques.
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  hero: { borderRadius: 24, padding: 22, marginBottom: 14, overflow: 'hidden' },
  heroTopLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 17 },
  heroIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  weekPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.12)' },
  weekPillText: { color: '#E5EFE7', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroEyebrow: { color: '#D9E8DC', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', marginTop: 6, lineHeight: 31 },
  heroText: { color: '#E5EFE7', fontSize: 13, lineHeight: 19, marginTop: 8 },
  positionCard: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  positionIcon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  positionNumber: { fontSize: 17, fontWeight: '900' },
  positionLabel: { fontSize: 12, fontWeight: '700' },
  positionName: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  emptyPosition: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  emptyPositionText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  podiumCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 24 },
  podiumHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', minHeight: 162 },
  podiumSlot: { alignItems: 'center', justifyContent: 'flex-end', flex: 1, minWidth: 0 },
  winnerSlot: { marginBottom: 10 },
  podiumAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  podiumAvatarText: { fontSize: 20, fontWeight: '900' },
  podiumPosition: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: -11, borderWidth: 2, borderColor: '#FFFFFF' },
  podiumPositionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  podiumName: { fontSize: 12, fontWeight: '800', marginTop: 7, maxWidth: 86, textAlign: 'center' },
  podiumScore: { fontSize: 11, fontWeight: '900', marginTop: 3 },
  podiumBase: { width: '76%', borderRadius: 8, marginTop: 8, opacity: 0.95 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '800' },
  sectionSubtitle: { fontSize: 12, marginTop: 3 },
  memberCard: { borderWidth: 1, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  currentMemberCard: { borderWidth: 2 },
  rankBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  rankText: { fontSize: 15, fontWeight: '900' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 17, fontWeight: '800' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '800' },
  memberMeta: { fontSize: 11, marginTop: 3 },
  scoreBox: { alignItems: 'flex-end', marginLeft: 8 },
  score: { fontSize: 18, fontWeight: '900' },
  scoreLabel: { fontSize: 10, fontWeight: '700' },
  emptyCard: { borderWidth: 1, borderRadius: 16, padding: 28, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptyText: { fontSize: 13, marginTop: 5, textAlign: 'center' },
  rankingEndText: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 3, paddingHorizontal: 18 },
});

export default RankingScreen;
