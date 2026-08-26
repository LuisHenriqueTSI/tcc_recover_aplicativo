import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as itemsService from '../services/items';
import * as storiesService from '../services/stories';
import OptimizedImage from '../components/OptimizedImage';

const DEFAULT_FEATURED_STORIES = [
  {
    id: 'featured-spike',
    petName: 'Spike',
    author: 'Anna',
    rating: 5,
    location: 'Guarulhos - SP',
    photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&auto=format&fit=crop&q=80',
    testimonial: 'Pessoas incríveis, me acionaram e cuidaram dele, até hoje na segunda ele chegou na rua no sábado de madrugada. Eles alimentaram ele, colocaram mantinha, água, pessoas de grande coração, eu quase chorei de emoção!',
  },
  {
    id: 'featured-agnes',
    petName: 'Agnes',
    author: 'Luane',
    rating: 5,
    location: 'Guaxupé - MG',
    photoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&auto=format&fit=crop&q=80',
    testimonial: 'Sigam a dica do app e do mapa! Saímos à noite atraindo pelo cheirinho e compartilhamos o cartaz! Uma vizinha viu a publicação no WeFIND e nos acionou de imediato.',
  },
  {
    id: 'featured-collins',
    petName: 'Collins',
    author: 'Paulo',
    rating: 5,
    location: 'Curitiba - PR',
    photoUrl: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=300&auto=format&fit=crop&q=80',
    testimonial: 'Encontramos os sapecas! Muito obrigado a todos da comunidade que compartilharam e ajudaram de alguma forma com avisos e mensagens no chat em tempo real! 💕🐶',
  },
];

const FALLBACK_REUNITED_AVATARS = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&auto=format&fit=crop&q=80',
];

