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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';
import OptimizedImage from '../components/OptimizedImage';

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
                  {statistics.resolved_count > 0 ? `${statistics.resolved_count}` : '0'}
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

        {/* Seção de Finais Felizes & Casos de Sucesso */}
        <View style={styles.happyEndingsSection}>
          <View style={styles.happyEndingsHeader}>
            <View style={styles.happyEndingsBadgeIcon}>
              <MaterialIcons name="celebration" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.happyEndingsTitle}>🎉 Finais Felizes & Casos de Sucesso</Text>
              <Text style={styles.happyEndingsSubtitle}>
                Animais que já voltaram para os braços de suas famílias
              </Text>
            </View>
          </View>

          {recoveredPets.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.happyEndingsScroll}
            >
              {recoveredPets.map((pet) => {
                const photoUrl =
                  pet.item_photos && pet.item_photos.length > 0 ? pet.item_photos[0].url : null;
                return (
                  <TouchableOpacity
                    key={String(pet.id)}
                    style={styles.happyEndingCard}
                    onPress={() => navigation.navigate('ItemDetail', { itemId: pet.id })}
                    activeOpacity={0.88}
                  >
                    <View style={styles.happyEndingImageWrapper}>
                      {photoUrl ? (
                        <OptimizedImage
                          uri={photoUrl}
                          style={styles.happyEndingImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.happyEndingImagePlaceholder}>
                          <MaterialIcons name="pets" size={32} color="#9CA3AF" />
                        </View>
                      )}
                      <View style={styles.happyEndingTag}>
                        <MaterialIcons
                          name="check-circle"
                          size={13}
                          color="#FFFFFF"
                          style={{ marginRight: 3 }}
                        />
                        <Text style={styles.happyEndingTagText}>Recuperado</Text>
                      </View>
                    </View>

                    <View style={styles.happyEndingInfo}>
                      <Text style={styles.happyEndingPetName} numberOfLines={1}>
                        {pet.title || 'Pet Amado'}
                      </Text>
                      <Text style={styles.happyEndingSpecies} numberOfLines={1}>
                        {pet.species ? String(pet.species).toUpperCase() : 'PET'}
                      </Text>
                      <View style={styles.happyEndingLocationRow}>
                        <MaterialIcons name="place" size={13} color="#6B7280" />
                        <Text style={styles.happyEndingLocationText} numberOfLines={1}>
                          {[pet.city, pet.state].filter(Boolean).join(', ') || 'Brasil'}
                        </Text>
                      </View>
                      {pet.owner_name ? (
                        <Text style={styles.happyEndingTutorText} numberOfLines={1}>
                          Tutor: {pet.owner_name}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.happyEndingsEmptyCard}>
              <View style={styles.happyEndingsEmptyIconBox}>
                <MaterialIcons name="favorite-border" size={26} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.happyEndingsEmptyTitle}>Corrente do Bem WeFIND</Text>
                <Text style={styles.happyEndingsEmptyText}>
                  Quando um tutor reencontra seu pet e encerra a busca, a foto e a história aparecem aqui para celebrar com toda a comunidade!
                </Text>
              </View>
            </View>
          )}
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

        {/* Depoimentos */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.sectionTitle}>Depoimentos de Famílias</Text>

          <View style={styles.testimonialCard}>
            <MaterialIcons name="format-quote" size={24} color="#BFDBFE" style={{ marginBottom: 4 }} />
            <Text style={styles.testimonialQuote}>
              "Perdi o Floquinho no centro da cidade e graças aos alertas da comunidade consegui reencontrá-lo em menos de 48 horas!"
            </Text>
            <Text style={styles.testimonialAuthor}>— Camila R. • Pelotas, RS</Text>
          </View>

          <View style={styles.testimonialCard}>
            <MaterialIcons name="format-quote" size={24} color="#BFDBFE" style={{ marginBottom: 4 }} />
            <Text style={styles.testimonialQuote}>
              "Encontrei uma cachorrinha assustada no bairro e com o cartaz do WeFIND o dono entrou em contato no mesmo dia."
            </Text>
            <Text style={styles.testimonialAuthor}>— Rodrigo M. • Rio Grande, RS</Text>
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
    marginBottom: 22,
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

  // Finais Felizes
  happyEndingsSection: {
    marginBottom: 22,
  },
  happyEndingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  happyEndingsBadgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  happyEndingsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  happyEndingsSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  happyEndingsScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  happyEndingCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    shadowColor: '#059669',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  happyEndingImageWrapper: {
    width: '100%',
    height: 125,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  happyEndingImage: {
    width: '100%',
    height: 125,
  },
  happyEndingImagePlaceholder: {
    width: '100%',
    height: 125,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  happyEndingTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  happyEndingTagText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10.5,
  },
  happyEndingInfo: {
    padding: 10,
  },
  happyEndingPetName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  happyEndingSpecies: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  happyEndingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  happyEndingLocationText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 3,
    fontWeight: '500',
  },
  happyEndingTutorText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  happyEndingsEmptyCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  happyEndingsEmptyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  happyEndingsEmptyTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 2,
  },
  happyEndingsEmptyText: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 17,
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

  // Depoimentos
  testimonialsSection: {
    marginBottom: 24,
  },
  testimonialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testimonialQuote: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 19,
    marginBottom: 6,
  },
  testimonialAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
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
