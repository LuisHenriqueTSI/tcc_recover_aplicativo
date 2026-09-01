import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Share,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as itemsService from '../services/items';
import ShareCardFlyer from './ShareCardFlyer';
import { useTheme } from '../contexts/ThemeContext';
import COLORS from '../constants/theme';

const ShareFlyerModal = ({ visible, onClose, item, imageUrl }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const flyerRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  if (!item) return null;

  const getShareTextMessage = () => {
    const isAdoption = Boolean(
      item.extra_fields?.is_direct_adoption ||
      item.status === 'adoption' ||
      (item.status === 'found' && (item.extra_fields?.available_for_adoption || itemsService.isPetAvailableForAdoption(item)))
    );

    const status = isAdoption
      ? '🤍 PARA ADOÇÃO'
      : (item.status === 'found' ? '🔍 ENCONTRADO' : '❗ PERDIDO');

    const locationLabel = isAdoption ? '📍 Onde está' : '📍 Local';
    const location = [item.street, item.neighborhood, item.city, item.state].filter(Boolean).join(' - ') || 'Não especificado';
    const rawDate = String(item.date || '');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? new Date(`${rawDate}T12:00:00`) : new Date(rawDate);
    const formattedDate = item.date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('pt-BR') : 'Não informada';
    const phone = item.profiles?.whatsapp || item.profiles?.phone || item.contact_phone || '';
    const phoneInfo = phone ? `\n📞 Contato: ${phone}` : '';
    
    const details = [
      item.species || item.extra_fields?.species ? `🐾 ${item.species || item.extra_fields?.species}` : '',
      item.breed || item.extra_fields?.breed ? `🏷️ ${item.breed || item.extra_fields?.breed}` : '',
      item.gender || item.extra_fields?.gender ? `⚧ ${item.gender || item.extra_fields?.gender}` : '',
      item.age || item.extra_fields?.age ? `🎂 ${item.age || item.extra_fields?.age}` : '',
      item.size || item.extra_fields?.size ? `📏 ${item.size || item.extra_fields?.size}` : '',
      item.color || item.extra_fields?.color ? `🎨 ${item.color || item.extra_fields?.color}` : '',
    ].filter(Boolean).join(' | ');

    const detailsLine = details ? `\n${details}\n` : '';
    const headerTitle = isAdoption ? 'ADOÇÃO RESPONSÁVEL' : 'AJUDE A ENCONTRAR';
    const callToAction = isAdoption
      ? 'Interessado em adotar? Entre em contato e compartilhe!'
      : 'Por favor, compartilhe!';

    return `🐾 *WeFIND - ${headerTitle}*\n\n${status}: *${item.title || 'Animal'}*${detailsLine}\n${locationLabel}: ${location}\n📅 Data: ${formattedDate}${phoneInfo}\n\n"${item.description || ''}"\n\n${callToAction}`;
  };

  const handleShareImage = async () => {
    if (capturing) return;
    try {
      setCapturing(true);

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (!isSharingAvailable) {
        Alert.alert(
          'Compartilhamento de imagem',
          'O compartilhamento de arquivos não está disponível neste ambiente. Compartilhando em formato de texto...'
        );
        await handleShareText();
        setCapturing(false);
        return;
      }

      // Captura a imagem em alta resolução
      const uri = await captureRef(flyerRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      console.log('[ShareFlyerModal] Imagem capturada com sucesso:', uri);

      // Abre a folha nativa de compartilhamento
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Compartilhar Cartaz - ${item.title || 'Animal'}`,
        UTI: 'public.png',
      });
    } catch (error) {
      console.error('[ShareFlyerModal] Erro ao compartilhar imagem:', error);
      Alert.alert('Erro ao compartilhar', 'Não foi possível gerar a imagem: ' + (error.message || 'Tente novamente.'));
    } finally {
      setCapturing(false);
    }
  };

  const handleShareText = async () => {
    try {
      const message = getShareTextMessage();
      await Share.share({ message });
    } catch (error) {
      console.error('[ShareFlyerModal] Erro ao compartilhar texto:', error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {/* Cabeçalho do Modal */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="share" size={22} color={colors.primary} />
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Compartilhar Cartaz</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: isDark ? '#1E293B' : '#F3F4F6' }]}>
              <MaterialIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Pré-visualização com rolagem do cartaz */}
          <ScrollView
            style={styles.previewScrollView}
            contentContainerStyle={styles.previewScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.previewNotice, { color: colors.textSecondary }]}>
              Prévia do cartaz que será gerado e enviado:
            </Text>
            <View style={styles.flyerWrapper}>
              <ShareCardFlyer ref={flyerRef} item={item} imageUrl={imageUrl} />
            </View>
          </ScrollView>

          {/* Botão de Ação Inferior */}
          <View style={[styles.actionsContainer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={[styles.primaryShareBtn, { backgroundColor: colors.primary }, capturing && styles.btnDisabled]}
              onPress={handleShareImage}
              disabled={capturing}
              activeOpacity={0.85}
            >
              {capturing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.primaryShareBtnText}>Gerando imagem...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="share" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryShareBtnText}>Compartilhar Cartaz</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  previewScrollView: {
    paddingHorizontal: 16,
    maxHeight: 460,
  },
  previewScrollContent: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  previewNotice: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  flyerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryShareBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryShareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryShareBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryShareBtnText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});

export default ShareFlyerModal;
