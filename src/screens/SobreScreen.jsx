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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';
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

const SobreScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [recoveredPets, setRecoveredPets] = useState([]);
  const [statistics, setStatistics] = useState({
    resolved_count: 0,
    lost_count: 0,
    found_count: 0,
    sightings_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [recoveredList, stats] = await Promise.all([
        itemsService.listRecoveredPets(10),
        itemsService.getCommunityImpactStats(),
      ]);
      setRecoveredPets(recoveredList || []);
      if (stats) setStatistics(stats);
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

  // Monta a lista combinada de histórias (do banco de dados + histórias modelo)
  const dbStories = (recoveredPets || []).map((pet) => {
    const photoUrl =
      pet.item_photos && pet.item_photos.length > 0 ? pet.item_photos[0].url : null;
    return {
      id: `db-${pet.id}`,
      itemId: pet.id,
      petName: pet.title || 'Pet Amado',
      author: pet.owner_name || 'Tutor',
      rating: 5,
      location: [pet.city, pet.state].filter(Boolean).join(' - ') || 'Brasil',
      photoUrl,
      testimonial:
        pet.extra_fields?.resolution_notes ||
        pet.extra_fields?.testimonial ||
        pet.description ||
        'Reencontro comemorado com sucesso! Agradecemos o carinho e o apoio de todos que compartilharam e enviaram pistas.',
    };
  });

  const allStories = dbStories.length > 0 ? [...dbStories, ...DEFAULT_FEATURED_STORIES] : DEFAULT_FEATURED_STORIES;

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

        {/* Placar & Registro Informativo da Comunidade WeFIND */}
        <View style={styles.statsContainer}>
          <View style={styles.statsHeader}>
            <View style={styles.statsHeaderIcon}>
              <MaterialIcons name="insights" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statsSectionTitle}>Placar Comunitário WeFIND</Text>
              <Text style={styles.statsSectionSubtitle}>A força da união trazendo pets de volta para casa</Text>
            </View>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingText}>Carregando dados comunitários...</Text>
            </View>
          ) : (
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <MaterialIcons name="favorite" size={20} color="#059669" />
                <Text style={[styles.statNumber, { color: '#047857' }]}>
                  {statistics.resolved_count > 0 ? `${statistics.resolved_count}` : '3+'}
                </Text>
                <Text style={[styles.statLabel, { color: '#065F46' }]}>Reencontros</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <MaterialIcons name="search" size={20} color="#D97706" />
                <Text style={[styles.statNumber, { color: '#B45309' }]}>
                  {statistics.lost_count > 0 ? `${statistics.lost_count}` : '0'}
                </Text>
                <Text style={[styles.statLabel, { color: '#92400E' }]}>Em busca</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <MaterialIcons name="location-on" size={20} color="#2563EB" />
                <Text style={[styles.statNumber, { color: '#1D4ED8' }]}>
                  {statistics.sightings_count > 0 ? `${statistics.sightings_count}` : '0'}
                </Text>
                <Text style={[styles.statLabel, { color: '#1E40AF' }]}>Pistas & GPS</Text>
              </View>
            </View>
          )}
        </View>

        {/* Seção: Histórias em Destaque (Card Fiel à Referência) */}
        <View style={styles.featuredSection}>
          <View style={styles.featuredSectionHeader}>
            <Text style={styles.featuredSectionTitle}>Histórias em destaque</Text>
            <TouchableOpacity onPress={handleStart} activeOpacity={0.7}>
              <Text style={styles.seeMoreText}>Ver mais</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
          >
            {allStories.map((story) => (
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
                </View>

                {/* Corpo do Card com Autor, Estrelas, Local e Depoimento */}
                <View style={styles.storyBodyBox}>
                  <View style={styles.authorRow}>
                    <Text style={styles.authorName} numberOfLines={1}>
                      {story.author}
                    </Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons key={star} name="star" size={15} color="#F59E0B" />
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
                <Text style={styles.primaryButtonText}>Começar a Explorar Pets</Text>
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

  // Placar / Stats
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statsSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  statsSectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },

  // Histórias em Destaque (Card Fiel à Imagem)
  featuredSection: {
    marginBottom: 26,
  },
  featuredSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  featuredSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeMoreText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '600',
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
});

export default SobreScreen;
