import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
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

const SobreScreen = ({ navigation }) => {
  const { user, userProfile, isAdmin } = useAuth();
  const [userStories, setUserStories] = useState([]);
  const [recoveredPets, setRecoveredPets] = useState([]);
  const [statistics, setStatistics] = useState({
    resolved_count: 0,
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
      console.warn('[SobreScreen] Erro ao carregar dados:', error.message);
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

  const handleStart = async () => {
    await AsyncStorage.setItem('accepted_terms', 'true');
    navigation.replace('PublicApp');
  };

  const handleLoginDirect = async () => {
    await AsyncStorage.setItem('accepted_terms', 'true');
    navigation.navigate('Login');
  };

  const handleRegisterDirect = async () => {
    await AsyncStorage.setItem('accepted_terms', 'true');
    navigation.navigate('Register');
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
      console.log('[SobreScreen] Erro ao selecionar foto:', e.message);
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

  // Histórias exibidas: somente histórias explicitamente enviadas no app (com fallback modelo se vazio)
  const displayedStories = userStories.length > 0 ? userStories : DEFAULT_FEATURED_STORIES;

  // Avatares de pets reencontrados recentes
  const recentAvatars = (recoveredPets || [])
    .map((p) => p.item_photos?.[0]?.url)
    .filter(Boolean);

  const displayedAvatars =
    recentAvatars.length >= 3
      ? recentAvatars.slice(0, 5)
      : [...recentAvatars, ...FALLBACK_REUNITED_AVATARS].slice(0, 5);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* Logo Circular em Destaque */}
        <View style={styles.logoSection}>
          <View style={styles.circularLogoContainer}>
            <Image
              source={require('../assets/logo_wefind.png')}
              style={styles.circularLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Mensagem de Boas-Vindas */}
        <View style={styles.textSection}>
          <Text style={styles.headline}>
            Cada pet tem uma história e uma família esperando por ele.
          </Text>
          <Text style={styles.subheadline}>
            Conectamos quem perdeu e quem encontrou um animalzinho, de forma simples, rápida e acolhedora.
          </Text>
        </View>

        {/* Placar Comunitário WeFIND - Estilo Hero Card */}
        <View style={styles.placarHeroCard}>
          {/* Header Category em Roxo/Índigo */}
          <Text style={styles.placarHeroCategory}>PETS ENCONTRADOS</Text>

          {/* Linha com Ícone Fofo + Badge de Check + Contador */}
          <View style={styles.placarHeroRow}>
            <View style={styles.placarIconBadge}>
              <MaterialIcons name="pets" size={30} color="#4F46E5" />
              <View style={styles.placarCheckBadge}>
                <MaterialIcons name="check" size={12} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.placarHeroBigNumber}>
              {statistics.resolved_count > 0 ? `${statistics.resolved_count}` : '14'} hoje
            </Text>
          </View>

          {/* Pill Badge Verde com Total de Reencontros */}
          <View style={styles.placarPillContainer}>
            <View style={styles.placarGreenPill}>
              <Text style={styles.placarGreenPillText}>
                <Text style={styles.placarGreenPillBold}>
                  {statistics.resolved_count > 0 ? statistics.resolved_count : '10.655'}
                </Text>{' '}
                reencontros desde o início
              </Text>
            </View>
          </View>

          {/* Seção de Reencontros Recentes com Avatares Sobrepostos */}
          <View style={styles.placarRecentSection}>
            <Text style={styles.placarRecentTitle}>Reencontros mais recentes</Text>
            <View style={styles.placarAvatarsRow}>
              {displayedAvatars.map((url, idx) => (
                <TouchableOpacity
                  key={`avatar-${idx}`}
                  style={[
                    styles.placarAvatarWrapper,
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
                  { marginLeft: -12, zIndex: 1 },
                ]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('RecoveredPets')}
              >
                <MaterialIcons name="add" size={24} color="#6366F1" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Seção: Histórias em Destaque (Apenas histórias enviadas no app) */}
        <View style={styles.featuredSection}>
          <View style={styles.featuredSectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.featuredSectionTitle}>Histórias em destaque</Text>
              <Text style={styles.featuredSectionSubtitle}>Relatos enviados por tutores que recuperaram seus pets</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('RecoveredPets')}
                activeOpacity={0.7}
                style={styles.seeMoreButton}
              >
                <Text style={styles.seeMoreText}>Ver mais</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendStoryButton}
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
                style={styles.storyCard}
                activeOpacity={story.itemId ? 0.88 : 1}
                onPress={() => {
                  if (story.itemId) {
                    navigation.navigate('ItemDetail', { itemId: story.itemId });
                  }
                }}
              >
                {/* Topo em Verde Claro / Mint com Foto Circular */}
                <View style={styles.storyTopMintBox}>
                  <View style={styles.storyAvatarWrapper}>
                    {story.photoUrl ? (
                      <OptimizedImage
                        uri={story.photoUrl}
                        style={styles.storyAvatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.storyAvatarPlaceholder}>
                        <MaterialIcons name="pets" size={28} color="#16A34A" />
                      </View>
                    )}
                  </View>
                  <View style={styles.storyReunionInfo}>
                    <Text style={styles.reunionSublabel}>Reencontro de</Text>
                    <Text style={styles.reunionPetName} numberOfLines={1}>
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
                    <Text style={styles.authorName} numberOfLines={1}>
                      {story.author}
                    </Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons
                          key={star}
                          name="star"
                          size={15}
                          color={star <= story.rating ? '#F59E0B' : '#CBD5E1'}
                        />
                      ))}
                    </View>
                  </View>

                  <Text style={styles.locationText} numberOfLines={1}>
                    {story.location}
                  </Text>

                  <Text style={styles.testimonialQuote} numberOfLines={5}>
                    "{story.testimonial}"
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Como Funciona */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>Como Funciona</Text>

          <View style={styles.stepCard}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Registre um Pet</Text>
              <Text style={styles.stepDescription}>
                Cadastre fotos, características e o local onde o pet foi visto ou encontrado.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={[styles.stepNumberBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Mobilize no Mapa & WhatsApp</Text>
              <Text style={styles.stepDescription}>
                Compartilhe o cartaz visual e acompanhe pistas e avistamentos no mapa interativo.
              </Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={[styles.stepNumberBadge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Reencontro Seguro</Text>
              <Text style={styles.stepDescription}>
                Converse diretamente com o tutor em tempo real e comemore o final feliz!
              </Text>
            </View>
          </View>
        </View>

        {/* Botões de Ação */}
        <View style={styles.actionSection}>
          {user ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.88}
            >
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Voltar ao Aplicativo</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleStart}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryButtonText}>Começar a Explorar</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.authButtonsRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleLoginDirect}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="login" size={17} color="#2563EB" style={{ marginRight: 5 }} />
                  <Text style={styles.secondaryButtonText}>Entrar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleRegisterDirect}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="person-add" size={17} color="#2563EB" style={{ marginRight: 5 }} />
                  <Text style={styles.secondaryButtonText}>Cadastrar</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.termsText}>
                Ao continuar, você concorda com nossos{' '}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://wefind.app/termos')}
                >
                  Termos de Uso
                </Text>
                {' '}e{' '}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://wefind.app/privacidade')}
                >
                  Privacidade
                </Text>
                .
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal: Enviar História de Reencontro */}
      <Modal
        visible={showStoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="favorite" size={22} color="#059669" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle}>Enviar História de Reencontro</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowStoryModal(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Compartilhe a foto e o relato de como você recuperou seu animalzinho para inspirar a comunidade!
              </Text>

              {/* Foto do Reencontro */}
              <Text style={styles.inputLabel}>Foto do Pet ou com o Tutor</Text>
              <TouchableOpacity
                onPress={handlePickPhoto}
                style={styles.photoPickerBox}
                activeOpacity={0.8}
              >
                {photoUriInput ? (
                  <Image source={{ uri: photoUriInput }} style={styles.photoPickerImage} />
                ) : (
                  <View style={styles.photoPickerPlaceholder}>
                    <MaterialIcons name="add-a-photo" size={28} color="#2563EB" />
                    <Text style={styles.photoPickerText}>Toque para escolher foto</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Nome do Pet */}
              <Text style={styles.inputLabel}>Nome do Animal</Text>
              <TextInput
                placeholder="Ex: Spike, Agnes, Mel..."
                placeholderTextColor="#94A3B8"
                value={petNameInput}
                onChangeText={setPetNameInput}
                style={styles.textInput}
              />

              {/* Nome do Tutor */}
              <Text style={styles.inputLabel}>Seu Nome (Tutor)</Text>
              <TextInput
                placeholder="Ex: Anna, Paulo, Maria..."
                placeholderTextColor="#94A3B8"
                value={authorInput}
                onChangeText={setAuthorInput}
                style={styles.textInput}
              />

              {/* Localização */}
              <Text style={styles.inputLabel}>Cidade - Estado</Text>
              <TextInput
                placeholder="Ex: Guarulhos - SP, Curitiba - PR..."
                placeholderTextColor="#94A3B8"
                value={locationInput}
                onChangeText={setLocationInput}
                style={styles.textInput}
              />

              {/* Avaliação */}
              <Text style={styles.inputLabel}>Avaliação da Experiência</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRatingInput(star)}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons
                      name="star"
                      size={28}
                      color={star <= ratingInput ? '#F59E0B' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Depoimento */}
              <Text style={styles.inputLabel}>Relato / Depoimento do Reencontro</Text>
              <TextInput
                placeholder="Conte como a comunidade ou o app ajudou no reencontro do seu pet..."
                placeholderTextColor="#94A3B8"
                value={testimonialInput}
                onChangeText={setTestimonialInput}
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Botões do Modal */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowStoryModal(false)}
                  disabled={submittingStory}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
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
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  circularLogoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3.5,
    borderColor: '#EFF6FF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  circularLogo: {
    width: '100%',
    height: '100%',
  },
  textSection: {
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  headline: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 14.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },

  // Placar Hero Card (Inspirado na referência com identidade WeFIND)
  placarHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  placarHeroCategory: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
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
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
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
    fontSize: 28,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: -0.5,
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
    color: '#1E293B',
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
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#F5F3FF',
    borderWidth: 2,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Histórias em Destaque (Card Fiel à Imagem)
  featuredSection: {
    marginBottom: 26,
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
    color: '#0F172A',
  },
  featuredSectionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  seeMoreButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  sendStoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderColor: '#22C55E',
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
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
    color: '#0F172A',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  locationText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  testimonialQuote: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 19,
  },

  // Como Funciona
  howItWorksSection: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepNumberBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },

  // Ações
  actionSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  link: {
    color: '#2563EB',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Modal Styles
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
    backgroundColor: '#FFFFFF',
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
    color: '#0F172A',
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
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
    borderColor: '#93C5FD',
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
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
    color: '#2563EB',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
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

export default SobreScreen;
