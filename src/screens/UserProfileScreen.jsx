import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as userService from '../services/user';
import * as itemsService from '../services/items';
import OptimizedImage from '../components/OptimizedImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const UserProfileScreen = ({ route, navigation }) => {
  const { userId, userName: initialName, avatarUrl: initialAvatar } = route.params || {};
  const { user: currentUser } = useAuth();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [userItems, setUserItems] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'lost' | 'found' | 'adoption' | 'resolved'
  const [refreshing, setRefreshing] = useState(false);

  const isOwnProfile = currentUser && currentUser.id === userId;

  const loadUserData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const [profileData, itemsData] = await Promise.all([
        userService.getUserById(userId),
        itemsService.getUserItems(userId),
      ]);
      setProfile(profileData || { name: initialName, avatar_url: initialAvatar });
      setUserItems(itemsData || []);
    } catch (error) {
      console.log('[UserProfileScreen] Erro ao carregar dados do usuário:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, initialName, initialAvatar]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleOpenChat = () => {
    if (!currentUser) {
      Alert.alert(
        'Login necessário',
        'Entre ou crie uma conta para conversar com este membro.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Entrar', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (isOwnProfile) {
      Alert.alert('Aviso', 'Este é o seu próprio perfil.');
      return;
    }

    navigation.navigate('ChatScreen', {
      conversation: {
        otherId: userId,
        otherName: profile?.name || initialName || 'Membro WeFIND',
        avatarUrl: profile?.avatar_url || profile?.avatarUrl || initialAvatar || null,
        itemTitle: 'Perfil do Usuário',
      },
    });
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = profile?.whatsapp || profile?.phone;
    if (!rawPhone) {
      Alert.alert('Informação', 'Este usuário não disponibilizou número de WhatsApp público.');
      return;
    }
    let digits = String(rawPhone).replace(/\D/g, '');
    if (!digits.startsWith('55')) {
      digits = `55${digits}`;
    }
    const message = encodeURIComponent(`Olá ${profile?.name || ''}, vi seu perfil no aplicativo WeFIND!`);
    const url = `whatsapp://send?phone=${digits}&text=${message}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://wa.me/${digits}?text=${message}`);
        }
      })
      .catch(() => {
        Linking.openURL(`https://wa.me/${digits}?text=${message}`);
      });
  };

  const handleShareProfile = async () => {
    try {
      const displayName = profile?.name || initialName || 'Membro';
      await Share.share({
        message: `Confira o perfil de ${displayName} no WeFIND - Plataforma para localização e adoção de animais!`,
      });
    } catch (e) {
      console.log('Erro ao compartilhar:', e.message);
    }
  };

  const formatDisplayPhone = (value) => {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('55')) digits = digits.slice(2);
    if (!digits) return null;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) 9${digits.slice(2, 6)}-${digits.slice(6)}`;
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return digits;
  };

  const formatJoinDate = (dateStr) => {
    if (!dateStr) return 'Membro da Comunidade';
    try {
      const d = new Date(dateStr);
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      return `Membro desde ${months[d.getMonth()]} de ${d.getFullYear()}`;
    } catch {
      return 'Membro da Comunidade';
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>Carregando perfil...</Text>
      </View>
    );
  }

  const displayName = profile?.name || initialName || 'Membro WeFIND';
  const initial = displayName.trim()[0]?.toUpperCase() || 'U';
  const avatarUri = profile?.avatar_url || profile?.avatarUrl || initialAvatar;
  const phoneNumber = profile?.whatsapp || profile?.phone;
  const formattedPhone = formatDisplayPhone(phoneNumber);

  const city = profile?.city;
  const state = profile?.state;
  const neighborhood = profile?.neighborhood;
  const locationSummary = (city && state)
    ? `${city} - ${state}`
    : (city || state || 'Localidade não informada');

  const activePosts = userItems.filter(i => !i.resolved && i.status !== 'resolved');
  const resolvedPosts = userItems.filter(i => i.resolved || i.status === 'resolved');
  const lostPosts = userItems.filter(i => i.status === 'lost' && !i.resolved);
  const foundPosts = userItems.filter(i => i.status === 'found' && !i.resolved);
  const adoptionPosts = userItems.filter(i => (i.extra_fields?.is_direct_adoption || itemsService.isPetAvailableForAdoption(i)) && !i.resolved);

  const filteredItems = userItems.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'lost') return item.status === 'lost' && !item.resolved;
    if (activeTab === 'found') return item.status === 'found' && !item.resolved;
    if (activeTab === 'adoption') return (item.extra_fields?.is_direct_adoption || itemsService.isPetAvailableForAdoption(item)) && !item.resolved;
    if (activeTab === 'resolved') return item.resolved || item.status === 'resolved';
    return true;
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO HEADER CARD */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        {/* Banner decorativo sutil de fundo */}
        <View style={[styles.heroCover, { backgroundColor: isDark ? '#1E293B' : '#DBEAFE' }]}>
          <View style={styles.heroCoverOverlay} />
        </View>

        {/* Avatar e Badges */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarWrapper, { backgroundColor: colors.surface, borderColor: colors.background }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Informações do Membro */}
        <View style={styles.profileInfoContainer}>
          <Text style={[styles.profileName, { color: colors.text }]}>{displayName}</Text>

          <View style={[styles.roleBadge, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF', borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : '#BFDBFE' }]}>
            <MaterialIcons name="verified-user" size={13} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.roleBadgeText, { color: colors.primary }]}>Membro da Comunidade WeFIND</Text>
          </View>

          {/* Localização e Data de entrada */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="location-on" size={15} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {locationSummary}{neighborhood ? ` (${neighborhood})` : ''}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <MaterialIcons name="event" size={15} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {formatJoinDate(profile?.created_at)}
              </Text>
            </View>
          </View>

          {/* Bio / Apresentação (se houver) */}
          {profile?.bio ? (
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>
              "{profile.bio}"
            </Text>
          ) : null}

          {/* Ações Rápidas (Chat, WhatsApp, Compartilhar) */}
          <View style={styles.actionButtonsRow}>
            {!isOwnProfile && (
              <TouchableOpacity
                onPress={handleOpenChat}
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <MaterialIcons name="chat-bubble-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>Enviar Mensagem</Text>
              </TouchableOpacity>
            )}

            {phoneNumber && !isOwnProfile && (
              <TouchableOpacity
                onPress={handleOpenWhatsApp}
                style={[styles.whatsappActionBtn, { backgroundColor: '#25D366' }]}
                activeOpacity={0.85}
              >
                <Feather name="phone-call" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.whatsappActionBtnText}>WhatsApp</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleShareProfile}
              style={[styles.iconActionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="share" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Grid de Estatísticas de Impacto */}
        <View style={[styles.statsGrid, { borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{userItems.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Publicações</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#059669' }]}>{resolvedPosts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Reencontros</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#D97706' }]}>{activePosts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Ativas</Text>
          </View>
        </View>
      </View>

      {/* 2. SEÇÃO DE REDES / CONTATOS ADICIONAIS */}
      {(profile?.instagram || profile?.facebook) && (
        <View style={[styles.socialCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Redes e Contato</Text>
          <View style={styles.socialRow}>
            {profile?.instagram && (
              <TouchableOpacity
                style={[styles.socialChip, { backgroundColor: isDark ? '#1E293B' : '#FDF2F8', borderColor: '#F472B6' }]}
                onPress={() => {
                  const handle = profile.instagram.replace('@', '');
                  Linking.openURL(`https://instagram.com/${handle}`);
                }}
              >
                <Feather name="instagram" size={14} color="#E1306C" style={{ marginRight: 5 }} />
                <Text style={{ color: isDark ? '#F472B6' : '#BE185D', fontSize: 12.5, fontWeight: '700' }}>
                  @{profile.instagram.replace('@', '')}
                </Text>
              </TouchableOpacity>
            )}

            {profile?.facebook && (
              <TouchableOpacity
                style={[styles.socialChip, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderColor: '#93C5FD' }]}
                onPress={() => Linking.openURL(profile.facebook.startsWith('http') ? profile.facebook : `https://${profile.facebook}`)}
              >
                <Feather name="facebook" size={14} color="#1877F2" style={{ marginRight: 5 }} />
                <Text style={{ color: isDark ? '#93C5FD' : '#1D4ED8', fontSize: 12.5, fontWeight: '700' }}>Facebook</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 3. LISTA DE ANIMAIS / PUBLICAÇÕES */}
      <View style={styles.postsSection}>
        <View style={styles.postsHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Publicações de {displayName.split(' ')[0]}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
          </Text>
        </View>

        {/* Filtros em Abas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { key: 'all', label: `Todos (${userItems.length})` },
            { key: 'lost', label: `Perdidos (${lostPosts.length})` },
            { key: 'found', label: `Encontrados (${foundPosts.length})` },
            { key: 'adoption', label: `Adoção (${adoptionPosts.length})` },
            { key: 'resolved', label: `Reencontrados (${resolvedPosts.length})` },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabChip,
                  { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', borderColor: isDark ? '#334155' : '#E2E8F0' },
                  isSelected && [styles.tabChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabChipText, { color: isDark ? '#94A3B8' : '#475569' }, isSelected && styles.tabChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lista de Pets */}
        {filteredItems.length === 0 ? (
          <View style={[styles.emptyPostsCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <MaterialIcons name="pets" size={38} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyPostsTitle, { color: colors.text }]}>Nenhuma publicação nesta categoria</Text>
            <Text style={[styles.emptyPostsSubtitle, { color: colors.textSecondary }]}>
              {displayName.split(' ')[0]} não possui anúncios com este status no momento.
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const isAdoption = Boolean(item.extra_fields?.is_direct_adoption || itemsService.isPetAvailableForAdoption(item));
            const isResolved = item.resolved || item.status === 'resolved';
            const isFound = !isAdoption && !isResolved && item.status === 'found';
            const isLost = !isAdoption && !isResolved && item.status === 'lost';

            const statusBg = isResolved
              ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5')
              : isAdoption
              ? (isDark ? 'rgba(219, 39, 119, 0.2)' : '#FDF2F8')
              : isFound
              ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5')
              : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2');

            const statusTextColor = isResolved
              ? '#059669'
              : isAdoption
              ? '#DB2777'
              : isFound
              ? '#059669'
              : '#DC2626';

            const statusLabel = isResolved
              ? 'Reencontrado 🎉'
              : isAdoption
              ? 'Para Adoção'
              : isFound
              ? 'Encontrado'
              : 'Perdido';

            const photoUrl = item.item_photos?.[0]?.url || item.photos?.[0] || item.photo_url || null;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.petCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
                activeOpacity={0.88}
              >
                <View style={styles.petCardContent}>
                  {/* Foto do Pet */}
                  <View style={[styles.petImageContainer, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                    {photoUrl ? (
                      <OptimizedImage uri={photoUrl} style={styles.petImage} resizeMode="cover" />
                    ) : (
                      <MaterialIcons name="pets" size={30} color={colors.textMuted} />
                    )}
                  </View>

                  {/* Informações do Pet */}
                  <View style={styles.petInfoContainer}>
                    <View style={styles.petStatusRow}>
                      <View style={[styles.petStatusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.petStatusBadgeText, { color: statusTextColor }]}>{statusLabel}</Text>
                      </View>
                      {item.species ? (
                        <Text style={[styles.petSpeciesText, { color: colors.textMuted }]}>
                          {item.species.toUpperCase()}
                        </Text>
                      ) : null}
                    </View>

                    <Text style={[styles.petTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title || item.species || 'Animal'}
                    </Text>

                    {item.breed ? (
                      <Text style={[styles.petBreed, { color: colors.textSecondary }]} numberOfLines={1}>
                        Raça: {item.breed}
                      </Text>
                    ) : null}

                    <View style={styles.petLocationRow}>
                      <MaterialIcons name="location-on" size={13} color={colors.primary} />
                      <Text style={[styles.petLocationText, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.city && item.state ? `${item.city} - ${item.state}` : (item.city || item.state || 'Local não informado')}
                      </Text>
                    </View>
                  </View>

                  <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} style={{ alignSelf: 'center' }} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heroCard: {
    margin: 14,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  heroCover: {
    height: 72,
    width: '100%',
  },
  heroCoverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  avatarSection: {
    marginTop: -42,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '900',
  },
  profileInfoContainer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 10,
  },
  roleBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  metaRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  bioText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 19,
    marginVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    flex: 1,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  whatsappActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  iconActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  socialCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  postsSection: {
    paddingHorizontal: 14,
  },
  postsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    paddingRight: 10,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabChipActive: {},
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptyPostsCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyPostsTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyPostsSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  petCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  petCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  petImageContainer: {
    width: 74,
    height: 74,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petImage: {
    width: 74,
    height: 74,
  },
  petInfoContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  petStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  petStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  petStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  petSpeciesText: {
    fontSize: 10,
    fontWeight: '700',
  },
  petTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  petBreed: {
    fontSize: 12,
    marginBottom: 4,
  },
  petLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  petLocationText: {
    fontSize: 11.5,
  },
});

export default UserProfileScreen;
