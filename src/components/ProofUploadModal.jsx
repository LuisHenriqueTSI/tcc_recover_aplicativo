import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { submitOwnershipProof } from '../services/proofVerification';

export default function ProofUploadModal({
  visible,
  onClose,
  item,
  userId,
  onSuccess,
}) {
  const { colors, isDark } = useTheme();
  const [message, setMessage] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso às fotos para anexar a comprovação.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos((prev) => [...prev, result.assets[0]]);
      }
    } catch (err) {
      console.warn('[ProofUploadModal] Erro ao selecionar foto:', err.message);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar a foto de comprovação.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos((prev) => [...prev, result.assets[0]]);
      }
    } catch (err) {
      console.warn('[ProofUploadModal] Erro ao abrir câmera:', err.message);
      Alert.alert('Erro', 'Não foi possível abrir a câmera.');
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!item?.id || !userId) {
      Alert.alert('Erro', 'Informações incompletas para envio da comprovação.');
      return;
    }

    if (!message.trim()) {
      Alert.alert(
        'Descrição necessária',
        'Por favor, descreva como comprova ser o tutor (ex: marcas singulares, histórico, hábitos do animal ou carteira de vacinação).'
      );
      return;
    }

    setLoading(true);
    try {
      await submitOwnershipProof({
        itemId: item.id,
        claimantId: userId,
        message: message.trim(),
        proofPhotos: photos,
        itemTitle: item.title || item.species || 'o animal',
        finderId: item.owner_id,
      });

      Alert.alert(
        'Comprovação Enviada com Sucesso! 🛡️',
        'Sua solicitação foi enviada para análise. Assim que a comprovação for verificada pela moderação, o endereço exato e a rota completa serão liberados para você!',
        [
          {
            text: 'Entendido',
            onPress: () => {
              setMessage('');
              setPhotos([]);
              onSuccess?.();
              onClose?.();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Erro ao enviar', err.message || 'Não foi possível concluir o envio da comprovação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            <View
              style={[
                styles.container,
                {
                  backgroundColor: colors.surface || (isDark ? '#1E293B' : '#FFFFFF'),
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF' }]}>
                  <MaterialIcons name="verified-user" size={24} color="#2563EB" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    Comprovação de Tutor
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Liberação Segura do Endereço
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  disabled={loading}
                  accessibilityLabel="Fechar"
                >
                  <MaterialIcons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {/* Banner de Segurança & Reassurance */}
                <View
                  style={[
                    styles.securityNotice,
                    {
                      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.12)' : '#ECFDF5',
                      borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0',
                    },
                  ]}
                >
                  <MaterialIcons name="security" size={20} color="#059669" style={{ marginTop: 2 }} />
                  <Text style={[styles.securityNoticeText, { color: isDark ? '#D1FAE5' : '#065F46' }]}>
                    Para proteger a integridade do animal e a segurança da família acolhedora, o endereço exato só é liberado após a comprovação de tutela com fotos anteriores ou documentos.
                  </Text>
                </View>

                {/* Descrição / Justificativa */}
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Como você comprova ser o tutor? <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  placeholder="Ex: 'Sou o tutor do pet. Ele atende pelo nome de Bob, tem uma manchinha branca na pata esquerda traseira e estou anexando fotos nossas e da carteirinha de vacinação.'"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  editable={!loading}
                />

                {/* Anexos de Fotos */}
                <View style={styles.photoSectionHeader}>
                  <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 0 }]}>
                    Fotos de Comprovação (Opcional, mas recomendado)
                  </Text>
                </View>

                {/* Botões para selecionar foto */}
                <View style={styles.photoPickersRow}>
                  <TouchableOpacity
                    style={[
                      styles.photoPickerBtn,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={handlePickImage}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.photoPickerBtnText, { color: colors.primary }]}>Galeria</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.photoPickerBtn,
                      {
                        backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={handleTakePhoto}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.photoPickerBtnText, { color: colors.primary }]}>Tirar Foto</Text>
                  </TouchableOpacity>
                </View>

                {/* Lista de Fotos Selecionadas */}
                {photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                    {photos.map((p, idx) => (
                      <View key={idx} style={styles.photoThumbWrap}>
                        <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                        <TouchableOpacity
                          style={styles.removePhotoBtn}
                          onPress={() => handleRemovePhoto(idx)}
                          disabled={loading}
                        >
                          <MaterialIcons name="close" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </ScrollView>

              {/* Botões de Ação */}
              <View style={[styles.actionButtonsRow, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                    },
                  ]}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity: loading ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  ) : (
                    <MaterialIcons name="send" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.submitBtnText}>
                    {loading ? 'Enviando...' : 'Enviar Comprovação'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
  },
  container: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  securityNotice: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  photoSectionHeader: {
    marginBottom: 8,
  },
  photoPickersRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  photoPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  photoPickerBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  photoList: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  photoThumbWrap: {
    position: 'relative',
    marginRight: 10,
  },
  photoThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 6,
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
