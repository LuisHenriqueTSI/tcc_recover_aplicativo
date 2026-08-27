import React, { useCallback, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  View,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getStatistics } from '../services/statistics';
import { listPendingReports, resolveReport } from '../services/reports';
import * as itemsService from '../services/items';
import * as userService from '../services/user';
import * as storiesService from '../services/stories';

const AdminScreen = ({ navigation }) => {
  const { user, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'items' | 'users' | 'stories'
  const [statistics, setStatistics] = useState(null);
  const [reports, setReports] = useState([]);
  const [stories, setStories] = useState([]);
  const [items, setItems] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Search terms
  const [itemSearch, setItemSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const loadAdminData = async (isRefresh = false) => {
    if (!isAdmin) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [stats, pendingReports, successStories, allItems, allUsers] = await Promise.all([
        getStatistics(),
        listPendingReports(),
        storiesService.listSuccessStories(),
        itemsService.getItems({ limit: 100 }),
        userService.listAllProfiles('', 100),
      ]);
      setStatistics(stats || {});
      setReports(pendingReports || []);
      setStories(successStories || []);
      setItems(allItems || []);
      setUsersList(allUsers || []);
    } catch (error) {
      Alert.alert('Erro', error.message || 'Não foi possível carregar o painel administrativo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, [isAdmin])
  );

  const handleReviewReport = (report, removePublication) => {
    const actionLabel = removePublication ? 'Excluir publicação' : 'Manter publicação';
    Alert.alert(
      actionLabel,
      removePublication
        ? 'A publicação será excluída permanentemente do banco de dados.'
        : 'A denúncia será encerrada e a publicação permanecerá visível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setProcessingId(report.id);
            try {
              await resolveReport(
                report.id,
                user.id,
                removePublication ? 'publication_removed' : 'publication_kept'
              );
              if (removePublication) {
                await itemsService.deleteItem(report.item_id, { actorId: user.id, actorIsAdmin: true });
                setItems((curr) => curr.filter((i) => i.id !== report.item_id));
              }
              setReports((current) => current.filter((item) => item.id !== report.id));
              Alert.alert('Sucesso', removePublication ? 'Publicação excluída.' : 'Denúncia finalizada.');
            } catch (error) {
              Alert.alert('Erro', error.message || 'Não foi possível atualizar a denúncia.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteStory = (story) => {
    Alert.alert(
      'Excluir História (Admin)',
      `Tem certeza de que deseja excluir permanentemente a história de "${story.petName}" enviada por "${story.author}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await storiesService.deleteSuccessStory(story.id);
              Alert.alert('Sucesso', 'História de reencontro excluída.');
              setStories((current) => current.filter((s) => s.id !== story.id));
            } catch (error) {
              Alert.alert('Erro', error.message || 'Não foi possível excluir a história.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteItemAdmin = (targetItem) => {
    Alert.alert(
      'Excluir Publicação (Super Admin)',
      `Deseja excluir a publicação "${targetItem.title || 'Pet'}" (ID: ${targetItem.id}) permanentemente do banco de dados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir do Banco',
          style: 'destructive',
          onPress: async () => {
            try {
              await itemsService.deleteItem(targetItem.id, { actorId: user.id, actorIsAdmin: true });
              setItems((prev) => prev.filter((i) => i.id !== targetItem.id));
              Alert.alert('Sucesso', 'Publicação excluída permanentemente com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a publicação: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleToggleUserAdmin = (targetUser) => {
    const isTargetAdmin = targetUser.adm === true || targetUser.adm === 'true' || targetUser.role === 'admin';
    const newRole = isTargetAdmin ? 'user' : 'admin';

    Alert.alert(
      isTargetAdmin ? 'Remover Cargo Admin' : 'Promover para Admin',
      `Deseja ${isTargetAdmin ? 'remover privilégios de administrador de' : 'conceder privilégios de super admin para'} "${targetUser.name || targetUser.email}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await userService.updateUserRole(targetUser.id, newRole);
              setUsersList((prev) =>
                prev.map((u) =>
                  u.id === targetUser.id
                    ? { ...u, role: newRole, adm: !isTargetAdmin }
                    : u
                )
              );
              Alert.alert('Sucesso', `Cargo atualizado para "${newRole}" com sucesso!`);
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível alterar o cargo: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteUserAdmin = (targetUser) => {
    Alert.alert(
      'Excluir Usuário (Super Admin)',
      `ATENÇÃO: Deseja excluir a conta de "${targetUser.name || targetUser.email}" e todas as suas publicações, fotos e comentários permanentemente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Usuário',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.deleteUserProfile(targetUser.id);
              setUsersList((prev) => prev.filter((u) => u.id !== targetUser.id));
              Alert.alert('Sucesso', 'Conta e dados do usuário foram excluídos.');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o usuário: ' + error.message);
            }
          },
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <MaterialIcons name="lock-outline" size={48} color="#EF4444" />
        <Text style={[styles.deniedTitle, { color: colors.text }]}>Acesso Restrito</Text>
        <Text style={[styles.deniedText, { color: colors.textSecondary }]}>
          Esta área é exclusiva para Super Administradores do WeFIND.
        </Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 10 }}>Carregando Painel Admin...</Text>
      </View>
    );
  }

  const metrics = [
    {
      label: 'Usuários',
      value: statistics?.total_users || usersList.length,
      icon: 'people-outline',
      color: '#2563EB',
      background: '#EFF6FF',
    },
    {
      label: 'Publicações',
      value: statistics?.total_items || items.length,
      icon: 'pets',
      color: '#059669',
      background: '#ECFDF5',
    },
    {
      label: 'Histórias',
      value: stories.length,
      icon: 'auto-stories',
      color: '#D97706',
      background: '#FFFBEB',
    },
    {
      label: 'Denúncias',
      value: reports.length,
      icon: 'flag',
      color: '#DC2626',
      background: '#FEF2F2',
    },
  ];

  const filteredItems = items.filter((i) => {
    if (!itemSearch.trim()) return true;
    const term = itemSearch.toLowerCase().trim();
    return (
      (i.title || '').toLowerCase().includes(term) ||
      (i.species || '').toLowerCase().includes(term) ||
      (i.city || '').toLowerCase().includes(term) ||
      (i.status || '').toLowerCase().includes(term)
    );
  });

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch.trim()) return true;
    const term = userSearch.toLowerCase().trim();
    return (
      (u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.city || '').toLowerCase().includes(term)
    );
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAdminData(true)}
          colors={[colors.primary]}
        />
      }
    >
      {/* HEADER SUPER ADMIN */}
      <View style={[styles.headingRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <MaterialIcons name="shield" size={20} color="#D97706" />
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#D97706', letterSpacing: 0.8 }}>
              ACESSO SUPER ADMINISTRADOR
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Controle Geral do Sistema</Text>
          <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 2 }}>
            Gerenciamento direto de banco de dados, usuários, publicações e moderação.
          </Text>
        </View>
      </View>

      {/* METRICAS CARDS */}
      <View style={styles.metricsGrid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={[styles.metricIcon, { backgroundColor: metric.background }]}>
              <MaterialIcons name={metric.icon} size={20} color={metric.color} />
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>{metric.value}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {/* ABAS DE NAVEGAÇÃO ADMIN */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('overview')}
          style={[
            styles.tabButton,
            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder },
            activeTab === 'overview' && [styles.tabButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabButtonText, { color: activeTab === 'overview' ? '#FFFFFF' : colors.textSecondary }]}>
            Denúncias ({reports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('items')}
          style={[
            styles.tabButton,
            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder },
            activeTab === 'items' && [styles.tabButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabButtonText, { color: activeTab === 'items' ? '#FFFFFF' : colors.textSecondary }]}>
            Publicações ({items.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('users')}
          style={[
            styles.tabButton,
            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder },
            activeTab === 'users' && [styles.tabButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabButtonText, { color: activeTab === 'users' ? '#FFFFFF' : colors.textSecondary }]}>
            Usuários ({usersList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('stories')}
          style={[
            styles.tabButton,
            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder },
            activeTab === 'stories' && [styles.tabButtonActive, { backgroundColor: colors.primary, borderColor: colors.primary }],
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabButtonText, { color: activeTab === 'stories' ? '#FFFFFF' : colors.textSecondary }]}>
            Mural ({stories.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTEÚDO DA ABA 1: DENÚNCIAS */}
      {activeTab === 'overview' && (
        <View>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Denúncias Pendentes</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Publicações sinalizadas pela comunidade</Text>
            </View>
          </View>

          {reports.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Feather name="check-circle" size={32} color="#059669" style={{ marginBottom: 6 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Tudo em dia!</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nenhuma denúncia pendente para análise no momento.</Text>
            </View>
          ) : (
            reports.map((report) => (
              <View key={report.id} style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={styles.reportTopRow}>
                  <View style={styles.reportIcon}>
                    <MaterialIcons name="flag" size={19} color="#DC2626" />
                  </View>
                  <View style={styles.reportMain}>
                    <Text style={[styles.reportTitle, { color: colors.text }]}>
                      {report.items?.title || 'Publicação sem título'}
                    </Text>
                    <Text style={[styles.reportMeta, { color: colors.textMuted }]}>
                      Denunciado por {report.reporter?.name || report.reporter?.email || 'Usuário'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.reasonBox, { backgroundColor: isDark ? '#1E293B' : '#FEF2F2', borderColor: '#FECACA' }]}>
                  <Text style={[styles.reasonLabel, { color: '#DC2626' }]}>Motivo da Denúncia:</Text>
                  <Text style={[styles.reasonText, { color: colors.text }]}>{report.reason}</Text>
                  {report.details ? <Text style={[styles.details, { color: colors.textSecondary }]}>{report.details}</Text> : null}
                </View>

                <View style={styles.reviewActions}>
                  <TouchableOpacity
                    style={[styles.actionOutlineBtn, { borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('ItemDetail', { itemId: report.item_id })}
                  >
                    <MaterialIcons name="visibility" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.primary }}>Ver Item</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.keepButton, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                    onPress={() => handleReviewReport(report, false)}
                    disabled={processingId === report.id}
                  >
                    <Feather name="check" size={15} color="#059669" />
                    <Text style={[styles.keepText, { color: '#047857' }]}>Manter</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.removeButton, { backgroundColor: '#DC2626' }]}
                    onPress={() => handleReviewReport(report, true)}
                    disabled={processingId === report.id}
                  >
                    <Feather name="trash-2" size={15} color="#fff" />
                    <Text style={styles.removeText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* CONTEÚDO DA ABA 2: TODAS AS PUBLICAÇÕES */}
      {activeTab === 'items' && (
        <View>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <MaterialIcons name="search" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Buscar publicação por título, espécie, cidade..."
              placeholderTextColor={colors.textMuted}
              value={itemSearch}
              onChangeText={setItemSearch}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {itemSearch.length > 0 && (
              <TouchableOpacity onPress={() => setItemSearch('')}>
                <MaterialIcons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {filteredItems.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <MaterialIcons name="pets" size={36} color={colors.textMuted} style={{ marginBottom: 6 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma publicação encontrada</Text>
            </View>
          ) : (
            filteredItems.map((item) => (
              <View key={String(item.id)} style={[styles.adminItemCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.adminItemTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title || 'Pet sem nome'}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.textMuted }}>
                      {item.species || 'Espécie'} • {item.city || 'Local não informado'} • ID: {String(item.id).slice(0, 8)}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'lost' ? '#FEF2F2' : (item.status === 'found' ? '#ECFDF5' : '#F1F5F9') }]}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: item.status === 'lost' ? '#DC2626' : (item.status === 'found' ? '#059669' : '#64748B') }}>
                      {item.status?.toUpperCase() || 'PUBLICADO'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.itemActionBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
                  >
                    <MaterialIcons name="visibility" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.itemActionBtnText, { color: colors.primary }]}>Ver</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.itemActionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder }]}
                    onPress={() => navigation.navigate('RegisterItem', { editItem: item, modo: 'editar', adminOverride: true })}
                  >
                    <MaterialIcons name="edit" size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.itemActionBtnText, { color: colors.textSecondary }]}>Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.itemActionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                    onPress={() => handleDeleteItemAdmin(item)}
                  >
                    <MaterialIcons name="delete-outline" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={[styles.itemActionBtnText, { color: '#DC2626' }]}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* CONTEÚDO DA ABA 3: TODOS OS USUÁRIOS */}
      {activeTab === 'users' && (
        <View>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <MaterialIcons name="search" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Buscar usuário por nome, email, cidade..."
              placeholderTextColor={colors.textMuted}
              value={userSearch}
              onChangeText={setUserSearch}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {userSearch.length > 0 && (
              <TouchableOpacity onPress={() => setUserSearch('')}>
                <MaterialIcons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {filteredUsers.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <MaterialIcons name="people-outline" size={36} color={colors.textMuted} style={{ marginBottom: 6 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum usuário encontrado</Text>
            </View>
          ) : (
            filteredUsers.map((u) => {
              const isTargetAdmin = u.adm === true || u.adm === 'true' || u.role === 'admin';
              return (
                <View key={String(u.id)} style={[styles.adminUserCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={[styles.userAvatarBox, { backgroundColor: colors.primaryLight }]}>
                      {u.avatar_url ? (
                        <Image source={{ uri: u.avatar_url }} style={styles.userAvatarImg} />
                      ) : (
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>
                          {(u.name || 'U').trim()[0]?.toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.adminUserName, { color: colors.text }]} numberOfLines={1}>
                          {u.name || 'Sem nome'}
                        </Text>
                        {isTargetAdmin && (
                          <View style={{ backgroundColor: '#D97706', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' }}>ADMIN</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
                        {u.email || 'Email não informado'} • {u.city || 'Brasil'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={[styles.userActionBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => navigation.navigate('UserProfile', { userId: u.id, userName: u.name, avatarUrl: u.avatar_url })}
                    >
                      <MaterialIcons name="person" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.userActionBtnText, { color: colors.primary }]}>Ver Perfil</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.userActionBtn, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: '#FDE68A' }]}
                      onPress={() => handleToggleUserAdmin(u)}
                    >
                      <MaterialIcons name="shield" size={14} color="#D97706" style={{ marginRight: 4 }} />
                      <Text style={[styles.userActionBtnText, { color: '#B45309' }]}>
                        {isTargetAdmin ? 'Revogar ADM' : 'Tornar ADM'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.userActionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                      onPress={() => handleDeleteUserAdmin(u)}
                    >
                      <MaterialIcons name="delete-forever" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={[styles.userActionBtnText, { color: '#DC2626' }]}>Banir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* CONTEÚDO DA ABA 4: MURAL DE REENCONTROS */}
      {activeTab === 'stories' && (
        <View>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Histórias do Mural ({stories.length})</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Depoimentos de reencontros cadastrados</Text>
            </View>
          </View>

          {stories.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <MaterialIcons name="auto-stories" size={36} color={colors.textMuted} style={{ marginBottom: 6 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma história no mural</Text>
            </View>
          ) : (
            stories.map((story) => (
              <View key={String(story.id)} style={[styles.storyAdminCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[styles.storyIconBox, { backgroundColor: '#DCFCE7' }]}>
                    <MaterialIcons name="pets" size={18} color="#15803D" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.storyPetTitle, { color: colors.text }]}>{story.petName}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.textMuted }}>Por {story.author} • {story.location}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteStory(story)}
                    style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 8 }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
                {story.testimonial ? (
                  <Text style={[styles.storyTestimonial, { color: colors.textSecondary }]} numberOfLines={3}>
                    "{story.testimonial}"
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  deniedTitle: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  deniedText: { fontSize: 14, textAlign: 'center', marginTop: 6 },
  headingRow: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  metricCard: { flex: 1, minWidth: '47%', padding: 12, borderRadius: 16, borderWidth: 1 },
  metricIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricValue: { fontSize: 22, fontWeight: '900' },
  metricLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  tabContainer: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  tabButtonActive: {},
  tabButtonText: { fontSize: 11.5, fontWeight: '800' },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 44, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13.5 },
  emptyCard: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  emptyText: { fontSize: 12, textAlign: 'center' },
  reportCard: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  reportTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reportIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  reportMain: { flex: 1 },
  reportTitle: { fontSize: 14.5, fontWeight: '800' },
  reportMeta: { fontSize: 11.5, marginTop: 2 },
  reasonBox: { padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  reasonLabel: { fontSize: 11, fontWeight: '800', marginBottom: 2 },
  reasonText: { fontSize: 12.5, fontWeight: '700' },
  details: { fontSize: 11.5, marginTop: 4 },
  reviewActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  actionOutlineBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  keepButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  keepText: { fontSize: 12.5, fontWeight: '800', marginLeft: 4 },
  removeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  removeText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800', marginLeft: 4 },
  adminItemCard: { padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  adminItemTitle: { fontSize: 14, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  itemActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  itemActionBtnText: { fontSize: 12, fontWeight: '800' },
  adminUserCard: { padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  userAvatarBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  userAvatarImg: { width: 36, height: 36 },
  adminUserName: { fontSize: 13.5, fontWeight: '800' },
  userActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  userActionBtnText: { fontSize: 11.5, fontWeight: '800' },
  storyAdminCard: { padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  storyIconBox: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  storyPetTitle: { fontSize: 14, fontWeight: '800' },
  storyTestimonial: { fontSize: 12, fontStyle: 'italic', marginTop: 4 },
});

export default AdminScreen;
