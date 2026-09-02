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
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as userService from '../services/user';
import * as itemsService from '../services/items';
import * as ratingsService from '../services/ratings';
import { getFosterProfile } from '../services/foster';
import { getUserGamificationData } from '../services/gamification';
import OptimizedImage from '../components/OptimizedImage';
import COLORS from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const UserProfileScreen = ({ route, navigation }) => {
  const { userId, userName: initialName, avatarUrl: initialAvatar } = route.params || {};
  const { user: currentUser, userProfile: currentUserProfile, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [fosterProfile, setFosterProfile] = useState(null);
  const [userItems, setUserItems] = useState([]);
  const [ratingsData, setRatingsData] = useState({ ratings: [], average: 5.0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  const [activeMainSection, setActiveMainSection] = useState('posts'); // 'posts' | 'ratings'
  const [activePostTab, setActivePostTab] = useState('all'); // 'all' | 'lost' | 'found' | 'adoption' | 'resolved'
  const [refreshing, setRefreshing] = useState(false);
  const [gamificationData, setGamificationData] = useState(null);

  // Estados do Modal de Avaliação
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedStars, setSelectedStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState([]);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const isOwnProfile = currentUser && currentUser.id === userId;

  const loadUserData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [profileRes, itemsRes, ratingsRes, fosterRes, gamiRes] = await Promise.allSettled([
        userService.getUserById(userId),
        itemsService.getUserItems(userId),
        ratingsService.getUserRatings(userId),
        getFosterProfile(userId),
        getUserGamificationData(userId, profileData),
      ]);

      const profileData = profileRes.status === 'fulfilled' ? profileRes.value : null;
      const itemsData = itemsRes.status === 'fulfilled' ? itemsRes.value : [];
      const userRatings = ratingsRes.status === 'fulfilled' ? ratingsRes.value : null;
      const fosterData = fosterRes.status === 'fulfilled' ? fosterRes.value : null;
      const gamiData = gamiRes.status === 'fulfilled' ? gamiRes.value : null;

      setProfile(profileData || { id: userId, name: initialName || 'Membro WeFIND', avatar_url: initialAvatar });
      setFosterProfile(fosterData);
      setUserItems(Array.isArray(itemsData) ? itemsData : []);
      setRatingsData(userRatings || { ratings: [], average: 5.0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
      setGamificationData(gamiData);

      // Se o usuário logado já tiver avaliação existente, pré-carrega
      if (currentUser && userRatings?.ratings && Array.isArray(userRatings.ratings)) {
        const existing = userRatings.ratings.find(r => r.reviewerId === currentUser.id);
        if (existing) {
          setSelectedStars(existing.stars || 5);
          setSelectedTags(existing.tags || []);
          setReviewComment(existing.comment || '');
        }
      }
    } catch (error) {
      console.log('[UserProfileScreen] Erro ao carregar dados do usuário:', error.message);
      setProfile({ id: userId, name: initialName || 'Membro WeFIND', avatar_url: initialAvatar });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, initialName, initialAvatar, currentUser]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const handleOpenRatingModal = () => {
    if (!currentUser) {
      Alert.alert(
        'Login necessário',
        'Entre ou crie uma conta para avaliar e deixar um relato sobre este membro.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Entrar', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (isOwnProfile) {
      Alert.alert('Aviso', 'Você não pode avaliar seu próprio perfil.');
      return;
    }

    setRatingModalVisible(true);
  };

  const handleToggleTag = (tag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      }
      return [...prev, tag];
    });
  };

  const handleSubmitRating = async () => {
    if (!currentUser) return;
    setSubmittingRating(true);
    try {
      const reviewerDisplayName = currentUserProfile?.name || currentUser.user_metadata?.name || 'Membro da Comunidade';
      const reviewerAvatar = currentUserProfile?.avatar_url || currentUserProfile?.avatarUrl || null;

      await ratingsService.submitUserRating({
        targetUserId: userId,
        reviewerId: currentUser.id,
        reviewerName: reviewerDisplayName,
        reviewerAvatar,
        stars: selectedStars,
        tags: selectedTags,
        comment: reviewComment,
      });

      Alert.alert('Avaliação enviada!', 'Obrigado por ajudar a manter a comunidade WeFIND confiável e unida!');
      setRatingModalVisible(false);
      loadUserData();
    } catch (error) {
      Alert.alert('Erro ao avaliar', error.message || 'Não foi possível registrar a avaliação.');
    } finally {
      setSubmittingRating(false);
    }
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

  const handleDeleteReview = (rating) => {
    const isReviewer = currentUser && rating.reviewerId === currentUser.id;
    Alert.alert(
      isAdmin && !isReviewer ? 'Excluir Avaliação (Super Admin)' : 'Excluir Minha Avaliação',
      isAdmin && !isReviewer
        ? 'Como Administrador, você está excluindo este relato de avaliação permanentemente do banco de dados.'
        : 'Tem certeza de que deseja excluir sua avaliação sobre este membro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await ratingsService.deleteUserRating(rating.id, userId);
              Alert.alert('Sucesso', 'Avaliação excluída com sucesso.');
              loadUserData();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a avaliação: ' + (error.message || 'Erro desconhecido'));
            }
          },
        },
      ]
    );
  };

  const handleToggleAdminRole = () => {
    const isTargetAdmin = profile?.adm === true || profile?.adm === 'true' || profile?.role === 'admin';
    const newRole = isTargetAdmin ? 'user' : 'admin';
    const actionLabel = isTargetAdmin ? 'Remover Privilégios de Administrador' : 'Promover para Super Administrador';

    Alert.alert(
      actionLabel,
      `Deseja ${isTargetAdmin ? 'remover o cargo de Administrador de' : 'conceder acesso total de Administrador para'} "${profile?.name || 'este usuário'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await userService.updateUserRole(userId, newRole);
              setProfile(prev => ({
                ...prev,
                role: newRole,
                adm: !isTargetAdmin,
              }));
              Alert.alert('Sucesso', `Cargo do usuário atualizado para "${newRole}" com sucesso!`);
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível atualizar o cargo: ' + (error.message || 'Erro desconhecido'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteUserAccount = () => {
    Alert.alert(
      'Excluir Conta do Usuário (Admin)',
      `ATENÇÃO: Deseja excluir permanentemente o perfil de "${profile?.name || 'este usuário'}", todas as suas publicações, fotos e comentários? Esta ação NÃO pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Permanentemente',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.deleteUserProfile(userId);
              Alert.alert('Sucesso', 'Usuário e todos os seus dados foram excluídos com sucesso.');
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainApp');
              }
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o usuário: ' + (error.message || 'Erro desconhecido'));
            }
          },
        },
      ]
    );
  };

  const handleDeleteUserItem = (targetItem) => {
    Alert.alert(
      'Excluir Publicação (Admin)',
      `Deseja excluir a publicação "${targetItem.title || 'Pet'}" como Administrador?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await itemsService.deleteItem(targetItem.id, { actorId: currentUser?.id, actorIsAdmin: true });
              setUserItems(prev => prev.filter(i => i.id !== targetItem.id));
              Alert.alert('Sucesso', 'Publicação excluída com sucesso.');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a publicação.');
            }
          },
        },
      ]
    );
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
    if (!digits.startsWith('55')) digits = digits.slice(2);
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

  const formatReviewDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return '';
    }
  };

  const getStarLabel = (stars) => {
    switch (stars) {
      case 5: return 'Excelente experiência! ⭐⭐⭐⭐⭐';
      case 4: return 'Muito boa experiência! ⭐⭐⭐⭐';
      case 3: return 'Experiência regular ⭐⭐⭐';
      case 2: return 'Experiência abaixo do esperado ⭐⭐';
      case 1: return 'Experiência ruim ⭐';
      default: return 'Selecione uma nota';
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
    if (activePostTab === 'all') return true;
    if (activePostTab === 'lost') return item.status === 'lost' && !item.resolved;
    if (activePostTab === 'found') return item.status === 'found' && !item.resolved;
    if (activePostTab === 'adoption') return (item.extra_fields?.is_direct_adoption || itemsService.isPetAvailableForAdoption(item)) && !item.resolved;
    if (activePostTab === 'resolved') return item.resolved || item.status === 'resolved';
    return true;
  });

  const existingMyRating = ratingsData.ratings.find(r => r.reviewerId === currentUser?.id);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO HEADER CARD */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <View style={[styles.heroCover, { backgroundColor: isDark ? '#11221C' : COLORS.primaryLight }]}>
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

          {/* Badge de Nível de Guardião Comunitário WeFIND */}
          {gamificationData?.rank && (
            <View
              style={[
                styles.guardianBadge,
                {
                  backgroundColor: isDark ? 'rgba(46, 86, 52, 0.3)' : (gamificationData.rank.currentRank.badgeBg || '#DCFCE7'),
                  borderColor: gamificationData.rank.currentRank.color || '#166534',
                },
              ]}
            >
              <MaterialIcons
                name={gamificationData.rank.currentRank.icon || 'shield'}
                size={15}
                color={gamificationData.rank.currentRank.color || '#166534'}
              />
              <Text
                style={[
                  styles.guardianBadgeText,
                  { color: gamificationData.rank.currentRank.color || '#166534' },
                ]}
              >
                {gamificationData.rank.title} • {gamificationData.xp} XP
              </Text>
            </View>
          )}

          {/* Badge de Reputação / Estrelas */}
          <TouchableOpacity
            onPress={() => setActiveMainSection('ratings')}
            style={[styles.reputationBadge, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: '#F59E0B' }]}
            activeOpacity={0.8}
          >
            <MaterialIcons name="star" size={16} color="#F59E0B" />
            <Text style={[styles.reputationScore, { color: isDark ? '#FBBF24' : '#B45309' }]}>
              {ratingsData.average.toFixed(1)}
            </Text>
            <Text style={[styles.reputationCount, { color: isDark ? '#FDE68A' : '#92400E' }]}>
              ({ratingsData.total} {ratingsData.total === 1 ? 'avaliação' : 'avaliações'})
            </Text>
          </TouchableOpacity>

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

          {/* Bio / Apresentação */}
          {profile?.bio ? (
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>
              "{profile.bio}"
            </Text>
          ) : null}

          {/* Ações Rápidas (Chat, WhatsApp, Avaliar, Compartilhar) */}
          <View style={styles.actionButtonsRow}>
            {!isOwnProfile && (
              <TouchableOpacity
                onPress={handleOpenChat}
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <MaterialIcons name="chat-bubble-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>Mensagem</Text>
              </TouchableOpacity>
            )}

            {!isOwnProfile && (
              <TouchableOpacity
                onPress={handleOpenRatingModal}
                style={[styles.rateActionBtn, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: '#F59E0B' }]}
                activeOpacity={0.85}
              >
                <MaterialIcons name={existingMyRating ? 'edit' : 'star'} size={17} color="#D97706" style={{ marginRight: 5 }} />
                <Text style={[styles.rateActionBtnText, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                  {existingMyRating ? 'Editar Nota' : 'Classificar'}
                </Text>
              </TouchableOpacity>
            )}

            {phoneNumber && !isOwnProfile && (
              <TouchableOpacity
                onPress={handleOpenWhatsApp}
                style={[styles.whatsappActionBtn, { backgroundColor: '#25D366' }]}
                activeOpacity={0.85}
              >
                <Feather name="phone-call" size={16} color="#FFFFFF" />
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

          {/* INSÍGNIA DE LAR TEMPORÁRIO SOLIDÁRIO */}
          {fosterProfile?.isActive && (
            <View style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: isDark ? 'rgba(22, 163, 74, 0.12)' : '#F0FDF4',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(22, 163, 74, 0.3)' : '#BBF7D0',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="home-work" size={15} color="#16A34A" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803D' }}>
                  Voluntário de Lar Temporário
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#166534', lineHeight: 16 }}>
                Disponível para acolher: {fosterProfile.species?.map(s => s === 'dogs' ? '🐶 Cães' : (s === 'cats' ? '🐱 Gatos' : (s === 'birds' ? '🦜 Aves' : '🐾 Outros'))).join(', ') || 'Pets'}.
                {fosterProfile.neighborhood ? ` • ${fosterProfile.neighborhood}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Grid de Estatísticas de Impacto */}
        <View style={[styles.statsGrid, { borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <TouchableOpacity onPress={() => { setActiveMainSection('posts'); setActivePostTab('all'); }} style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{userItems.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Publicações</Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity onPress={() => { setActiveMainSection('posts'); setActivePostTab('resolved'); }} style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#2E5634' }]}>{resolvedPosts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Reencontros</Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity onPress={() => setActiveMainSection('ratings')} style={styles.statBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="star" size={16} color="#F59E0B" style={{ marginRight: 2 }} />
              <Text style={[styles.statNumber, { color: '#D97706' }]}>{ratingsData.average.toFixed(1)}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Reputação</Text>
          </TouchableOpacity>
        </View>

        {/* PAINEL DE MODERAÇÃO DE MEMBRO (SUPER ADMIN) */}
        {isAdmin && !isOwnProfile && (
          <View style={{ marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7', borderWidth: 1, borderColor: isDark ? '#D97706' : '#FDE68A' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="admin-panel-settings" size={18} color="#D97706" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#FCD34D' : '#92400E' }}>
                  Moderação Super Admin
                </Text>
              </View>
              <View style={{ backgroundColor: profile?.role === 'admin' || profile?.adm ? '#2E5634' : '#64748B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>
                  {profile?.role === 'admin' || profile?.adm ? 'ADMIN' : 'USUÁRIO'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleToggleAdminRole}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#1E293B' : '#FFFFFF', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="shield" size={15} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                  {profile?.role === 'admin' || profile?.adm ? 'Revogar Admin' : 'Tornar Admin'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteUserAccount}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="delete-forever" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>
                  Excluir Conta
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 2. CHIP TOGGLE PRINCIPAL: PUBLICAÇÕES VS AVALIAÇÕES */}
      <View style={styles.mainToggleContainer}>
        <TouchableOpacity
          onPress={() => setActiveMainSection('posts')}
          style={[
            styles.mainToggleBtn,
            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder },
            activeMainSection === 'posts' && [styles.mainToggleBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
          ]}
          activeOpacity={0.85}
        >
          <MaterialIcons name="pets" size={17} color={activeMainSection === 'posts' ? '#FFFFFF' : colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.mainToggleText, { color: activeMainSection === 'posts' ? '#FFFFFF' : colors.textSecondary }]}>
            Publicações ({userItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveMainSection('ratings')}
          style={[
            styles.mainToggleBtn,
            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder },
            activeMainSection === 'ratings' && [styles.mainToggleBtnActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
          ]}
          activeOpacity={0.85}
        >
          <MaterialIcons name="star" size={17} color={activeMainSection === 'ratings' ? '#FFFFFF' : '#F59E0B'} style={{ marginRight: 6 }} />
          <Text style={[styles.mainToggleText, { color: activeMainSection === 'ratings' ? '#FFFFFF' : colors.textSecondary }]}>
            Classificações ({ratingsData.total})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. CONTEÚDO: SEÇÃO DE PUBLICAÇÕES */}
      {activeMainSection === 'posts' && (
        <View style={styles.postsSection}>
          {/* Filtros em Abas de Pets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {[
              { key: 'all', label: `Todos (${userItems.length})` },
              { key: 'lost', label: `Perdidos (${lostPosts.length})` },
              { key: 'found', label: `Encontrados (${foundPosts.length})` },
              { key: 'adoption', label: `Adoção (${adoptionPosts.length})` },
              { key: 'resolved', label: `Reencontrados (${resolvedPosts.length})` },
            ].map((tab) => {
              const isSelected = activePostTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActivePostTab(tab.key)}
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

              const statusBg = isResolved
                ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5')
                : isAdoption
                ? (isDark ? 'rgba(219, 39, 119, 0.2)' : '#FDF2F8')
                : isFound
                ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5')
                : (isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2');

              const statusTextColor = isResolved
                ? '#2E5634'
                : isAdoption
                ? '#DB2777'
                : isFound
                ? '#2E5634'
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
                    <View style={[styles.petImageContainer, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                      {photoUrl ? (
                        <OptimizedImage uri={photoUrl} style={styles.petImage} resizeMode="cover" />
                      ) : (
                        <MaterialIcons name="pets" size={30} color={colors.textMuted} />
                      )}
                    </View>

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
      )}

      {/* 4. CONTEÚDO: SEÇÃO DE CLASSIFICAÇÕES & AVALIAÇÕES */}
      {activeMainSection === 'ratings' && (
        <View style={styles.ratingsSection}>
          {/* Card Resumo de Avaliações */}
          <View style={[styles.ratingSummaryCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={styles.ratingSummaryLeft}>
              <Text style={[styles.ratingBigScore, { color: colors.text }]}>{ratingsData.average.toFixed(1)}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcons
                    key={star}
                    name={star <= Math.round(ratingsData.average) ? 'star' : 'star-border'}
                    size={20}
                    color="#F59E0B"
                  />
                ))}
              </View>
              <Text style={[styles.ratingTotalText, { color: colors.textMuted }]}>
                {ratingsData.total} {ratingsData.total === 1 ? 'classificação' : 'classificações'}
              </Text>
            </View>

            <View style={styles.ratingBreakdownContainer}>
              {[5, 4, 3, 2, 1].map((s) => {
                const count = ratingsData.breakdown[s] || 0;
                const percentage = ratingsData.total > 0 ? (count / ratingsData.total) * 100 : 0;
                return (
                  <View key={s} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownStarLabel, { color: colors.textSecondary }]}>{s}★</Text>
                    <View style={[styles.breakdownBarTrack, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                      <View style={[styles.breakdownBarFill, { width: `${percentage}%`, backgroundColor: '#F59E0B' }]} />
                    </View>
                    <Text style={[styles.breakdownCountText, { color: colors.textMuted }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Botão de Avaliar */}
          {!isOwnProfile && (
            <TouchableOpacity
              onPress={handleOpenRatingModal}
              style={[styles.leaveReviewCTA, { backgroundColor: colors.primary }]}
              activeOpacity={0.88}
            >
              <MaterialIcons name="rate-review" size={19} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.leaveReviewCTAText}>
                {existingMyRating ? 'Editar Minha Classificação' : 'Classificar Experiência com este Membro'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Lista de Depoimentos de Avaliação */}
          {ratingsData.ratings.length === 0 ? (
            <View style={[styles.emptyPostsCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <MaterialIcons name="stars" size={42} color="#F59E0B" style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyPostsTitle, { color: colors.text }]}>Ainda sem avaliações</Text>
              <Text style={[styles.emptyPostsSubtitle, { color: colors.textSecondary }]}>
                Seja o primeiro a avaliar e compartilhar sua experiência de contato ou reencontro com {displayName.split(' ')[0]}!
              </Text>
            </View>
          ) : (
            ratingsData.ratings.map((rating) => (
              <View key={rating.id} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                {/* Topo do Review: Avatar, Nome, Estrelas e Data */}
                <View style={styles.reviewHeader}>
                  <View style={[styles.reviewerAvatar, { backgroundColor: colors.primaryLight }]}>
                    {rating.reviewerAvatar ? (
                      <Image source={{ uri: rating.reviewerAvatar }} style={styles.reviewerAvatarImg} />
                    ) : (
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>
                        {rating.reviewerName.trim()[0]?.toUpperCase() || 'U'}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.reviewerName, { color: colors.text }]} numberOfLines={1}>
                      {rating.reviewerName}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={{ flexDirection: 'row' }}>
                        {[1, 2, 3, 4, 5].map((st) => (
                          <MaterialIcons
                            key={st}
                            name={st <= rating.stars ? 'star' : 'star-border'}
                            size={14}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                      <Text style={[styles.reviewDate, { color: colors.textMuted }]}>
                        {formatReviewDate(rating.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {(isAdmin || (currentUser && rating.reviewerId === currentUser.id)) && (
                    <TouchableOpacity
                      onPress={() => handleDeleteReview(rating)}
                      style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 8, marginLeft: 6 }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Tags Elogios */}
                {Array.isArray(rating.tags) && rating.tags.length > 0 ? (
                  <View style={styles.reviewTagsRow}>
                    {rating.tags.map((t, idx) => (
                      <View key={idx} style={[styles.reviewTagBadge, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: '#FDE68A' }]}>
                        <Text style={[styles.reviewTagText, { color: isDark ? '#FBBF24' : '#92400E' }]}>{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Comentário */}
                {rating.comment ? (
                  <Text style={[styles.reviewCommentText, { color: isDark ? '#E2E8F0' : '#334155' }]}>
                    "{rating.comment}"
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      )}

      {/* MODAL INTERATIVO PARA CLASSIFICAR / AVALIAR */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            {/* Header do Modal */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="star-half" size={22} color="#F59E0B" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Classificar Experiência</Text>
              </View>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.7 }}>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Como foi seu contato, negociação ou experiência de reencontro com <Text style={{ fontWeight: '700', color: colors.text }}>{displayName}</Text>?
              </Text>

              {/* Seletor de Estrelas */}
              <View style={styles.starsPickerContainer}>
                <View style={styles.starsPickerRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setSelectedStars(star)}
                      activeOpacity={0.7}
                      style={{ padding: 6 }}
                    >
                      <MaterialIcons
                        name={star <= selectedStars ? 'star' : 'star-border'}
                        size={40}
                        color="#F59E0B"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.starFeedbackText, { color: '#D97706' }]}>
                  {getStarLabel(selectedStars)}
                </Text>
              </View>

              {/* Elogios e Destaques */}
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Destaques da sua experiência (opcional):
              </Text>
              <View style={styles.tagsContainer}>
                {ratingsService.POPULAR_RATING_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => handleToggleTag(tag)}
                      style={[
                        styles.tagChip,
                        { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' },
                        isSelected && [styles.tagChipSelected, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7', borderColor: '#F59E0B' }],
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.tagChipText,
                        { color: isDark ? '#94A3B8' : '#475569' },
                        isSelected && { color: isDark ? '#FBBF24' : '#B45309', fontWeight: '800' },
                      ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Comentário / Relato */}
              <Text style={[styles.formLabel, { color: colors.text }]}>
                Deixe um comentário ou depoimento (opcional):
              </Text>
              <TextInput
                style={[
                  styles.commentInput,
                  {
                    backgroundColor: isDark ? colors.card : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Conte com mais detalhes como foi o atendimento, cuidado com o pet ou comunicação..."
                placeholderTextColor={colors.textMuted}
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
                numberOfLines={4}
                maxLength={400}
              />

              {/* Botões de Ação */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  onPress={() => setRatingModalVisible(false)}
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  disabled={submittingRating}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmitRating}
                  style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
                  disabled={submittingRating}
                  activeOpacity={0.85}
                >
                  {submittingRating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Salvar Avaliação</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  reputationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 8,
    gap: 4,
  },
  reputationScore: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  reputationCount: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  metaRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
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
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    flex: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  rateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  rateActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  whatsappActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 17,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  mainToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 14,
    gap: 10,
  },
  mainToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  mainToggleBtnActive: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  mainToggleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  postsSection: {
    paddingHorizontal: 14,
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
    padding: 26,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyPostsTitle: {
    fontSize: 15,
    fontWeight: '800',
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
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  petImage: {
    width: 86,
    height: 86,
  },
  petInfo: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  petNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  petName: {
    fontSize: 14.5,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  petTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  petTagText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  petMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  petMetaText: {
    fontSize: 11.5,
    flex: 1,
  },
  petLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  petLocationText: {
    fontSize: 11,
    flex: 1,
  },
  reviewsSection: {
    paddingHorizontal: 14,
  },
  reviewsHeader: {
    marginBottom: 12,
  },
  ratingOverviewCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  ratingBigBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
  },
  ratingBigNumber: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  ratingTotalCount: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  ratingBarsCol: {
    flex: 1,
    paddingLeft: 14,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barStarLabel: {
    fontSize: 11,
    fontWeight: '700',
    width: 20,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barCount: {
    fontSize: 10.5,
    fontWeight: '600',
    width: 22,
    textAlign: 'right',
  },
  leaveReviewCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  leaveReviewCTAText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  reviewAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAuthorInitial: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  reviewAuthorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  reviewAuthorName: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  reviewDate: {
    fontSize: 11,
    marginTop: 1,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewCommentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  reviewPetContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 4,
  },
  reviewPetContextText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  modalRatingPrompt: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  starTouchable: {
    padding: 4,
  },
  modalInputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalTextInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 13.5,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  guardianBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    gap: 5,
  },
  guardianBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
});

export default UserProfileScreen;
