import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as storiesService from '../services/stories';
import OptimizedImage from '../components/OptimizedImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SobreScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStories = async () => {
      try {
        setLoadingStories(true);
        const data = await storiesService.listSuccessStories();
        if (isMounted) {
          setStories(data || []);
        }
      } catch (err) {
        console.log('[SobreScreen] Erro ao carregar mural:', err.message);
      } finally {
        if (isMounted) setLoadingStories(false);
      }
    };
    fetchStories();
    return () => { isMounted = false; };
  }, []);

  const handleGoToMap = () => {
    if (user) {
      navigation.navigate('MainApp', { screen: 'MapTab' });
    } else {
      navigation.navigate('PublicApp', { screen: 'MapTab' });
    }
  };

  const handleGoToMural = () => {
    navigation.navigate('MuralReencontros');
  };

  const displayedStories = stories.slice(0, 4);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* HEADER SUPERIOR */}
      <View style={[styles.topHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.topHeaderContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={require('../assets/logo_wefind.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.headerTitle}>Conhecer o WeFIND</Text>
              <Text style={styles.headerSubtitle}>Plataforma colaborativa animal</Text>
            </View>
          </View>

          {!user && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.28)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              }}
              activeOpacity={0.75}
              accessibilityLabel="Entrar na conta"
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#FEA937',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 6,
                }}
              >
                <MaterialIcons name="person" size={15} color="#FFFFFF" />
              </View>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.2 }}>
                Entrar
              </Text>
              <MaterialIcons name="chevron-right" size={16} color="rgba(255, 255, 255, 0.75)" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. HERO CARD COMPACTO & ELEGANTE */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={[styles.heroBadge, { backgroundColor: colors.primaryLight }]}>
            <MaterialIcons name="pets" size={14} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={[styles.heroBadgeText, { color: colors.primary }]}>REDE DE PROTEÇÃO E REENCONTRO</Text>
          </View>

          <Text style={[styles.heroHeadline, { color: colors.text }]}>
            Reunindo animais e famílias com rapidez, tecnologia e empatia.
          </Text>

          <Text style={[styles.heroDescription, { color: colors.textSecondary }]}>
            O WeFIND conecta tutores, protetores e a vizinhança através de alertas geolocalizados, radar de busca em tempo real e divulgação facilitada.
          </Text>

          {/* Destaques Rápidos */}
          <View style={styles.pillsRow}>
            <View style={[styles.featurePill, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <MaterialIcons name="check-circle" size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text style={[styles.featurePillText, { color: '#047857' }]}>100% Gratuito</Text>
            </View>
            <View style={[styles.featurePill, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <MaterialIcons name="my-location" size={14} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={[styles.featurePillText, { color: '#1D4ED8' }]}>Radar com GPS</Text>
            </View>
            <View style={[styles.featurePill, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB', borderColor: '#FDE68A' }]}>
              <MaterialIcons name="campaign" size={14} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={[styles.featurePillText, { color: '#B45309' }]}>Cartaz Digital</Text>
            </View>
          </View>
        </View>

        {/* 2. MURAL DE REENCONTROS (DESTAQUE PRINCIPAL) */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="volunteer-activism" size={20} color="#059669" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Mural de Reencontros</Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Histórias reais de pets que voltaram para casa
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleGoToMural}
              style={[styles.seeAllBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.seeAllBtnText, { color: colors.primary }]}>Ver Todos</Text>
              <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {loadingStories ? (
            <View style={[styles.loadingBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>Carregando histórias...</Text>
            </View>
          ) : displayedStories.length === 0 ? (
            <View style={[styles.emptyMuralBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <MaterialIcons name="pets" size={36} color="#059669" style={{ marginBottom: 6 }} />
              <Text style={[styles.emptyMuralTitle, { color: colors.text }]}>Participe do nosso Mural!</Text>
              <Text style={[styles.emptyMuralSubtitle, { color: colors.textSecondary }]}>
                Quando encontrar seu pet através do WeFIND, compartilhe seu relato para inspirar a comunidade.
              </Text>
            </View>
          ) : (
            <View style={styles.storiesContainer}>
              {displayedStories.map((story) => (
                <TouchableOpacity
                  key={String(story.id)}
                  style={[styles.storyCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                  activeOpacity={0.88}
                  onPress={handleGoToMural}
                >
                  <View style={styles.storyTopRow}>
                    <View style={styles.storyAvatarWrapper}>
                      {story.photoUrl ? (
                        <OptimizedImage uri={story.photoUrl} style={styles.storyAvatar} resizeMode="cover" />
                      ) : (
                        <View style={[styles.storyAvatarPlaceholder, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
                          <MaterialIcons name="pets" size={24} color="#16A34A" />
                        </View>
                      )}
                    </View>

                    <View style={styles.storyHeaderInfo}>
                      <View style={styles.storyBadgeHappy}>
                        <Text style={styles.storyBadgeHappyText}>REENCONTRADO 🎉</Text>
                      </View>
                      <Text style={[styles.storyPetName, { color: colors.text }]} numberOfLines={1}>
                        {story.petName}
                      </Text>
                      <Text style={[styles.storyAuthorLocation, { color: colors.textMuted }]} numberOfLines={1}>
                        Por {story.author} • {story.location}
                      </Text>
                    </View>

                    <View style={styles.storyRatingStars}>
                      {[1, 2, 3, 4, 5].map((st) => (
                        <MaterialIcons
                          key={st}
                          name={st <= story.rating ? 'star' : 'star-border'}
                          size={13}
                          color="#F59E0B"
                        />
                      ))}
                    </View>
                  </View>

                  {story.testimonial ? (
                    <Text style={[styles.storyQuote, { color: isDark ? '#CBD5E1' : '#334155' }]} numberOfLines={3}>
                      "{story.testimonial}"
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* CTA para o Mural */}
          <TouchableOpacity
            onPress={handleGoToMural}
            style={[styles.muralBannerCTA, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: '#10B981' }]}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.muralCTATitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                Celebre o seu Reencontro
              </Text>
              <Text style={[styles.muralCTASubtitle, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                Envie fotos e depoimentos para o Mural oficial da comunidade
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color={isDark ? '#6EE7B7' : '#059669'} />
          </TouchableOpacity>
        </View>

        {/* 3. COMO FUNCIONA EM 3 PASSOS DIRETOS */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
            Como o WeFIND Funciona
          </Text>

          <View style={styles.stepsColumn}>
            {/* Passo 1 */}
            <View style={[styles.stepItemCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Text style={[styles.stepNumberText, { color: '#2563EB' }]}>1</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.stepItemTitle, { color: colors.text }]}>Cadastre com Foto & Local</Text>
                <Text style={[styles.stepItemDesc, { color: colors.textSecondary }]}>
                  Publique em segundos um pet perdido, encontrado ou para adoção. O app gera cartaz digital com QR code pronto para compartilhar.
                </Text>
              </View>
            </View>

            {/* Passo 2 */}
            <View style={[styles.stepItemCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Text style={[styles.stepNumberText, { color: '#D97706' }]}>2</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.stepItemTitle, { color: colors.text }]}>Radar no Mapa & Pistas com GPS</Text>
                <Text style={[styles.stepItemDesc, { color: colors.textSecondary }]}>
                  Pessoas da região podem avistar o animal, registrar novas coordenadas no mapa interativo e anexar fotos recentes.
                </Text>
              </View>
            </View>

            {/* Passo 3 */}
            <View style={[styles.stepItemCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={[styles.stepNumberText, { color: '#059669' }]}>3</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.stepItemTitle, { color: colors.text }]}>Chat Seguro & Avaliações</Text>
                <Text style={[styles.stepItemDesc, { color: colors.textSecondary }]}>
                  Converse diretamente pelo app ou WhatsApp, combine o reencontro e avalie sua experiência com outros membros.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. ATALHOS RÁPIDOS */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            onPress={handleGoToMap}
            style={[styles.quickTile, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <MaterialIcons name="map" size={22} color="#2563EB" />
            </View>
            <Text style={[styles.quickTileTitle, { color: colors.text }]}>Mapa Interativo</Text>
            <Text style={[styles.quickTileSub, { color: colors.textMuted }]}>Explorar por raio e radar GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoToMural}
            style={[styles.quickTile, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <MaterialIcons name="stars" size={22} color="#059669" />
            </View>
            <Text style={[styles.quickTileTitle, { color: colors.text }]}>Reencontros</Text>
            <Text style={[styles.quickTileSub, { color: colors.textMuted }]}>Depoimentos da comunidade</Text>
          </TouchableOpacity>
        </View>

        {/* 5. RODAPÉ DE PRIVACIDADE E TERMOS */}
        <View style={styles.footerSection}>
          <Text style={[styles.termsText, { color: colors.textMuted }]}>
            WeFIND • Plataforma colaborativa para proteção animal.{'\n'}
            <Text
              style={[styles.link, { color: colors.primary }]}
              onPress={() => Linking.openURL('https://wefind.app/termos')}
            >
              Termos de Uso
            </Text>
            {' '}e{' '}
            <Text
              style={[styles.link, { color: colors.primary }]}
              onPress={() => Linking.openURL('https://wefind.app/privacidade')}
            >
              Privacidade
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16.5,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11.5,
  },
  headerLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
  },
  heroCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroHeadline: {
    fontSize: 18.5,
    fontWeight: '900',
    lineHeight: 25,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionWrapper: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  seeAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMuralBox: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMuralTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyMuralSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  storiesContainer: {
    gap: 10,
  },
  storyCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  storyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  storyAvatarWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  storyAvatar: {
    width: 46,
    height: 46,
  },
  storyAvatarPlaceholder: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyHeaderInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  storyBadgeHappy: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  storyBadgeHappyText: {
    color: '#15803D',
    fontSize: 9,
    fontWeight: '800',
  },
  storyPetName: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  storyAuthorLocation: {
    fontSize: 11,
    marginTop: 1,
  },
  storyRatingStars: {
    flexDirection: 'row',
  },
  storyQuote: {
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  muralBannerCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  muralCTATitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  muralCTASubtitle: {
    fontSize: 11.5,
  },
  stepsColumn: {
    gap: 8,
  },
  stepItemCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '900',
  },
  stepItemTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 3,
  },
  stepItemDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickTile: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickTileTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  quickTileSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  footerSection: {
    alignItems: 'center',
    paddingTop: 10,
  },
  termsText: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default SobreScreen;
