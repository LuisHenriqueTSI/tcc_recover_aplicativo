import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const SobreScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

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

  const handleGoToMap = () => {
    if (user) {
      navigation.navigate('MainApp', { screen: 'MapTab' });
    } else {
      navigation.navigate('PublicApp', { screen: 'MapTab' });
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Logo Circular */}
          <View
            style={[
              styles.circularLogoContainer,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#EFF6FF',
              },
            ]}
          >
            <Image
              source={require('../assets/logo_wefind.png')}
              style={styles.circularLogo}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.brandPill, { backgroundColor: colors.primaryLight, borderColor: isDark ? colors.cardBorder : '#DBEAFE' }]}>
            <MaterialIcons name="pets" size={13} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.brandPillText, { color: colors.primary }]}>REDE COLABORATIVA ANIMAL</Text>
          </View>

          <Text style={[styles.headline, { color: colors.text }]}>
            Reunindo pets e famílias com inteligência e comunidade.
          </Text>

          <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
            O WeFIND conecta quem perdeu e quem encontrou um animal, tornando a busca rápida, geolocalizada e acolhedora.
          </Text>

          {/* Quick Value Badges */}
          <View style={styles.valueBadgesRow}>
            <View style={[styles.valBadge, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#ECFDF5', borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#A7F3D0' }]}>
              <MaterialIcons name="check-circle" size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text style={[styles.valBadgeText, { color: isDark ? '#6EE7B7' : '#047857' }]}>100% Gratuito</Text>
            </View>
            <View style={[styles.valBadge, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : '#EFF6FF', borderColor: isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE' }]}>
              <MaterialIcons name="my-location" size={14} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={[styles.valBadgeText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>GPS em Tempo Real</Text>
            </View>
            <View style={[styles.valBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB', borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A' }]}>
              <MaterialIcons name="chat" size={14} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={[styles.valBadgeText, { color: isDark ? '#FDE68A' : '#B45309' }]}>WhatsApp Integrado</Text>
            </View>
          </View>
        </View>

        {/* BOTOES DE ACAO INICIAL PARA VISITANTES */}
        {!user && (
          <View style={styles.actionSectionTop}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleStart}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryButtonText}>Começar a Explorar</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.authButtonsRow}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={handleLoginDirect}
                activeOpacity={0.8}
              >
                <MaterialIcons name="login" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Entrar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={handleRegisterDirect}
                activeOpacity={0.8}
              >
                <MaterialIcons name="person-add" size={17} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Criar Conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STATS IMPACT HIGHLIGHTS */}
        <View style={styles.statsRow}>
          <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
              <MaterialIcons name="notifications-active" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>Ágil</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Alertas imediatos na vizinhança</Text>
          </View>

          <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' }]}>
              <MaterialIcons name="map" size={18} color="#2563EB" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>Interativo</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Radar de busca com raio personalizável</Text>
          </View>

          <View style={[styles.statTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.statIconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
              <MaterialIcons name="volunteer-activism" size={18} color="#10B981" />
            </View>
            <Text style={[styles.statNumber, { color: colors.text }]}>Solidário</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Comunidade ativa e sem custos</Text>
          </View>
        </View>

        {/* COMO FUNCIONA O WEFIND */}
        <View style={styles.howItWorksSection}>
          <View style={styles.howItWorksHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Como Funciona o WeFIND</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Três passos simples para encontrar ou ajudar um animal
            </Text>
          </View>

          {/* CARD 1: Crie seu anúncio */}
          <View style={[styles.wefindStepCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.wefindStepTopRow}>
              <View style={[styles.wefindStepTag, { backgroundColor: colors.primaryLight, borderColor: isDark ? colors.cardBorder : '#BFDBFE' }]}>
                <Text style={[styles.wefindStepTagText, { color: colors.primary }]}>PASSO 01</Text>
              </View>
              <Text style={[styles.wefindStepSubtitle, { color: colors.primary }]}>CADASTRO INTELIGENTE</Text>
            </View>
            <Text style={[styles.wefindStepTitle, { color: colors.text }]}>Publique o anúncio em 1 minuto</Text>

            {/* Showcase Visual */}
            <View
              style={[
                styles.wefindShowcaseBox,
                {
                  backgroundColor: isDark ? colors.innerCard : '#F8FAFC',
                  borderColor: isDark ? colors.cardBorder : '#E2E8F0',
                },
              ]}
            >
              <View style={[styles.miniCardMockup, { backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.cardBorder }]}>
                <View style={styles.miniCardHeader}>
                  <View style={[styles.miniStatusBadge, { backgroundColor: '#EF4444' }]}>
                    <Text style={styles.miniStatusBadgeText}>PERDIDO</Text>
                  </View>
                  <View style={[styles.miniSpeciesBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.miniSpeciesBadgeText, { color: colors.primary }]}>🐾 Cão • Labrador</Text>
                  </View>
                </View>
                <View style={styles.miniCardRow}>
                  <View style={[styles.miniPhotoBox, { backgroundColor: colors.primaryLight }]}>
                    <MaterialIcons name="photo-camera" size={24} color={colors.primary} />
                    <Text style={[styles.miniPhotoLabel, { color: colors.primary }]}>Fotos</Text>
                  </View>
                  <View style={styles.miniCardDetails}>
                    <Text style={[styles.miniCardPetName, { color: colors.text }]}>Paçoca</Text>
                    <Text style={[styles.miniCardLocationText, { color: colors.textSecondary }]}>📍 Praça Central, SP</Text>
                    <Text style={[styles.miniCardDateText, { color: colors.textMuted }]}>Hoje às 14:30</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.wefindFloatingPill, { top: 12, right: 12, backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7', borderColor: isDark ? '#D97706' : '#FDE68A' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#FCD34D' : '#B45309' }}>✨ Gera Cartaz</Text>
              </View>

              <View style={[styles.wefindFloatingPill, { bottom: 12, left: 12, backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7', borderColor: isDark ? '#22C55E' : '#BBF7D0' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#86EFAC' : '#15803D' }}>⚡ 100% Grátis</Text>
              </View>
            </View>

            <Text style={[styles.wefindStepDescription, { color: colors.textSecondary }]}>
              Adicione fotos, características e o último local visto. O aplicativo gera automaticamente um cartaz digital pronto para imprimir e compartilhar no WhatsApp e redes sociais.
            </Text>

            <TouchableOpacity
              style={[styles.wefindStepBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('RegisterItem')}
              activeOpacity={0.85}
            >
              <Text style={styles.wefindStepBtnText}>Publicar Anúncio de Animal</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* CARD 2: Mobilize no Mapa & Rede */}
          <View style={[styles.wefindStepCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.wefindStepTopRow}>
              <View style={[styles.wefindStepTag, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FFFBEB', borderColor: isDark ? '#D97706' : '#FDE68A' }]}>
                <Text style={[styles.wefindStepTagText, { color: isDark ? '#FCD34D' : '#D97706' }]}>PASSO 02</Text>
              </View>
              <Text style={[styles.wefindStepSubtitle, { color: isDark ? '#FCD34D' : '#D97706' }]}>RADAR DE BUSCA & GPS</Text>
            </View>
            <Text style={[styles.wefindStepTitle, { color: colors.text }]}>Mobilize no Mapa & WhatsApp</Text>

            <View
              style={[
                styles.wefindShowcaseBox,
                {
                  backgroundColor: isDark ? colors.innerCard : '#F0F9FF',
                  borderColor: isDark ? colors.cardBorder : '#BAE6FD',
                },
              ]}
            >
              <View style={styles.miniMapGrid}>
                <View style={[styles.miniMapRouteLine, { borderColor: colors.primary }]} />
                <View style={[styles.miniMapPinWrapper, { top: 16, left: 20 }]}>
                  <View style={[styles.miniMapPinCircle, { backgroundColor: '#EF4444' }]}>
                    <MaterialIcons name="place" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={styles.miniMapPinText}>Onde sumiu</Text>
                </View>
                <View style={[styles.miniMapPinWrapper, { bottom: 12, right: 22 }]}>
                  <View style={[styles.miniMapPinCircle, { backgroundColor: colors.primary }]}>
                    <MaterialIcons name="visibility" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.miniMapPinText, { color: colors.primary }]}>Pista com GPS</Text>
                </View>
              </View>

              <View style={[styles.wefindFloatingPill, { top: 10, right: 10, backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7', borderColor: isDark ? '#22C55E' : '#86EFAC' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#86EFAC' : '#166534' }}>💬 Alerta no WhatsApp</Text>
              </View>
            </View>

            <Text style={[styles.wefindStepDescription, { color: colors.textSecondary }]}>
              A comunidade e tutores próximos recebem avisos imediatos. Quem avistar o animal pode marcar novas coordenadas no mapa e enviar fotos de pistas com GPS.
            </Text>

            <TouchableOpacity
              style={[styles.wefindStepBtn, { backgroundColor: '#D97706' }]}
              onPress={handleGoToMap}
              activeOpacity={0.85}
            >
              <Text style={styles.wefindStepBtnText}>Explorar Mapa Interativo</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* CARD 3: Celebre o Reencontro */}
          <View style={[styles.wefindStepCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.wefindStepTopRow}>
              <View style={[styles.wefindStepTag, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ECFDF5', borderColor: isDark ? '#10B981' : '#A7F3D0' }]}>
                <Text style={[styles.wefindStepTagText, { color: isDark ? '#6EE7B7' : '#059669' }]}>PASSO 03</Text>
              </View>
              <Text style={[styles.wefindStepSubtitle, { color: isDark ? '#6EE7B7' : '#059669' }]}>CONEXÃO & REENCONTRO</Text>
            </View>
            <Text style={[styles.wefindStepTitle, { color: colors.text }]}>Converse e Celebre o Reencontro</Text>

            <View
              style={[
                styles.wefindShowcaseBox,
                {
                  backgroundColor: isDark ? colors.innerCard : '#F0FDF4',
                  borderColor: isDark ? colors.cardBorder : '#BBF7D0',
                },
              ]}
            >
              <View style={[styles.miniChatBubble, { alignSelf: 'flex-start', backgroundColor: isDark ? colors.card : '#FFFFFF', borderColor: colors.cardBorder }]}>
                <Text style={[styles.miniChatText, { color: colors.text }]}>💬 "Encontrei seu animalzinho! Ele está seguro comigo."</Text>
              </View>

              <View style={[styles.miniChatBubble, { alignSelf: 'flex-end', backgroundColor: '#059669', borderColor: '#047857', marginTop: 6 }]}>
                <Text style={[styles.miniChatText, { color: '#FFFFFF' }]}>"Que alívio! Já estou indo buscar! ❤️"</Text>
              </View>

              <View style={[styles.wefindFloatingPill, { bottom: 10, right: 12, backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7', borderColor: isDark ? '#D97706' : '#FDE68A' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#FCD34D' : '#B45309' }}>🎉 Reencontro Feliz</Text>
              </View>
            </View>

            <Text style={[styles.wefindStepDescription, { color: colors.textSecondary }]}>
              Converse diretamente em tempo real com quem encontrou o animal, combine a entrega com segurança e inspire outras pessoas compartilhando seu relato!
            </Text>

            <TouchableOpacity
              style={[styles.wefindStepBtn, { backgroundColor: '#059669' }]}
              onPress={() => navigation.navigate('MuralReencontros')}
              activeOpacity={0.85}
            >
              <Text style={styles.wefindStepBtnText}>Ver Mural de Reencontros</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* NOSSOS PILARES */}
        <View style={[styles.pillarsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.pillarsTitle, { color: colors.text }]}>Nossos Compromissos</Text>

          <View style={styles.pillarItem}>
            <View style={[styles.pillarIconBox, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' }]}>
              <MaterialIcons name="verified-user" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.pillarItemTitle, { color: colors.text }]}>Privacidade e Segurança</Text>
              <Text style={[styles.pillarItemDesc, { color: colors.textSecondary }]}>
                Seus dados de contato ficam resguardados e você controla o compartilhamento de mensagens.
              </Text>
            </View>
          </View>

          <View style={styles.pillarItem}>
            <View style={[styles.pillarIconBox, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : '#FDF2F8' }]}>
              <MaterialIcons name="favorite" size={20} color="#EC4899" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.pillarItemTitle, { color: colors.text }]}>Adoção Consciente</Text>
              <Text style={[styles.pillarItemDesc, { color: colors.textSecondary }]}>
                Espaço dedicado para divulgar pets que buscam um lar amoroso e responsável.
              </Text>
            </View>
          </View>

          <View style={[styles.pillarItem, { marginBottom: 0 }]}>
            <View style={[styles.pillarIconBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
              <MaterialIcons name="all-inclusive" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.pillarItemTitle, { color: colors.text }]}>100% Gratuito e Aberto</Text>
              <Text style={[styles.pillarItemDesc, { color: colors.textSecondary }]}>
                Uma plataforma construída para salvar vidas e conectar comunidades sem cobranças.
              </Text>
            </View>
          </View>
        </View>

        {/* Rodapé com Termos e Privacidade */}
        <View style={styles.footerSection}>
          <Text style={[styles.termsText, { color: colors.textMuted }]}>
            Ao continuar, você concorda com nossos{' '}
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
            .
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  circularLogoContainer: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 14,
  },
  circularLogo: {
    width: '100%',
    height: '100%',
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  brandPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subheadline: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 16,
  },
  valueBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  valBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  valBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionSectionTop: {
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statTile: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  howItWorksSection: {
    marginBottom: 20,
  },
  howItWorksHeaderRow: {
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12.5,
  },
  wefindStepCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  wefindStepTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  wefindStepTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  wefindStepTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  wefindStepSubtitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  wefindStepTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  wefindShowcaseBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    minHeight: 140,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 14,
    overflow: 'hidden',
  },
  miniCardMockup: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    width: '92%',
    alignSelf: 'center',
  },
  miniCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniStatusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  miniSpeciesBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniSpeciesBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  miniCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniPhotoBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  miniPhotoLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
  },
  miniCardDetails: {
    flex: 1,
  },
  miniCardPetName: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  miniCardLocationText: {
    fontSize: 11,
    marginTop: 1,
  },
  miniCardDateText: {
    fontSize: 10,
  },
  wefindFloatingPill: {
    position: 'absolute',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  miniMapGrid: {
    height: 110,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  miniMapRouteLine: {
    position: 'absolute',
    left: 40,
    right: 40,
    top: 50,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  miniMapPinWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  miniMapPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  miniMapPinText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B91C1C',
    marginTop: 2,
  },
  miniChatBubble: {
    maxWidth: '84%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  miniChatText: {
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  wefindStepDescription: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 14,
  },
  wefindStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  wefindStepBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pillarsCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  pillarsTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  pillarItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  pillarIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pillarItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  pillarItemDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  link: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default SobreScreen;
