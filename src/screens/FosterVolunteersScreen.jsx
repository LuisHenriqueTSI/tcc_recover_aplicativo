import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  listFosterVolunteers,
  FOSTER_SPECIES_OPTIONS,
  FOSTER_HOUSING_OPTIONS,
} from '../services/foster';
import FosterVolunteerModal from '../components/FosterVolunteerModal';

const FosterVolunteersScreen = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();

  const initialCity = route.params?.city || userProfile?.city || '';
  const initialSpecies = route.params?.species || 'all';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [searchCity, setSearchCity] = useState(initialCity);
  const [selectedSpecies, setSelectedSpecies] = useState(initialSpecies);
  const [selectedHousing, setSelectedHousing] = useState('all');

  const [fosterModalVisible, setFosterModalVisible] = useState(false);

  const loadVolunteers = useCallback(async () => {
    try {
      const data = await listFosterVolunteers({
        city: searchCity,
        species: selectedSpecies,
        housing: selectedHousing,
      });
      setVolunteers(data || []);
    } catch (e) {
      console.log('[FosterVolunteersScreen] Erro ao carregar voluntários:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchCity, selectedSpecies, selectedHousing]);

  useEffect(() => {
    loadVolunteers();
  }, [loadVolunteers]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVolunteers();
  };

  const handleStartChat = (volunteer) => {
    if (!user) {
      Alert.alert(
        'Login necessário',
        'Faça login ou crie uma conta para conversar com voluntários de lar temporário.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Entrar', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (volunteer.userId === user.id) {
      Alert.alert('Aviso', 'Este é o seu próprio perfil de lar temporário.');
      return;
    }

    navigation.navigate('Chat', {
      otherUserId: volunteer.userId,
      otherUserName: volunteer.userName,
      otherAvatar: volunteer.avatarUrl,
      initialMessage: `Olá ${volunteer.userName}! Vi que você oferece lar temporário solidário no WeFIND e gostaria de verificar se tem disponibilidade para abrigar um pet.`,
    });
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Banner Informativo */}
      <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4', borderColor: isDark ? 'rgba(22, 163, 74, 0.3)' : '#BBF7D0' }]}>
        <View style={styles.infoBannerIcon}>
          <MaterialIcons name="security" size={20} color="#16A34A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoBannerTitle, { color: isDark ? '#4ADE80' : '#15803D' }]}>
            Rede Segura de Lares Temporários
          </Text>
          <Text style={[styles.infoBannerText, { color: isDark ? '#CBD5E1' : '#166534' }]}>
            Voluntários cadastrados prontos para oferecer abrigo e acolhimento provisório a animais em situação de resgate ou busca.
          </Text>
        </View>
      </View>

      {/* Botão de Candidatura Rápida para o Usuário */}
      <TouchableOpacity
        style={[styles.beVolunteerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => {
          if (!user) {
            Alert.alert('Login necessário', 'Entre na sua conta para configurar seu Lar Temporário.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Entrar', onPress: () => navigation.navigate('Login') },
            ]);
            return;
          }
          setFosterModalVisible(true);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.beVolunteerLeft}>
          <View style={[styles.beVolunteerIcon, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : colors.primaryLight }]}>
            <MaterialIcons name="home-work" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.beVolunteerTitle, { color: colors.text }]}>
              Você também pode acolher um pet?
            </Text>
            <Text style={[styles.beVolunteerSubtitle, { color: colors.textSecondary }]}>
              Ative seu perfil e ajude a salvar vidas na sua cidade
            </Text>
          </View>
        </View>
        <MaterialIcons name="arrow-forward-ios" size={15} color={colors.primary} />
      </TouchableOpacity>

      {/* Barra de Busca por Cidade */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <MaterialIcons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar por cidade ou bairro..."
          placeholderTextColor={colors.textMuted}
          value={searchCity}
          onChangeText={setSearchCity}
        />
        {searchCity ? (
          <TouchableOpacity onPress={() => setSearchCity('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filtros de Espécie em Chips */}
      <View style={styles.filtersScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            onPress={() => setSelectedSpecies('all')}
            style={[
              styles.filterChip,
              { borderColor: selectedSpecies === 'all' ? colors.primary : colors.border },
              selectedSpecies === 'all' && { backgroundColor: colors.primary },
            ]}
          >
            <Text style={[styles.filterChipText, selectedSpecies === 'all' && { color: '#FFFFFF', fontWeight: '800' }]}>
              🐾 Todas as Espécies
            </Text>
          </TouchableOpacity>

          {FOSTER_SPECIES_OPTIONS.map((sp) => {
            const isSelected = selectedSpecies === sp.id;
            return (
              <TouchableOpacity
                key={sp.id}
                onPress={() => setSelectedSpecies(isSelected ? 'all' : sp.id)}
                style={[
                  styles.filterChip,
                  { borderColor: isSelected ? colors.primary : colors.border },
                  isSelected && { backgroundColor: colors.primary },
                ]}
              >
                <Text style={[styles.filterChipText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>
                  {sp.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const renderVolunteerCard = ({ item }) => {
    const initial = (item.userName || 'V').trim()[0]?.toUpperCase() || 'V';
    const speciesNames = Array.isArray(item.species)
      ? item.species.map(s => s === 'dogs' ? '🐶 Cães' : (s === 'cats' ? '🐱 Gatos' : (s === 'birds' ? '🦜 Aves' : '🐾 Outros'))).join(' • ')
      : 'Cães e Gatos';

    const housingObj = FOSTER_HOUSING_OPTIONS.find(h => h.id === item.housing);
    const housingText = housingObj?.label || '🏡 Residência Segura';

    return (
      <View style={[styles.volunteerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {/* Header do Card com Foto e Selo Verificado */}
        <View style={styles.cardHeader}>
          <TouchableOpacity
            onPress={() => navigation.navigate('UserProfile', { userId: item.userId, userName: item.userName, avatarUrl: item.avatarUrl })}
            style={styles.avatarContainer}
            activeOpacity={0.8}
          >
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : colors.primaryLight }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
              </View>
            )}
            <View style={styles.verifiedBadgeCircle}>
              <MaterialIcons name="check" size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.volunteerName, { color: colors.text }]} numberOfLines={1}>
                {item.userName || 'Voluntário WeFIND'}
              </Text>
              <View style={styles.verifiedTextBadge}>
                <Text style={styles.verifiedText}>Verificado</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <MaterialIcons name="place" size={14} color={colors.primary} style={{ marginRight: 2 }} />
              <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                {[item.neighborhood, item.city, item.state].filter(Boolean).join(' • ') || 'Localização não informada'}
              </Text>
            </View>
          </View>
        </View>

        {/* Informações de Acolhimento */}
        <View style={[styles.cardDetailsBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Aceita:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{speciesNames}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Moradia:</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>{housingText}</Text>
          </View>

          {item.hasOtherPets && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Outros Pets:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                Sim {item.otherPetsInfo ? `(${item.otherPetsInfo})` : ''}
              </Text>
            </View>
          )}

          {Boolean(item.experienceNotes?.trim()) && (
            <Text style={[styles.notesText, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={2}>
              "{item.experienceNotes.trim()}"
            </Text>
          )}
        </View>

        {/* Ações: Chat e Ver Perfil */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={[styles.profileButton, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('UserProfile', { userId: item.userId, userName: item.userName, avatarUrl: item.avatarUrl })}
            activeOpacity={0.75}
          >
            <Text style={[styles.profileButtonText, { color: colors.text }]}>Ver Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => handleStartChat(item)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="chat" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.chatButtonText}>Solicitar Lar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Lares Temporários</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>Buscando voluntários disponíveis...</Text>
        </View>
      ) : (
        <FlatList
          data={volunteers}
          keyExtractor={(item) => String(item.userId || Math.random())}
          renderItem={renderVolunteerCard}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <MaterialIcons name="home-work" size={40} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum voluntário encontrado</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchCity
                  ? `Não encontramos lares temporários disponíveis para "${searchCity}". Tente expandir a busca.`
                  : 'Ainda não há voluntários ativos nesta categoria.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setFosterModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyActionBtnText}>Seja o Primeiro Voluntário</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Modal para Cadastro/Edição de Lar Temporário */}
      <FosterVolunteerModal
        visible={fosterModalVisible}
        onClose={() => setFosterModalVisible(false)}
        onSaved={() => loadVolunteers()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 2,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  listContent: {
    paddingBottom: 40,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
    alignItems: 'center',
  },
  infoBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  infoBannerText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  beVolunteerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  beVolunteerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  beVolunteerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beVolunteerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  beVolunteerSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  filtersScrollContainer: {
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  volunteerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
  },
  verifiedBadgeCircle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  volunteerName: {
    fontSize: 15,
    fontWeight: '800',
  },
  verifiedTextBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardDetailsBox: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  detailLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    minWidth: 55,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  notesText: {
    fontSize: 11.5,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  profileButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chatButton: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 12,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emptyActionBtn: {
    backgroundColor: '#2E5634',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
});

export default FosterVolunteersScreen;
