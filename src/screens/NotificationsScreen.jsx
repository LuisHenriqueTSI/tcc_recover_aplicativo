import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getConversations, markMessagesAsRead } from '../services/messages';
import { listItems, cleanupExpiredItems, renewItem } from '../services/items';
import {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  buildRenewalAlerts,
  createNotification,
} from '../services/notifications';
import { triggerLocalNotification } from '../services/pushNotifications';
import { WeFindText } from '../components/WeFindBrand';
import COLORS from '../constants/theme';

function getTikTokRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'agora';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  const diffDays = Math.floor(diffSec / 86400);
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem`;
  return `${Math.floor(diffDays / 30)} m`;
}

export default function NotificationsScreen({ navigation, onNotificationsUpdated }) {
  const { user, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();

  // Estados principais
  const [activeTab, setActiveTab] = useState('system'); // 'community' ou 'system'
  const [loading, setLoading] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'unread', 'alerts', 'sightings', 'renewals'

  const [messageNotifications, setMessageNotifications] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [renewingItemId, setRenewingItemId] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user]);

  async function loadAll() {
    setLoading(true);
    try {
      await cleanupExpiredItems();
      await fetchNotifications();
      if (typeof onNotificationsUpdated === 'function') {
        onNotificationsUpdated();
      }
    } catch (e) {
      console.warn('[NotificationsScreen] Erro ao carregar notificações:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotifications() {
    if (!user) return;
    const conversations = await getConversations(user.id);
    const unreadMsgs = conversations.filter((c) => c.unread);
    const systemAlertsData = await getUserNotifications(user.id);

    // 1. Mensagens da Comunidade
    const mappedMessageNotifications = unreadMsgs.map((msg) => ({
      id: `msg_${msg.itemId}_${msg.otherId}`,
      type: 'message',
      title: msg.otherName || 'Membro da Comunidade',
      prefix: '💬 Mensagem sobre o pet:',
      message: `${msg.otherName || 'Membro da Comunidade'} enviou uma nova mensagem sobre "${msg.itemTitle || 'Pet sem nome'}".`,
      time: getTikTokRelativeTime(msg.lastMessageAt),
      timestamp: new Date(msg.lastMessageAt || Date.now()).getTime(),
      read: false,
      otherId: msg.otherId,
      itemId: msg.itemId,
      icon: 'chat',
      isCritical: false,
    }));
    setMessageNotifications(mappedMessageNotifications);

    // 2. Alertas do Sistema
    let items = await listItems({ owner_id: user.id, resolved: false });
    items = (items || []).filter((item) => item && item.id);
    const renewalAlerts = buildRenewalAlerts(items);

    const mappedSystemAlerts = [...renewalAlerts, ...(systemAlertsData || [])]
      .filter((alert) => alert && (alert.type === 'renewal_reminder' || alert.type === 'item_removed' || alert.type === 'nearby_lost_pet' || alert.type === 'match' || alert.type === 'pet_match' || alert.type === 'sighting'))
      .map((alert) => {
        const isRenewal = alert.type === 'renewal_reminder';
        const isNearby = alert.type === 'nearby_lost_pet';
        const isMatch = alert.type === 'match' || alert.type === 'pet_match';
        const isSighting = alert.type === 'sighting';

        let iconName = 'notifications';
        let prefix = '📌 Aviso do Sistema:';
        if (isRenewal) {
          iconName = 'hourglass-bottom';
          prefix = '⏳ Lembrete de Renovação:';
        } else if (isNearby) {
          iconName = 'radar';
          prefix = '🚨 Alerta de Proximidade:';
        } else if (isMatch) {
          iconName = 'auto-awesome';
          prefix = '🎯 Match Inteligente:';
        } else if (isSighting) {
          iconName = 'visibility';
          prefix = '👁️ Novo Avistamento:';
        }

        return {
          ...alert,
          prefix,
          icon: iconName,
          time: getTikTokRelativeTime(alert.created_at),
          timestamp: new Date(alert.created_at || Date.now()).getTime(),
          isCritical: isNearby || isRenewal || isMatch || !alert.read,
        };
      });

    setSystemAlerts(mappedSystemAlerts);
  }

  // Contadores
  const unreadSystemCount = systemAlerts.filter((n) => !n.read).length;
  const unreadCommunityCount = messageNotifications.filter((n) => !n.read).length;

  // Filtragem da lista ativa
  const currentList = useMemo(() => {
    const rawList = activeTab === 'community' ? messageNotifications : systemAlerts;

    let filtered = rawList;
    if (selectedFilter === 'unread') {
      filtered = rawList.filter((n) => !n.read);
    } else if (selectedFilter === 'alerts') {
      filtered = rawList.filter((n) => n.type === 'nearby_lost_pet');
    } else if (selectedFilter === 'matches') {
      filtered = rawList.filter((n) => n.type === 'match' || n.type === 'pet_match');
    } else if (selectedFilter === 'sightings') {
      filtered = rawList.filter((n) => n.type === 'sighting');
    } else if (selectedFilter === 'renewals') {
      filtered = rawList.filter((n) => n.type === 'renewal_reminder');
    }

    return filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [activeTab, messageNotifications, systemAlerts, selectedFilter]);

  // Agrupamento por seção estilo TikTok (Importantes / Mais Antigas)
  const groupedSections = useMemo(() => {
    const important = [];
    const older = [];
    const oneDayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    currentList.forEach((item) => {
      const isRecent = now - (item.timestamp || now) < oneDayMs * 2;
      if (!item.read || isRecent) {
        important.push(item);
      } else {
        older.push(item);
      }
    });

    const result = [];
    if (important.length > 0) {
      result.push({ title: 'Notificações importantes', isLightning: true, data: important });
    }
    if (older.length > 0) {
      result.push({ title: 'Mais antigas', isLightning: false, data: older });
    }
    return result;
  }, [currentList]);

  // Ações de toque
  async function handleNotificationPress(notification) {
    if (notification.type === 'renewal_reminder' && notification.itemId) {
      try {
        setRenewingItemId(notification.itemId);
        await renewItem(notification.itemId);
        await markNotificationRead(String(notification.id).replace('system_', ''));
        await fetchNotifications();
        if (typeof onNotificationsUpdated === 'function') {
          onNotificationsUpdated();
        }
        Alert.alert('Publicação Renovada', 'Seu anúncio foi renovado com sucesso e continua ativo por mais 15 dias!');
      } catch (err) {
        Alert.alert('Erro', err?.message || 'Falha ao renovar publicação.');
      } finally {
        setRenewingItemId(null);
      }
      return;
    }

    if (notification.type === 'message') {
      if (notification.otherId) {
        await markMessagesAsRead(user.id, notification.otherId);
      }
      navigation.navigate('Chat', {
        conversation: {
          otherId: notification.otherId,
          itemId: notification.itemId,
          itemTitle: notification.itemTitle,
          otherName: notification.title,
        },
      });
      return;
    }

    const targetItemId = notification.item_id || notification.itemId;
    if (targetItemId) {
      const normalizedId = String(notification.id).replace('system_', '');
      if (/^\d+$/.test(normalizedId)) {
        await markNotificationRead(normalizedId);
      }
      navigation.navigate('ItemDetail', { itemId: targetItemId });
      return;
    }

    if (notification.id) {
      const normalizedId = String(notification.id).replace('system_', '');
      if (/^\d+$/.test(normalizedId)) {
        await markNotificationRead(normalizedId);
      }
      await fetchNotifications();
      if (typeof onNotificationsUpdated === 'function') {
        onNotificationsUpdated();
      }
    }
  }

  // Marcar todas como lidas ou limpar
  function handleClearAllOptions() {
    Alert.alert(
      'Gerenciar Notificações',
      'O que você deseja fazer com as notificações?',
      [
        {
          text: 'Marcar Todas como Lidas',
          onPress: async () => {
            try {
              if (user) {
                await markAllNotificationsRead(user.id);
                setSystemAlerts((prev) => prev.map((item) => ({ ...item, read: true })));
                if (typeof onNotificationsUpdated === 'function') {
                  onNotificationsUpdated();
                }
              }
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível marcar todas como lidas.');
            }
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  }

  // Disparar pacote de notificações fake para teste (Exclusivo Admin)
  async function handleTestNotification() {
    if (!isAdmin) {
      Alert.alert('Acesso Restrito', 'Esta funcionalidade de teste é exclusiva para a conta de Administrador.');
      return;
    }

    try {
      if (!user?.id) {
        Alert.alert('Atenção', 'Você precisa estar logado para gerar notificações.');
        return;
      }

      setLoading(true);

      const fakeNotifications = [
        {
          user_id: user.id,
          type: 'nearby_lost_pet',
          title: '🚨 Alerta WeFIND: Cão Perdido Próximo',
          message: '🐾 Cão Labrador dourado ("Thor") foi visto a 800m da sua localização atual. Toque para ver detalhes e fotos.',
          read: false,
        },
        {
          user_id: user.id,
          type: 'sighting',
          title: '👁️ Novo Avistamento Registrado',
          message: 'Um voluntário registrou um avistamento com foto recente perto da Praça Central.',
          read: false,
        },
        {
          user_id: user.id,
          type: 'renewal_reminder',
          title: '⏳ Lembrete de Renovação (15 Dias)',
          message: 'Sua publicação do pet "Mel" está próxima do período de renovação de 15 dias. Toque para mantê-la ativa.',
          read: false,
        },
        {
          user_id: user.id,
          type: 'match',
          title: '✨ Sugestão Inteligente WeFIND',
          message: 'Nossa IA identificou um pet cadastrado com 94% de similaridade com as fotos do seu anúncio.',
          read: false,
        },
      ];

      for (const fakeNotif of fakeNotifications) {
        await createNotification(fakeNotif);
      }

      await triggerLocalNotification({
        title: '🚨 Alerta WeFIND: Cão Perdido',
        body: '🐾 Cão ("Thor", Labrador) perdido no seu bairro. Toque para abrir detalhes e fotos.',
        data: { type: 'nearby_lost_pet' },
        delaySeconds: 0,
      });

      await fetchNotifications();
      if (typeof onNotificationsUpdated === 'function') {
        onNotificationsUpdated();
      }

      Alert.alert('🔔 Notificações Geradas!', 'Adicionamos 4 notificações de teste na sua caixa de entrada e disparamos um push de alerta!');
    } catch (e) {
      console.warn('Erro ao gerar notificações de teste:', e);
      Alert.alert('Aviso', 'Notificações de demonstração inseridas com sucesso.');
      await fetchNotifications();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0A120D' : '#FFFFFF' }]} edges={['top']}>
      {/* 1. HEADER ESTILO TIKTOK */}
      <View style={[styles.navHeader, { borderBottomColor: isDark ? '#1E3626' : '#F1F5F9' }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.navBackBtn}
          accessibilityLabel="Voltar"
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: colors.text }]}>Notificações</Text>

        <View style={styles.navActionsRight}>
          {isAdmin && (
            <TouchableOpacity
              onPress={handleTestNotification}
              style={[styles.adminTestBtn, { backgroundColor: isDark ? '#1E3626' : '#EAF2EB' }]}
              accessibilityLabel="Gerar Notificações de Teste (Admin)"
              activeOpacity={0.7}
            >
              <MaterialIcons name="bolt" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleClearAllOptions}
            style={styles.navActionBtn}
            accessibilityLabel="Opções de limpeza"
            activeOpacity={0.7}
          >
            <MaterialIcons name="done-all" size={23} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. ABAS SUPERIORES SEGMENTADAS (Comunidade | Sistema) */}
      <View style={[styles.tabBarContainer, { borderBottomColor: isDark ? '#1E3626' : '#F1F5F9' }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'community' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('community');
            setSelectedFilter('all');
          }}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'community' ? colors.text : colors.textMuted },
                activeTab === 'community' && styles.tabButtonTextActive,
              ]}
            >
              Comunidade
            </Text>
            {unreadCommunityCount > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.tabBadgeText}>{unreadCommunityCount}</Text>
              </View>
            )}
          </View>
          {activeTab === 'community' && <View style={[styles.tabActiveIndicator, { backgroundColor: colors.text }]} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'system' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('system');
            setSelectedFilter('all');
          }}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'system' ? colors.text : colors.textMuted },
                activeTab === 'system' && styles.tabButtonTextActive,
              ]}
            >
              Sistema {unreadSystemCount > 0 ? `(${unreadSystemCount})` : ''}
            </Text>
          </View>
          {activeTab === 'system' && <View style={[styles.tabActiveIndicator, { backgroundColor: colors.text }]} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* 3. BANNER INFORMATIVO RETRÁTIL */}
        {bannerVisible && (
          <View style={[styles.noticeBanner, { backgroundColor: isDark ? '#132218' : '#F8FAF8', borderColor: isDark ? '#1E3626' : '#E5EBE6' }]}>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Notificações e alertas ficam salvos por 30 dias
            </Text>
            <TouchableOpacity onPress={() => setBannerVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* 4. SELETOR DROPDOWN DE FILTRO DE NOTIFICAÇÕES */}
        <View style={styles.filterDropdownRow}>
          <TouchableOpacity
            style={styles.filterDropdownBtn}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterDropdownText, { color: colors.text }]}>
              {selectedFilter === 'all' && (activeTab === 'system' ? 'Todas as notificações do sistema' : 'Todas as mensagens da comunidade')}
              {selectedFilter === 'unread' && 'Apenas não lidas'}
              {selectedFilter === 'alerts' && 'Alertas de Proximidade'}
              {selectedFilter === 'sightings' && 'Avistamentos Registrados'}
              {selectedFilter === 'renewals' && 'Lembretes de Renovação'}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* 5. FEED DE NOTIFICAÇÕES EM ESTILO TIKTOK */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando notificações...</Text>
          </View>
        ) : groupedSections.length > 0 ? (
          groupedSections.map((section, sIdx) => (
            <View key={`sec_${sIdx}`} style={styles.sectionContainer}>
              {/* Título da Seção */}
              <View style={styles.sectionTitleRow}>
                {section.isLightning && (
                  <MaterialIcons name="bolt" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.sectionTitleText, { color: colors.text }]}>
                  {section.title}
                </Text>
              </View>

              {/* Lista de Itens da Seção */}
              {section.data.map((item) => {
                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[
                      styles.notificationItem,
                      { borderBottomColor: isDark ? '#1E3626' : '#F8FAFC' },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handleNotificationPress(item)}
                  >
                    {/* Ícone Circular Estilo TikTok */}
                    <View
                      style={[
                        styles.itemIconCircle,
                        {
                          backgroundColor: isDark ? '#132218' : '#FFFFFF',
                          borderColor: isDark ? '#1E3626' : '#E2E8F0',
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={item.icon || 'notifications'}
                        size={21}
                        color={item.type === 'nearby_lost_pet' ? '#EF4444' : COLORS.primary}
                      />
                    </View>

                    {/* Texto Principal com Prefixo em Negrito e Timestamp Relativo */}
                    <View style={styles.itemContentBox}>
                      <Text style={[styles.itemText, { color: colors.text }]}>
                        <Text style={styles.itemPrefix}>{item.prefix} </Text>
                        <Text style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>{item.message || item.title} </Text>
                        <Text style={[styles.itemTimeAgo, { color: colors.textMuted }]}>
                          {item.time}
                        </Text>
                      </Text>
                    </View>

                    {/* Ação Direita: Ponto Vermelho (Não lido) + Chevron Seta */}
                    <View style={styles.itemActionRight}>
                      {renewingItemId === item.itemId ? (
                        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
                      ) : !item.read ? (
                        <View style={styles.unreadRedDot} />
                      ) : null}
                      <MaterialIcons name="chevron-right" size={19} color={isDark ? '#475569' : '#94A3B8'} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#132218' : '#EAF2EB' }]}>
              <MaterialIcons name="notifications-none" size={42} color={COLORS.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Tudo limpo por aqui</Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary, marginBottom: 20 }]}>
              Você receberá avisos em tempo real sobre avistamentos, mensagens e lembretes de publicações.
            </Text>
            {isAdmin && (
              <TouchableOpacity
                onPress={handleTestNotification}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 3,
                  elevation: 3,
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="bolt" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                  Gerar Notificações de Teste (Admin)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL DE FILTRO (Estilo Bottom Sheet) */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#132218' : '#FFFFFF' }]}>
            <View style={styles.modalDragHandle} />
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Filtrar Notificações</Text>

            <TouchableOpacity
              style={[styles.modalOptionRow, selectedFilter === 'all' && styles.modalOptionActive]}
              onPress={() => {
                setSelectedFilter('all');
                setFilterModalVisible(false);
              }}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }, selectedFilter === 'all' && { color: COLORS.primary, fontWeight: '800' }]}>
                Todas as notificações
              </Text>
              {selectedFilter === 'all' && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOptionRow, selectedFilter === 'unread' && styles.modalOptionActive]}
              onPress={() => {
                setSelectedFilter('unread');
                setFilterModalVisible(false);
              }}
            >
              <Text style={[styles.modalOptionText, { color: colors.text }, selectedFilter === 'unread' && { color: COLORS.primary, fontWeight: '800' }]}>
                Apenas não lidas
              </Text>
              {selectedFilter === 'unread' && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
            </TouchableOpacity>

            {activeTab === 'system' && (
              <>
                <TouchableOpacity
                  style={[styles.modalOptionRow, selectedFilter === 'alerts' && styles.modalOptionActive]}
                  onPress={() => {
                    setSelectedFilter('alerts');
                    setFilterModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }, selectedFilter === 'alerts' && { color: COLORS.primary, fontWeight: '800' }]}>
                    🚨 Alertas de Proximidade
                  </Text>
                  {selectedFilter === 'alerts' && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalOptionRow, selectedFilter === 'matches' && styles.modalOptionActive]}
                  onPress={() => {
                    setSelectedFilter('matches');
                    setFilterModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }, selectedFilter === 'matches' && { color: COLORS.primary, fontWeight: '800' }]}>
                    🎯 Matches Inteligentes
                  </Text>
                  {selectedFilter === 'matches' && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalOptionRow, selectedFilter === 'sightings' && styles.modalOptionActive]}
                  onPress={() => {
                    setSelectedFilter('sightings');
                    setFilterModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }, selectedFilter === 'sightings' && { color: COLORS.primary, fontWeight: '800' }]}>
                    👁️ Avistamentos Registrados
                  </Text>
                  {selectedFilter === 'sightings' && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalOptionRow, selectedFilter === 'renewals' && styles.modalOptionActive]}
                  onPress={() => {
                    setSelectedFilter('renewals');
                    setFilterModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }, selectedFilter === 'renewals' && { color: COLORS.primary, fontWeight: '800' }]}>
                    ⏳ Lembretes de Renovação
                  </Text>
                  {selectedFilter === 'renewals' && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBackBtn: {
    padding: 4,
    marginLeft: -4,
  },
  navTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    textAlign: 'center',
    flex: 1,
    letterSpacing: -0.3,
  },
  navActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navActionBtn: {
    padding: 4,
  },
  adminTestBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    fontWeight: '800',
  },
  tabActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2.5,
    width: '60%',
    borderRadius: 2,
  },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  scrollBody: {
    paddingBottom: 40,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterDropdownRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterDropdownText: {
    fontSize: 15,
    fontWeight: '800',
    marginRight: 4,
    letterSpacing: -0.2,
  },
  sectionContainer: {
    marginTop: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  itemContentBox: {
    flex: 1,
    marginRight: 10,
  },
  itemText: {
    fontSize: 13.5,
    lineHeight: 18.5,
  },
  itemPrefix: {
    fontWeight: '800',
  },
  itemTimeAgo: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  unreadRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 56,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  modalOptionActive: {
    opacity: 1,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