const MuralReencontrosScreen = ({ navigation }) => {
  const { user, userProfile, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const [userStories, setUserStories] = useState([]);
  const [recoveredPets, setRecoveredPets] = useState([]);
  const [statistics, setStatistics] = useState({
    resolved_count: 0,
    resolved_today_count: 0,
    lost_count: 0,
    found_count: 0,
    sightings_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estado do Modal de Envio de História
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [petNameInput, setPetNameInput] = useState('');
  const [authorInput, setAuthorInput] = useState(userProfile?.name || '');
  const [locationInput, setLocationInput] = useState(
    [userProfile?.city, userProfile?.state].filter(Boolean).join(' - ') || ''
  );
  const [testimonialInput, setTestimonialInput] = useState('');
  const [ratingInput, setRatingInput] = useState(5);
  const [photoUriInput, setPhotoUriInput] = useState(null);
  const [submittingStory, setSubmittingStory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [storiesList, stats, recoveredList] = await Promise.all([
        storiesService.listSuccessStories(),
        itemsService.getCommunityImpactStats(),
        itemsService.listRecoveredPets(10),
      ]);
      setUserStories(storiesList || []);
      if (stats) setStatistics(stats);
      if (recoveredList) setRecoveredPets(recoveredList);
    } catch (error) {
      console.warn('[MuralReencontrosScreen] Erro ao carregar dados:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.name && !authorInput) setAuthorInput(userProfile.name);
      if (userProfile.city && userProfile.state && !locationInput) {
        setLocationInput(`${userProfile.city} - ${userProfile.state}`);
      }
    }
  }, [userProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteStory = (story) => {
    Alert.alert(
      'Excluir História',
      `Tem certeza de que deseja excluir permanentemente a história de reencontro de "${story.petName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await storiesService.deleteSuccessStory(story.id);
              Alert.alert('Sucesso', 'História excluída com sucesso.');
              loadData();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a história.');
            }
          },
        },
      ]
    );
  };

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria para anexar a foto do reencontro.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUriInput(result.assets[0].uri);
      }
    } catch (e) {
      console.log('[MuralReencontrosScreen] Erro ao selecionar foto:', e.message);
    }
  };

  const handleSubmitStory = async () => {
    if (!petNameInput.trim()) {
      Alert.alert('Atenção', 'Informe o nome do animalzinho reencontrado.');
      return;
    }
    if (!authorInput.trim()) {
      Alert.alert('Atenção', 'Informe seu nome ou do tutor.');
      return;
    }
    if (!testimonialInput.trim()) {
      Alert.alert('Atenção', 'Escreva seu relato ou depoimento sobre o reencontro.');
      return;
    }

    setSubmittingStory(true);
    try {
      await storiesService.submitSuccessStory({
        petName: petNameInput.trim(),
        author: authorInput.trim(),
        location: locationInput.trim() || 'Brasil',
        testimonial: testimonialInput.trim(),
        photoUrl: photoUriInput,
        rating: ratingInput,
        userId: user?.id || null,
      });

      Alert.alert('História Publicada! 🎉', 'Seu relato de reencontro foi publicado e já está visível para toda a comunidade.');
      setShowStoryModal(false);
      setPetNameInput('');
      setTestimonialInput('');
      setPhotoUriInput(null);
      loadData();
    } catch (error) {
      Alert.alert('Erro ao enviar', 'Não foi possível salvar seu relato. Tente novamente.');
    } finally {
      setSubmittingStory(false);
    }
  };

  const displayedStories = userStories.length > 0 ? userStories : DEFAULT_FEATURED_STORIES;

  const recentAvatars = (recoveredPets || [])
    .map((p) => p.item_photos?.[0]?.url)
    .filter(Boolean);

  const displayedAvatars =
    recentAvatars.length >= 3
      ? recentAvatars.slice(0, 5)
      : [...recentAvatars, ...FALLBACK_REUNITED_AVATARS].slice(0, 5);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* Placar Comunitário WeFIND - Cores Oficiais WeFIND (Azul, Verde, Dourado) */}
        <View style={[styles.placarHeroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Header Category em Azul WeFIND */}
          <Text style={[styles.placarHeroCategory, { color: colors.primary }]}>ANIMAIS REENCONTRADOS</Text>

          {/* Linha com Ícone + Badge de Check + Contador */}
          <View style={styles.placarHeroRow}>
            <View style={[styles.placarIconBadge, { backgroundColor: colors.primaryLight, borderColor: isDark ? colors.cardBorder : '#DBEAFE' }]}>
              <MaterialIcons name="pets" size={30} color={colors.primary} />
              <View style={styles.placarCheckBadge}>
                <MaterialIcons name="check" size={12} color="#FFFFFF" />
              </View>
            </View>
            <Text style={[styles.placarHeroBigNumber, { color: colors.primary }]}>
              {`${statistics.resolved_today_count || 0} ${(statistics.resolved_today_count === 1) ? 'reencontro hoje' : 'reencontros hoje'}`}
            </Text>
          </View>

          {/* Pill Badge Verde com Total de Reencontros */}
          <View style={styles.placarPillContainer}>
            <View style={[styles.placarGreenPill, isDark && { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: '#22C55E' }]}>
              <Text style={[styles.placarGreenPillText, isDark && { color: '#86EFAC' }]}>
                <Text style={[styles.placarGreenPillBold, isDark && { color: '#4ADE80' }]}>
                  {statistics.resolved_count || 0}
                </Text>{' '}
                {(statistics.resolved_count === 1) ? 'animal reencontrado desde o início' : 'animais reencontrados desde o início'}
              </Text>
            </View>
          </View>

          {/* Seção de Reencontros Recentes com Avatares Sobrepostos */}
          <View style={styles.placarRecentSection}>
            <Text style={[styles.placarRecentTitle, { color: colors.text }]}>Reencontros mais recentes</Text>
            <View style={styles.placarAvatarsRow}>
              {displayedAvatars.map((url, idx) => (
                <TouchableOpacity
                  key={`avatar-${idx}`}
                  style={[
                    styles.placarAvatarWrapper,
                    { borderColor: isDark ? colors.card : '#FFFFFF', backgroundColor: colors.surface },
                    idx > 0 && { marginLeft: -12 },
                    { zIndex: 10 - idx },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('RecoveredPets')}
                >
                  <OptimizedImage uri={url} style={styles.placarAvatarImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}

              {/* Botão '+' para ver todos */}
              <TouchableOpacity
                style={[
                  styles.placarMoreButton,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: isDark ? colors.cardBorder : '#DBEAFE',
                    marginLeft: -12,
                    zIndex: 1,
                  },
                ]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('RecoveredPets')}
              >
                <MaterialIcons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Seção: Histórias em Destaque */}
        <View style={styles.featuredSection}>
          <View style={styles.featuredSectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featuredSectionTitle, { color: colors.text }]}>Histórias em destaque</Text>
              <Text style={[styles.featuredSectionSubtitle, { color: colors.textSecondary }]}>
                Relatos enviados por tutores que recuperaram seus animais
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('RecoveredPets')}
                activeOpacity={0.7}
                style={styles.seeMoreButton}
              >
                <Text style={[styles.seeMoreText, { color: colors.primary }]}>Ver mais</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendStoryButton, { backgroundColor: '#059669' }]}
                onPress={() => setShowStoryModal(true)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add-comment" size={15} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.sendStoryButtonText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
          >
            {displayedStories.map((story) => (
              <TouchableOpacity
                key={String(story.id)}
                style={[
                  styles.storyCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
                activeOpacity={story.itemId ? 0.88 : 1}
                onPress={() => {
                  if (story.itemId) {
                    navigation.navigate('ItemDetail', { itemId: story.itemId });
                  }
                }}
              >
                {/* Topo em Verde Claro com Foto Circular */}
                <View style={[styles.storyTopMintBox, isDark && { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderBottomColor: 'rgba(34, 197, 94, 0.2)' }]}>
                  <View style={[styles.storyAvatarWrapper, { borderColor: '#22C55E', backgroundColor: colors.surface }]}>
                    {story.photoUrl ? (
                      <OptimizedImage
                        uri={story.photoUrl}
                        style={styles.storyAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.storyAvatarPlaceholder, isDark && { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                        <MaterialIcons name="pets" size={28} color="#16A34A" />
                      </View>
                    )}
                  </View>
                  <View style={styles.storyReunionInfo}>
                    <Text style={[styles.reunionSublabel, isDark && { color: '#4ADE80' }]}>Reencontro de</Text>
                    <Text style={[styles.reunionPetName, { color: colors.text }]} numberOfLines={1}>
                      {story.petName}
                    </Text>
                  </View>
                  {(isAdmin || (user && story.userId && story.userId === user.id)) && (
                    <TouchableOpacity
                      style={styles.adminDeleteStoryButton}
                      onPress={() => handleDeleteStory(story)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Excluir história como administrador"
                    >
                      <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Corpo do Card com Autor, Estrelas, Local e Depoimento */}
                <View style={styles.storyBodyBox}>
                  <View style={styles.authorRow}>
                    <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
                      {story.author}
                    </Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons
                          key={star}
                          name="star"
                          size={15}
                          color={star <= story.rating ? '#F59E0B' : (isDark ? '#334155' : '#CBD5E1')}
                        />
                      ))}
                    </View>
                  </View>

                  <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={1}>
                    {story.location}
                  </Text>

                  <Text style={[styles.testimonialQuote, { color: isDark ? '#CBD5E1' : '#334155' }]} numberOfLines={5}>
                    "{story.testimonial}"
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Botão de Ver Todos os Reencontros no Rodapé */}
        <TouchableOpacity
          style={[styles.fullRecoveredBtn, { backgroundColor: colors.primaryLight, borderColor: isDark ? colors.cardBorder : '#DBEAFE' }]}
          onPress={() => navigation.navigate('RecoveredPets')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="pets" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.fullRecoveredBtnText, { color: colors.primary }]}>Ver Galeria de Animais Reencontrados</Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.primary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </ScrollView>

      {/* Modal: Enviar História de Reencontro */}
      <Modal
        visible={showStoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="favorite" size={22} color="#059669" style={{ marginRight: 8 }} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Enviar História de Reencontro</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowStoryModal(false)}
                  style={[styles.modalCloseButton, { backgroundColor: isDark ? colors.card : '#F1F5F9' }]}
                >
                  <MaterialIcons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Compartilhe a foto e o relato de como você recuperou seu animalzinho para inspirar a comunidade!
              </Text>

              {/* Foto do Reencontro */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Foto do Pet ou com o Tutor</Text>
              <TouchableOpacity
                onPress={handlePickPhoto}
                style={[
                  styles.photoPickerBox,
                  {
                    backgroundColor: colors.primaryLight,
                    borderColor: isDark ? colors.cardBorder : '#93C5FD',
                  },
                ]}
                activeOpacity={0.8}
              >
                {photoUriInput ? (
                  <Image source={{ uri: photoUriInput }} style={styles.photoPickerImage} />
                ) : (
                  <View style={styles.photoPickerPlaceholder}>
                    <MaterialIcons name="add-a-photo" size={28} color={colors.primary} />
                    <Text style={[styles.photoPickerText, { color: colors.primary }]}>Toque para escolher foto</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Nome do Pet */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Nome do Animal</Text>
              <TextInput
                placeholder="Ex: Spike, Agnes, Mel..."
                placeholderTextColor={colors.textMuted}
                value={petNameInput}
                onChangeText={setPetNameInput}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? colors.card : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              {/* Nome do Tutor */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Seu Nome (Tutor)</Text>
              <TextInput
                placeholder="Ex: Anna, Paulo, Maria..."
                placeholderTextColor={colors.textMuted}
                value={authorInput}
                onChangeText={setAuthorInput}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? colors.card : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              {/* Cidade / Estado */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Cidade e Estado</Text>
              <TextInput
                placeholder="Ex: São Paulo - SP, Curitiba - PR"
                placeholderTextColor={colors.textMuted}
                value={locationInput}
                onChangeText={setLocationInput}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDark ? colors.card : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              {/* Avaliação por Estrelas */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Avaliação da Experiência</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRatingInput(star)}
                    activeOpacity={0.7}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons
                      name={star <= ratingInput ? 'star' : 'star-border'}
                      size={28}
                      color="#F59E0B"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Depoimento */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Seu Relato / Mensagem</Text>
              <TextInput
                placeholder="Conte como foi o reencontro, quem ajudou e como a comunidade fez a diferença..."
                placeholderTextColor={colors.textMuted}
                value={testimonialInput}
                onChangeText={setTestimonialInput}
                multiline
                numberOfLines={4}
                style={[
                  styles.textInput,
                  styles.textArea,
                  {
                    backgroundColor: isDark ? colors.card : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              {/* Botões de Ação do Modal */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { backgroundColor: isDark ? colors.card : '#F1F5F9' }]}
                  onPress={() => setShowStoryModal(false)}
                  disabled={submittingStory}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitButton, submittingStory && { opacity: 0.7 }]}
                  onPress={handleSubmitStory}
                  disabled={submittingStory}
                >
                  {submittingStory ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Publicar História 🎉</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  placarHeroCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  placarHeroCategory: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  placarHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  placarIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
    borderWidth: 1.5,
  },
  placarCheckBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  placarHeroBigNumber: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    flex: 1,
  },
  placarPillContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  placarGreenPill: {
    borderWidth: 1.5,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  placarGreenPillText: {
    fontSize: 12.5,
    color: '#065F46',
    fontWeight: '500',
  },
  placarGreenPillBold: {
    fontWeight: '800',
    color: '#047857',
  },
  placarRecentSection: {
    marginTop: 2,
  },
  placarRecentTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  placarAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  placarAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  placarAvatarImage: {
    width: '100%',
    height: '100%',
  },
  placarMoreButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  featuredSection: {
    marginBottom: 24,
  },
  featuredSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  featuredSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  featuredSectionSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  seeMoreButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sendStoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  sendStoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  featuredScroll: {
    gap: 14,
    paddingBottom: 8,
  },
  storyCard: {
    width: 290,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  storyTopMintBox: {
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  storyAvatarWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    overflow: 'hidden',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
  },
  storyAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
  },
  storyReunionInfo: {
    flex: 1,
  },
  reunionSublabel: {
    fontSize: 12.5,
    color: '#15803D',
    fontWeight: '600',
    marginBottom: 1,
  },
  reunionPetName: {
    fontSize: 17,
    fontWeight: '800',
  },
  adminDeleteStoryButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  storyBodyBox: {
    padding: 14,
    paddingTop: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '800',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  locationText: {
    fontSize: 12,
    marginBottom: 8,
  },
  testimonialQuote: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  fullRecoveredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 20,
  },
  fullRecoveredBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 14,
  },
  modalSubtitle: {
    fontSize: 12.5,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photoPickerBox: {
    width: '100%',
    height: 110,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  photoPickerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalSubmitButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default MuralReencontrosScreen;
