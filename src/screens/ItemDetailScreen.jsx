import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  Modal,
  TextInput,
  Dimensions,
  Linking,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, FontAwesome, Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import * as itemsService from '../services/items';
import { formatarDataMembro } from './_dateUtils';

import ShareButton from '../components/ShareButton';
import ShareFlyerModal from '../components/ShareFlyerModal';
import COLORS from '../constants/theme';

import SightingModal from '../components/SightingModal';
import ProofUploadModal from '../components/ProofUploadModal';
import * as sightingsService from '../services/sightings';
import { getRenewalInfo } from '../services/itemExpiration';
import { createRenewalReminderNotification } from '../services/notifications';
import * as reportsService from '../services/reports';
import { getVerificationStatus } from '../services/proofVerification';
import * as Location from 'expo-location';

const formatItemDate = (value) => {
  if (!value) return '';
  const raw = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatCityState = (item) => {
  const city = (item?.city || item?.extra_fields?.location_details?.city || '').trim();
  const state = (item?.state || item?.extra_fields?.location_details?.state || '').trim();
  const parts = [city, state].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' - ');
  }
  return item?.neighborhood || item?.extra_fields?.location_details?.district || 'Localização não informada';
};

const formatStreetNumberNeighborhood = (item, isAuthorized = false) => {
  const isLost = item?.status === 'lost';
  const isFoundHome = item?.status === 'found' && item?.extra_fields?.found_custody !== 'spotted';
  const isSpotted = item?.extra_fields?.found_custody === 'spotted';
  const details = item?.extra_fields?.location_details;
  const district = (details?.district || item?.neighborhood || '').trim();

  // 1. ANIMAL PERDIDO: Exibe como Região de Desaparecimento (sem expor o número da casa do tutor)
  if (isLost) {
    const reference = (details?.reference || details?.street || item?.street || '').trim();
    if (reference && district && reference !== district) {
      return `Região de ${district} • Proximidades: ${reference}`;
    }
    if (district) {
      return `Região do Bairro ${district}`;
    }
    return 'Região de Desaparecimento informada pelo tutor';
  }

  // 2. ANIMAL ACOLHIDO (Lar / Custódia Provisória): Protege a casa do acolhedor
  if (isFoundHome && !isAuthorized) {
    return district ? `Região do Bairro ${district} (Endereço protegido)` : 'Região de Acolhimento (Endereço protegido)';
  }

  // 3. ANIMAL VISTO NA RUA / AUTORIZADO: Exibe endereço completo da via pública
  const street = (details?.street || item?.street || '').trim();
  const number = (details?.number || item?.house_number || '').trim();

  const streetPart = street && number ? `${street}, ${number}` : street || (number ? `Nº ${number}` : '');
  const parts = [streetPart, district].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  const rawText = (details?.text || item?.address || '').trim();
  if (rawText) {
    return rawText;
  }

  return district || '';
};

const ItemDetailScreen = ({ route, navigation }) => {
  const { itemId } = route.params;
  const { user, userProfile, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const [item, setItem] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [owner, setOwner] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [sightings, setSightings] = useState([]);
  const [sightingModalVisible, setSightingModalVisible] = useState(false);
  const [sightingLoading, setSightingLoading] = useState(false);
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [verificationState, setVerificationState] = useState({ status: null, claim: null });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentObj, setEditCommentObj] = useState(null);
  const [editCommentLocation, setEditCommentLocation] = useState('');
  const [editCommentInstagram, setEditCommentInstagram] = useState('');
  const [editCommentWhatsapp, setEditCommentWhatsapp] = useState('');
  const [editCommentFacebook, setEditCommentFacebook] = useState('');
  const [editCommentPhotoUrl, setEditCommentPhotoUrl] = useState('');
  const [editUploading, setEditUploading] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [togglingAdoption, setTogglingAdoption] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [fullScreenPhotoModal, setFullScreenPhotoModal] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const [shareFlyerVisible, setShareFlyerVisible] = useState(false);
  const [expandedAdoptionInfo, setExpandedAdoptionInfo] = useState(false);
  const [expandedCustodyInfo, setExpandedCustodyInfo] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  const handleSafeGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainApp');
    }
  }, [navigation]);

  useEffect(() => {
    navigation.setOptions({
      title: 'Detalhes',
      headerStyle: {
        backgroundColor: colors.headerBg || colors.primary,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
        color: '#fff',
        fontSize: 18,
      },
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleSafeGoBack}
          style={styles.navBackBtn}
          accessibilityLabel="Voltar"
          activeOpacity={0.75}
        >
          <MaterialIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSafeGoBack, colors.headerBg]);

  useFocusEffect(
    useCallback(() => {
      loadItemDetails();
      loadSightings();
      loadVerification();
    }, [itemId, user?.id])
  );

  const loadVerification = async () => {
    if (!itemId || !user?.id) return;
    try {
      const res = await getVerificationStatus(itemId, user.id);
      setVerificationState(res || { status: null, claim: null });
    } catch (e) {
      console.log('[ItemDetailScreen] Erro ao buscar status de verificação:', e.message);
    }
  };

  const loadSightings = async () => {
    try {
      const data = await sightingsService.getSightings(itemId);
      setSightings(data || []);
    } catch (e) {
      setSightings([]);
    }
  };

  const loadItemDetails = async () => {
    try {
      setLoading(true);
      const itemData = await itemsService.getItemDetails(itemId);
      if (itemData) {
        setItem(itemData);
        if (user && itemData.owner_id === user.id) {
          const renewalInfo = getRenewalInfo(itemData);
          if (renewalInfo.needsRenewal) {
            await createRenewalReminderNotification(itemData, user.id);
          }
        }
        setPhotos(itemData.item_photos || []);
        setOwner(itemData.profiles);
        setRewards(itemData.rewards || []);
      } else {
        Alert.alert('Erro', 'Pet não encontrado');
        handleSafeGoBack();
      }
    } catch (error) {
      console.error('[ItemDetailScreen] Erro ao carregar:', error);
      Alert.alert('Erro', 'Falha ao carregar detalhes do pet');
      handleSafeGoBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = () => {
    if (!item) return;
    navigation.navigate('RegisterItem', {
      editItem: item,
      modo: 'editar',
    });
  };

  const renewalInfo = item ? getRenewalInfo(item) : { canRenew: false, daysRemaining: 0, expired: false };

  const handleDeleteItem = () => {
    Alert.alert(
      isAdmin && !isOwner ? 'Excluir Publicação (Admin)' : 'Excluir Publicação',
      isAdmin && !isOwner
        ? 'Como Administrador, você está prestes a excluir esta publicação de outro usuário permanentemente do banco de dados.'
        : 'Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await itemsService.deleteItem(itemId, { actorId: user?.id, actorIsAdmin: isAdmin });
              Alert.alert('Sucesso', 'Publicação excluída com sucesso!');
              handleSafeGoBack();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir publicação: ' + error.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleAdminChangeStatus = (newStatus, isAdoption = false) => {
    const statusTitles = {
      lost: 'Perdido',
      found: 'Encontrado',
      resolved: 'Reencontrado / Resolvido',
    };
    const targetLabel = isAdoption ? 'Disponível para Adoção' : (statusTitles[newStatus] || newStatus);

    Alert.alert(
      'Alterar Status (Moderação Admin)',
      `Deseja forçar a alteração do status desta publicação para "${targetLabel}" no banco de dados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const updatedFields = {
                ...(item.extra_fields || {}),
                available_for_adoption: isAdoption,
                is_direct_adoption: isAdoption,
              };
              await itemsService.updateItem(item.id, {
                status: newStatus,
                extra_fields: updatedFields,
              });
              setItem((prev) => ({
                ...prev,
                status: newStatus,
                extra_fields: updatedFields,
              }));
              Alert.alert('Sucesso', `Status alterado para "${targetLabel}" com sucesso!`);
            } catch (err) {
              Alert.alert('Erro', 'Falha ao alterar status: ' + (err.message || 'Erro desconhecido'));
            }
          },
        },
      ]
    );
  };

  const handleRenewItem = async () => {
    if (!item) return;
    setRenewing(true);
    try {
      await itemsService.renewItem(item.id);
      await loadItemDetails();
      Alert.alert('Sucesso', 'Publicação renovada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível renovar a publicação: ' + error.message);
    } finally {
      setRenewing(false);
    }
  };

  const handleEditComment = (comment) => {
    setEditCommentObj(comment);
    setEditCommentText(comment.description || '');
    setEditCommentLocation(comment.location || '');
    setEditCommentInstagram((comment.contact_info && comment.contact_info.instagram) || '');
    setEditCommentWhatsapp((comment.contact_info && comment.contact_info.whatsapp) || '');
    setEditCommentFacebook((comment.contact_info && comment.contact_info.facebook) || '');
    setEditCommentPhotoUrl(comment.photo_url || '');
    setEditModalVisible(true);
  };

  const handleSaveEditComment = async () => {
    if (!editCommentObj || !editCommentText.trim()) {
      setEditModalVisible(false);
      return;
    }
    let photoUrlToSave = editCommentPhotoUrl;
    const isLocalPhoto = photoUrlToSave && photoUrlToSave.startsWith('file:///');
    if (isLocalPhoto && photoUrlToSave !== editCommentObj.photo_url) {
      try {
        if (sightingsService.uploadSightingPhoto) {
          const uploadedUrl = await sightingsService.uploadSightingPhoto(editCommentObj.id, photoUrlToSave);
          if (uploadedUrl && !uploadedUrl.startsWith('file:///')) {
            photoUrlToSave = uploadedUrl;
          } else {
            photoUrlToSave = editCommentObj.photo_url;
          }
        }
      } catch (err) {
        photoUrlToSave = editCommentObj.photo_url;
      }
    }

    try {
      await sightingsService.updateSighting(editCommentObj.id, {
        description: editCommentText.trim(),
        location: editCommentLocation.trim(),
        contact_info: {
          instagram: editCommentInstagram.trim(),
          whatsapp: editCommentWhatsapp.trim(),
          facebook: editCommentFacebook.trim(),
        },
        photo_url: photoUrlToSave,
      });
      setEditModalVisible(false);
      loadSightings();
      Alert.alert('Sucesso', 'Comentário atualizado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar comentário: ' + error.message);
    }
  };

  const handleCancelEditComment = () => {
    setEditModalVisible(false);
    setEditCommentObj(null);
    setEditCommentText('');
    setEditCommentLocation('');
    setEditCommentInstagram('');
    setEditCommentWhatsapp('');
    setEditCommentFacebook('');
    setEditCommentPhotoUrl('');
  };

  const handleSendMessage = () => {
    if (!user) {
      Alert.alert(
        'Login necessário',
        'Entre ou crie uma conta para enviar mensagens ao tutor.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Entrar', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    if (!item) return;

    if (user.id === item.owner_id) {
      Alert.alert('Aviso', 'Você é o autor desta publicação.');
      return;
    }

    navigation.navigate('ChatScreen', {
      conversation: {
        otherId: item.owner_id,
        itemId: itemId,
        otherName: owner?.name || 'Tutor',
        avatarUrl: owner?.avatar_url || null,
        itemTitle: item.title || item.species || 'Animal',
        itemStatus: item.status,
        itemOwnerId: item.owner_id,
      },
    });
  };

  const handleOfferFoster = () => {
    if (!user) {
      Alert.alert(
        'Login necessário',
        'Entre ou crie uma conta para oferecer lar temporário para este animal.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Entrar', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (isOwner) {
      Alert.alert('Aviso', 'Você é o autor desta publicação.');
      return;
    }

    const title = item.title || item.species || 'este pet';
    const initialMessage = `Olá! Vi a publicação de ${title} no WeFIND e tenho disponibilidade para ser Lar Temporário dele(a) até encontrarmos o tutor ou um lar definitivo! 🏡🐾`;

    navigation.navigate('ChatScreen', {
      conversation: {
        otherId: item.owner_id,
        itemId: itemId,
        otherName: owner?.name || 'Tutor',
        avatarUrl: owner?.avatar_url || null,
        itemTitle: item.title || item.species || 'Animal',
        initialMessage,
      },
    });
  };

  const handleReportSighting = () => {
    if (!user) {
      Alert.alert(
        'Login necessário',
        'Entre ou crie uma conta para adicionar uma informação ou comentário.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Entrar', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    setSightingModalVisible(true);
  };

  const handleToggleAdoption = async () => {
    const isCurrentlyAdoption = Boolean(item?.extra_fields?.available_for_adoption);
    const waitingDays = itemsService.getAdoptionWaitingDays(item);

    if (!isCurrentlyAdoption && waitingDays > 0) {
      Alert.alert(
        'Período Prioritário de Busca',
        `Este animal foi encontrado na rua e está no período de busca pelo tutor. Faltam ${waitingDays} dia(s) para liberação oficial. Deseja liberar a adoção agora?`,
        [
          { text: 'Aguardar Prazo', style: 'cancel' },
          {
            text: 'Liberar Adoção',
            onPress: () => confirmAdoptionChange(false),
          },
        ]
      );
      return;
    }

    Alert.alert(
      isCurrentlyAdoption ? 'Pausar Adoção' : 'Disponibilizar para Adoção',
      isCurrentlyAdoption
        ? 'Deseja remover este pet da listagem de adoção?'
        : 'Ao disponibilizar para adoção responsável, outros membros poderão entrar em contato para adotá-lo. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isCurrentlyAdoption ? 'Remover' : 'Disponibilizar',
          onPress: () => confirmAdoptionChange(isCurrentlyAdoption),
        },
      ]
    );
  };

  const confirmAdoptionChange = async (isCurrentlyAdoption) => {
    setTogglingAdoption(true);
    try {
      await itemsService.toggleItemAdoption(
        item.id,
        item.extra_fields,
        !isCurrentlyAdoption
      );
      setItem((prev) => ({
        ...prev,
        extra_fields: {
          ...(prev?.extra_fields || {}),
          available_for_adoption: !isCurrentlyAdoption,
        },
      }));
      Alert.alert(
        'Sucesso',
        !isCurrentlyAdoption
          ? 'Pet disponibilizado para adoção responsável com sucesso!'
          : 'Pet removido da listagem de adoção.'
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o status de adoção.');
    } finally {
      setTogglingAdoption(false);
    }
  };

  const handleOpenReport = () => {
    if (!user) {
      Alert.alert(
        'Login necessário',
        'Entre ou crie uma conta para denunciar uma publicação.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Entrar', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    setReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!user) {
      Alert.alert('Login necessário', 'Entre na sua conta para denunciar uma publicação.');
      setReportModalVisible(false);
      navigation.navigate('Login');
      return;
    }
    if (!reportReason) {
      Alert.alert('Motivo necessário', 'Selecione o motivo da denúncia.');
      return;
    }

    setReporting(true);
    try {
      await reportsService.createReport({
        itemId: item.id,
        reporterId: user.id,
        reason: reportReason,
        details: reportDetails,
      });
      setReportModalVisible(false);
      setReportReason('');
      setReportDetails('');
      Alert.alert('Denúncia enviada', 'A equipe administrativa analisará esta publicação com prioridade.');
    } catch (error) {
      Alert.alert('Não foi possível denunciar', error.message || 'Tente novamente.');
    } finally {
      setReporting(false);
    }
  };

  const handleSubmitSighting = async (form) => {
    setSightingLoading(true);
    try {
      await sightingsService.createSighting({
        item_id: itemId,
        user_id: user.id,
        location: form.location,
        description: form.description,
        contact_info: form.contact_info,
        photo_url: form.photo_url,
      });
      setSightingModalVisible(false);
      loadSightings();

      if (item?.owner_id) {
        try {
          const { createNotification } = require('../services/notifications');
          const commenterName = userProfile?.name || user?.user_metadata?.name || 'Um membro da comunidade';

          let mapsLink = '';
          if (form.coordinate?.latitude && form.coordinate?.longitude) {
            mapsLink = `https://www.google.com/maps/search/?api=1&query=${form.coordinate.latitude},${form.coordinate.longitude}`;
          } else if (form.location) {
            mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.location)}`;
          }

          let notificationMessage = `${commenterName} compartilhou uma nova informação sobre o pet em: ${form.location || 'Local informado'}.\n\nDetalhes: "${form.description || ''}"`;
          if (mapsLink) {
            notificationMessage += `\n\n📍 *Ver localização no Google Maps:*\n${mapsLink}`;
          }

          await createNotification({
            user_id: item.owner_id,
            type: 'sighting',
            title: `🐾 Nova pista sobre ${item.title || 'seu pet'}!`,
            message: notificationMessage,
            item_id: item.id,
          });
        } catch (notifErr) {
          console.error('[ItemDetailScreen] Falha ao enviar notificação de informação:', notifErr);
        }
      }

      Alert.alert('Sucesso', 'Informações compartilhadas com sucesso!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível enviar as informações.');
    } finally {
      setSightingLoading(false);
    }
  };

  const handleDeleteComment = (comment) => {
    const isCommentAuthor = user && comment.user_id === user.id;
    Alert.alert(
      isAdmin && !isCommentAuthor ? 'Excluir comentário (Admin)' : 'Excluir comentário',
      isAdmin && !isCommentAuthor
        ? 'Como Administrador, você está prestes a excluir este comentário permanentemente.'
        : 'Tem certeza que deseja excluir este comentário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setSightings((prev) => prev.filter((c) => String(c.id) !== String(comment.id)));
              await sightingsService.deleteSighting(comment.id);
              Alert.alert('Sucesso', 'Comentário excluído com sucesso.');
            } catch (error) {
              console.error('Falha ao excluir comentário:', error);
              Alert.alert('Erro', 'Não foi possível excluir o comentário.');
              loadSightings();
            }
          },
        },
      ]
    );
  };

  const isOwner = user && item && item.owner_id === user.id;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Carregando detalhes...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <MaterialIcons name="pets" size={54} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.text }]}>Animal não encontrado</Text>
      </View>
    );
  }

  const handleOpenRoute = async () => {
    if (!item) return;

    let lat = item.latitude || item.extra_fields?.location_details?.latitude;
    let lng = item.longitude || item.extra_fields?.location_details?.longitude;

    if (!lat || !lng) {
      try {
        const query = [
          item.street,
          item.neighborhood,
          item.city,
          item.state,
          'Brasil',
        ].filter(Boolean).join(', ');

        if (query) {
          const results = await Location.geocodeAsync(query);
          if (results && results.length > 0) {
            lat = results[0].latitude;
            lng = results[0].longitude;
          }
        }
      } catch (err) {
        console.log('[ItemDetailScreen] Erro no geocoding:', err);
      }
    }

    if (!lat || !lng) {
      Alert.alert(
        'Localização indisponível',
        'Não foi possível encontrar as coordenadas exatas deste animal para traçar a rota.'
      );
      return;
    }

    // Abre diretamente o Mapa do WeFIND traçando a rota até o animal
    try {
      navigation.navigate('MainApp', {
        screen: 'MapTab',
        params: {
          focusItemId: item.id,
          showRoute: true,
          targetCoords: { latitude: Number(lat), longitude: Number(lng) },
        },
      });
    } catch (e) {
      navigation.navigate('Map', {
        focusItemId: item.id,
        showRoute: true,
        targetCoords: { latitude: Number(lat), longitude: Number(lng) },
      });
    }
  };

  const isAdoption = Boolean(item.extra_fields?.is_direct_adoption || itemsService.isPetAvailableForAdoption(item));
  const isFound = item.status === 'found' && !isAdoption;

  return (
    <ScrollView style={[styles.detailPage, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* 1. HERO PHOTO SHOWCASE */}
      <View style={styles.heroContainer}>
        {photos && photos.length > 0 ? (
          <View style={{ width: '100%', height: 320, position: 'relative' }}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                setActivePhotoIndex(newIndex);
              }}
              style={{ width: screenWidth, height: 320 }}
            >
              {photos.map((photo, idx) => (
                <TouchableOpacity
                  key={photo.id || idx}
                  activeOpacity={0.95}
                  onPress={() => {
                    setFullScreenIndex(idx);
                    setFullScreenPhotoModal(true);
                  }}
                  style={{ width: screenWidth, height: 320 }}
                >
                  <Image
                    source={{ uri: photo.url }}
                    style={styles.heroImageItem}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Contador de fotos (Glassmorphism) */}
            {photos.length > 1 && (
              <View style={styles.photoCountBadge}>
                <Feather name="image" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.photoCountText}>
                  {activePhotoIndex + 1} / {photos.length}
                </Text>
              </View>
            )}

            {/* Botão de Zoom */}
            <TouchableOpacity
              onPress={() => {
                setFullScreenIndex(activePhotoIndex);
                setFullScreenPhotoModal(true);
              }}
              style={styles.zoomButton}
              activeOpacity={0.8}
            >
              <MaterialIcons name="zoom-in" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Barra de Paginação Flutuante */}
            {photos.length > 1 && (
              <View style={styles.paginationRow}>
                {photos.map((_, dotIndex) => (
                  <View
                    key={dotIndex}
                    style={[
                      styles.paginationDot,
                      activePhotoIndex === dotIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.noPhotoHero, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <MaterialIcons name="pets" size={54} color={colors.textMuted} />
            <Text style={[styles.noPhotoText, { color: colors.textMuted }]}>Sem fotos cadastradas</Text>
          </View>
        )}

        {/* Botão Flutuante de Compartilhamento Rápido */}
        <View style={styles.floatingShareBtn}>
          <ShareButton item={item} imageUrl={photos?.[0]?.url} />
        </View>
      </View>

      {/* 2. CABEÇALHO PRINCIPAL DO PET: STATUS + ATRIBUTOS */}
      <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Status Pill */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              isAdoption
                ? styles.adoptionPill
                : isFound
                ? styles.foundPill
                : styles.lostPill,
            ]}
          >
            <Ionicons
              name={isAdoption ? 'heart' : isFound ? 'checkmark-circle' : 'alert-circle'}
              size={15}
              color={isAdoption ? '#BE185D' : isFound ? '#1E3E24' : '#C2410C'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: isAdoption ? '#BE185D' : isFound ? '#1E3E24' : '#C2410C' },
              ]}
            >
              {isAdoption ? 'Para Adoção Responsável' : isFound ? 'Animal Encontrado' : 'Animal Perdido'}
            </Text>
          </View>
        </View>

        {/* Título do Pet */}
        <Text style={[styles.petMainTitle, { color: colors.text }]}>{item.title || 'Sem nome informado'}</Text>

        {/* Grid de Chips de Atributos */}
        <View style={styles.attributeGrid}>
          {(item.species || item.extra_fields?.species) ? (
            <View style={[styles.attrChip, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={styles.attrChipEmoji}>🐾</Text>
              <View style={styles.attrChipTextWrap}>
                <Text style={[styles.attrChipLabel, { color: colors.textMuted }]}>Espécie</Text>
                <Text style={[styles.attrChipValue, { color: colors.text }]} numberOfLines={1}>{item.species || item.extra_fields?.species}</Text>
              </View>
            </View>
          ) : null}

          {(() => {
            const rawBreed = item.breed || item.extra_fields?.breed || '';
            const isBreedUnknown = !rawBreed ||
              /^(não informado|não informada|nao informado|nao informada|sem raça definida|sem raca definida|sem raça|sem raca|srd|desconhecido|desconhecida|outra|outro)$/i.test(rawBreed.trim());
            if (isBreedUnknown) return null;
            return (
              <View style={[styles.attrChip, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                <Text style={styles.attrChipEmoji}>🏷️</Text>
                <View style={styles.attrChipTextWrap}>
                  <Text style={[styles.attrChipLabel, { color: colors.textMuted }]}>Raça</Text>
                  <Text style={[styles.attrChipValue, { color: colors.text }]} numberOfLines={1}>{rawBreed}</Text>
                </View>
              </View>
            );
          })()}

          {(item.gender || item.extra_fields?.gender) && (item.gender || item.extra_fields?.gender) !== 'Não informado' ? (
            <View style={[styles.attrChip, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={styles.attrChipEmoji}>
                {String(item.gender || item.extra_fields?.gender).toLowerCase().includes('f') ? '♀️' : '♂️'}
              </Text>
              <View style={styles.attrChipTextWrap}>
                <Text style={[styles.attrChipLabel, { color: colors.textMuted }]}>Sexo</Text>
                <Text style={[styles.attrChipValue, { color: colors.text }]} numberOfLines={1}>{item.gender || item.extra_fields?.gender}</Text>
              </View>
            </View>
          ) : null}

          {(item.age || item.extra_fields?.age) && (item.age || item.extra_fields?.age) !== 'Não informado' ? (
            <View style={[styles.attrChip, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={styles.attrChipEmoji}>🎂</Text>
              <View style={styles.attrChipTextWrap}>
                <Text style={[styles.attrChipLabel, { color: colors.textMuted }]}>Idade</Text>
                <Text style={[styles.attrChipValue, { color: colors.text }]} numberOfLines={1}>{item.age || item.extra_fields?.age}</Text>
              </View>
            </View>
          ) : null}

          {(item.size || item.extra_fields?.size) && (item.size || item.extra_fields?.size) !== 'Não informado' ? (
            <View style={[styles.attrChip, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={styles.attrChipEmoji}>📏</Text>
              <View style={styles.attrChipTextWrap}>
                <Text style={[styles.attrChipLabel, { color: colors.textMuted }]}>Porte</Text>
                <Text style={[styles.attrChipValue, { color: colors.text }]} numberOfLines={1}>{item.size || item.extra_fields?.size}</Text>
              </View>
            </View>
          ) : null}

          {(item.color || item.extra_fields?.color) && (
            <View style={[styles.attrChip, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
              <Text style={styles.attrChipEmoji}>🎨</Text>
              <View style={styles.attrChipTextWrap}>
                <Text style={[styles.attrChipLabel, { color: colors.textMuted }]}>Cor</Text>
                <Text style={[styles.attrChipValue, { color: colors.text }]} numberOfLines={1}>{item.color || item.extra_fields?.color}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Descrição Detalhada */}
        {item.description ? (
          <View style={[styles.descriptionBlock, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Descrição & Características</Text>
            <Text style={[styles.descriptionText, { color: colors.text }]}>{item.description}</Text>
          </View>
        ) : null}

        {/* Personalidade & Cuidados do Pet */}
        {Array.isArray(item.extra_fields?.temperament) && item.extra_fields.temperament.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted, marginBottom: 8 }]}>
              Personalidade & Cuidados
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {item.extra_fields.temperament.map((trait, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDark ? 'rgba(219, 39, 119, 0.15)' : '#FDF2F8',
                    borderColor: isDark ? 'rgba(219, 39, 119, 0.35)' : '#FBCFE8',
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F472B6' : '#BE185D' }}>
                    {trait}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bloco de Recompensa (Se ativa) */}
        {Array.isArray(rewards) && rewards.some(r => r?.status === 'active') && (
          <View style={styles.rewardBanner}>
            <View style={styles.rewardIconBadge}>
              <MaterialIcons name="emoji-events" size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardTitle}>Recompensa Oferecida</Text>
              {rewards
                .filter(r => r?.status === 'active')
                .map((r, index) => (
                  <Text key={r?.id || index} style={styles.rewardAmount}>
                    {r?.amount ? `R$ ${parseFloat(r.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                    {r?.description ? ` • ${r.description}` : ''}
                  </Text>
                ))}
            </View>
          </View>
        )}
      </View>

      {/* 3. ADOÇÃO E CUSTÓDIA (AVISOS DISCRETOS E MODERNOS) */}
      {isAdoption && (
        <TouchableOpacity
          style={[
            styles.adoptionNoticeCard,
            { backgroundColor: isDark ? 'rgba(219, 39, 119, 0.12)' : '#FDF2F8', borderColor: isDark ? 'rgba(219, 39, 119, 0.3)' : '#FBCFE8' }
          ]}
          onPress={() => setExpandedAdoptionInfo(!expandedAdoptionInfo)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? 'rgba(219, 39, 119, 0.25)' : '#FCE7F3', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="favorite" size={16} color="#DB2777" />
              </View>
              <Text style={[styles.adoptionNoticeTitle, { color: isDark ? '#F472B6' : '#BE185D' }]}>
                Disponível para Adoção Responsável
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#F472B6' : '#BE185D' }}>
                {expandedAdoptionInfo ? 'Menos' : 'Saiba mais'}
              </Text>
              <MaterialIcons
                name={expandedAdoptionInfo ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={18}
                color={isDark ? '#F472B6' : '#BE185D'}
              />
            </View>
          </View>

          {expandedAdoptionInfo && (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(219, 39, 119, 0.2)' : '#FCE7F3' }}>
              <Text style={[styles.adoptionNoticeText, { color: isDark ? '#E2E8F0' : '#831843' }]}>
                Este animal não possui tutor conhecido e está sob acolhimento temporário. Caso queira adotar, envie uma mensagem ao protetor pelo chat!
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {isFound && !isAdoption && (
        <TouchableOpacity
          style={[
            styles.custodyNoticeCard,
            item.extra_fields?.found_custody === 'spotted'
              ? { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.12)' : '#FFFBEB', borderColor: isDark ? 'rgba(217, 119, 6, 0.3)' : '#FDE68A' }
              : { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.12)' : '#ECFDF5', borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0' },
          ]}
          onPress={() => setExpandedCustodyInfo(!expandedCustodyInfo)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: item.extra_fields?.found_custody === 'spotted'
                  ? (isDark ? 'rgba(217, 119, 6, 0.25)' : '#FEF3C7')
                  : (isDark ? 'rgba(5, 150, 105, 0.25)' : '#D1FAE5'),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MaterialIcons
                  name={item.extra_fields?.found_custody === 'spotted' ? 'visibility' : 'home'}
                  size={16}
                  color={item.extra_fields?.found_custody === 'spotted' ? '#D97706' : '#2E5634'}
                />
              </View>
              <Text style={[
                styles.custodyNoticeTitle,
                { color: item.extra_fields?.found_custody === 'spotted' ? (isDark ? '#FBBF24' : '#B45309') : (isDark ? '#34D399' : '#1E3E24') },
              ]}>
                {item.extra_fields?.found_custody === 'spotted'
                  ? 'Animal Avistado na Rua'
                  : 'Animal sob Cuidados / Lar Temporário'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{
                fontSize: 11,
                fontWeight: '700',
                color: item.extra_fields?.found_custody === 'spotted'
                  ? (isDark ? '#FBBF24' : '#B45309')
                  : (isDark ? '#34D399' : '#1E3E24')
              }}>
                {expandedCustodyInfo ? 'Menos' : 'Saiba mais'}
              </Text>
              <MaterialIcons
                name={expandedCustodyInfo ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={18}
                color={item.extra_fields?.found_custody === 'spotted'
                  ? (isDark ? '#FBBF24' : '#B45309')
                  : (isDark ? '#34D399' : '#1E3E24')}
              />
            </View>
          </View>

          {expandedCustodyInfo && (
            <View style={{
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: item.extra_fields?.found_custody === 'spotted'
                ? (isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7')
                : (isDark ? 'rgba(5, 150, 105, 0.2)' : '#D1FAE5'),
            }}>
              <Text style={[
                styles.custodyNoticeText,
                { color: isDark ? '#E2E8F0' : (item.extra_fields?.found_custody === 'spotted' ? '#78350F' : '#064E3B') },
              ]}>
                {item.extra_fields?.found_custody === 'spotted'
                  ? 'Quem publicou apenas avistou o animal no local informado. Se você estiver na região, compartilhe novas pistas nos comentários.'
                  : 'O animal foi acolhido com segurança enquanto a comunidade busca pelo seu tutor original.'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* 4. CARD DE LOCALIZAÇÃO E DATA COM ROTA GPS */}
      <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={[styles.sectionHeaderRow, { flex: 1 }]}>
            <View style={[styles.sectionIconWrap, { backgroundColor: item.status === 'lost' ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5') : (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5') }]}>
              <MaterialIcons
                name={item.status === 'lost' ? 'security' : (item?.extra_fields?.found_custody === 'spotted' ? 'add-location-alt' : 'home')}
                size={20}
                color={'#2E5634'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {item.status === 'lost'
                  ? 'Região do Desaparecimento'
                  : item?.extra_fields?.found_custody === 'spotted'
                  ? 'Local de Avistamento na Rua'
                  : 'Local Onde Foi Encontrado'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                {item.status === 'lost'
                  ? '🛡️ Epicentro geográfico seguro para busca'
                  : item?.extra_fields?.found_custody === 'spotted'
                  ? '📍 Ponto em via pública aberto para rota de resgate'
                  : '🔒 Acolhimento seguro com endereço preservado'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.locationBody}>
          <Text style={[styles.locationCityText, { color: colors.text }]}>
            {formatCityState(item)}
          </Text>
          {formatStreetNumberNeighborhood(
            item,
            Boolean(
              isOwner ||
              isAdmin ||
              verificationState?.status === 'approved' ||
              (item?.status !== 'found' || item?.extra_fields?.found_custody === 'spotted')
            )
          ) ? (
            <Text style={[styles.locationStreetText, { color: colors.textSecondary, marginBottom: 8 }]}>
              {formatStreetNumberNeighborhood(
                item,
                Boolean(
                  isOwner ||
                  isAdmin ||
                  verificationState?.status === 'approved' ||
                  (item?.status !== 'found' || item?.extra_fields?.found_custody === 'spotted')
                )
              )}
            </Text>
          ) : null}

          {item.date ? (
            <View style={[styles.dateRow, { borderTopColor: colors.border, marginBottom: 10 }]}>
              <MaterialIcons name="event" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                {item.status === 'lost' ? 'Data do desaparecimento: ' : 'Data do encontro: '}
                <Text style={[styles.dateValue, { color: colors.text }]}>{formatItemDate(item.date)}</Text>
              </Text>
            </View>
          ) : null}

          {/* Avisos de Proteção de Endereço e Comprovação de Tutor para Animais Acolhidos */}
          {item.status === 'found' && item.extra_fields?.found_custody !== 'spotted' && (
            <View style={{ marginBottom: 12 }}>
              {verificationState?.status === 'approved' && !isOwner && !isAdmin && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: isDark ? 'rgba(5, 150, 105, 0.18)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(5, 150, 105, 0.4)' : '#A7F3D0',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 11,
                  gap: 8,
                }}>
                  <MaterialIcons name="verified" size={20} color="#2E5634" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: isDark ? '#34D399' : '#1E3E24' }}>
                      Comprovação Aprovada • Endereço Liberado
                    </Text>
                    <Text style={{ fontSize: 11.5, color: isDark ? '#D1FAE5' : '#065F46', lineHeight: 16, marginTop: 2 }}>
                      Sua comprovação de tutor foi verificada com sucesso! O endereço exato foi revelado acima para combinar a devolução do pet.
                    </Text>
                  </View>
                </View>
              )}

              {verificationState?.status === 'pending' && !isOwner && !isAdmin && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : '#FFFBEB',
                  borderColor: isDark ? 'rgba(217, 119, 6, 0.35)' : '#FDE68A',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 11,
                  gap: 8,
                }}>
                  <MaterialIcons name="hourglass-top" size={20} color="#D97706" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: isDark ? '#FBBF24' : '#B45309' }}>
                      Comprovação em Análise ⏳
                    </Text>
                    <Text style={{ fontSize: 11.5, color: isDark ? '#FEF3C7' : '#78350F', lineHeight: 16, marginTop: 2 }}>
                      Suas fotos e justificativa foram enviadas para moderação. Assim que aprovadas, o endereço completo e a rota exata serão desbloqueados aqui.
                    </Text>
                  </View>
                </View>
              )}

              {verificationState?.status === 'rejected' && !isOwner && !isAdmin && (
                <View style={{
                  flexDirection: 'column',
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 11,
                  gap: 6,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="error-outline" size={18} color="#DC2626" />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#DC2626' }}>
                      Comprovação Anterior Não Aprovada
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: isDark ? '#FCA5A5' : '#991B1B', lineHeight: 16 }}>
                    {verificationState?.claim?.rejection_reason || 'A documentação enviada não pôde confirmar a posse do animal. Você pode enviar novas fotos ou documentos tocando abaixo.'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setProofModalVisible(true)}
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: '#DC2626',
                      borderRadius: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>Enviar Nova Comprovação</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!verificationState?.status && !isOwner && !isAdmin && (
                <View style={{
                  flexDirection: 'column',
                  backgroundColor: isDark ? 'rgba(5, 150, 105, 0.12)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 11,
                  gap: 8,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="security" size={18} color="#2E5634" />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: isDark ? '#34D399' : '#065F46' }}>
                      Endereço Protegido por Segurança
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: isDark ? '#D1FAE5' : '#065F46', lineHeight: 16 }}>
                    O endereço exato e o número da residência estão ocultos para proteger a família acolhedora. Se este é o seu animal, envie uma comprovação de tutor (fotos anteriores ou carteirinha) para desbloquear a localização completa.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (!user) {
                        Alert.alert('Login necessário', 'Entre ou crie uma conta para solicitar a comprovação de tutor.', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Entrar', onPress: () => navigation.navigate('Login') },
                        ]);
                        return;
                      }
                      setProofModalVisible(true);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.25)' : '#D1FAE5',
                      borderColor: isDark ? '#2E5634' : '#10B981',
                      borderWidth: 1,
                      borderRadius: 10,
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      marginTop: 2,
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="verified-user" size={17} color={isDark ? '#34D399' : '#065F46'} style={{ marginRight: 6 }} />
                    <Text style={{ color: isDark ? '#34D399' : '#065F46', fontWeight: '800', fontSize: 12.5 }}>
                      Solicitar Endereço Exato (Comprovar Posse)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Botão de Ver Rota GPS */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 11,
              paddingHorizontal: 14,
              marginTop: 4,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 5,
              elevation: 3,
            }}
            onPress={handleOpenRoute}
            activeOpacity={0.85}
            accessibilityLabel="Ver rota no mapa"
          >
            <MaterialIcons name="directions" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
              Ver Rota no Mapa
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. CARD DO TUTOR / QUEM PUBLICOU */}
      {owner && (
        <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.ownerHeader}
            onPress={() => {
              const targetId = item.owner_id || owner.id;
              if (targetId) {
                navigation.navigate('UserProfile', {
                  userId: targetId,
                  userName: (isOwner && userProfile?.name) ? userProfile.name : (owner.name || 'Usuário'),
                  avatarUrl: (isOwner ? (userProfile?.avatar_url || userProfile?.avatarUrl) : null) || owner.avatar_url || owner.avatarUrl || null,
                });
              }
            }}
            activeOpacity={0.75}
          >
            {(() => {
              const ownerAvatar = (isOwner ? (userProfile?.avatar_url || userProfile?.avatarUrl) : null) || owner.avatar_url || owner.avatarUrl || null;
              const ownerDisplayName = (isOwner && userProfile?.name) ? userProfile.name : (owner.name || 'Usuário');
              const ownerInitial = ownerDisplayName.trim()[0]?.toUpperCase() || 'U';

              if (ownerAvatar) {
                return (
                  <Image source={{ uri: ownerAvatar }} style={styles.ownerAvatarImage} />
                );
              }

              return (
                <View style={[styles.ownerAvatarFallback, { backgroundColor: colors.primary }]}>
                  <Text style={styles.ownerAvatarInitial}>{ownerInitial}</Text>
                </View>
              );
            })()}

            <View style={styles.ownerInfoTextContainer}>
              <Text style={[styles.ownerLabel, { color: colors.textMuted }]}>Publicado por</Text>
              <Text style={[styles.ownerName, { color: colors.primary }]} numberOfLines={1}>
                {(isOwner && userProfile?.name) ? userProfile.name : (owner.name || 'Usuário')}
              </Text>
              {owner.created_at && formatarDataMembro(owner.created_at) && formatarDataMembro(owner.created_at) !== 'não informado' ? (
                <Text style={[styles.ownerMeta, { color: colors.textMuted }]}>
                  Membro desde {formatarDataMembro(owner.created_at)}
                </Text>
              ) : null}
            </View>

            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} style={{ alignSelf: 'center' }} />
          </TouchableOpacity>

          {/* Se for terceiro anunciando em nome do tutor */}
          {item.extra_fields?.third_party_owner?.active && item.extra_fields?.third_party_owner?.name ? (
            <View style={styles.thirdPartyOwnerBox}>
              <Text style={styles.thirdPartyOwnerTitle}>
                {item.status === 'lost' ? 'Tutor Oficial do Pet:' : 'Responsável pelo Pet:'}
              </Text>
              <Text style={styles.thirdPartyOwnerName}>{item.extra_fields.third_party_owner.name}</Text>
              {item.extra_fields.third_party_owner.phone ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${item.extra_fields.third_party_owner.phone}`)}
                  style={styles.thirdPartyPhoneRow}
                >
                  <MaterialIcons name="phone" size={16} color="#15803D" />
                  <Text style={styles.thirdPartyPhoneText}>{item.extra_fields.third_party_owner.phone}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* AÇÕES PARA VISITANTES (ENVIAR MENSAGEM CTA) */}
          {!isOwner && !isAdmin && (
            <View style={styles.visitorActionsBlock}>
              <TouchableOpacity
                style={[styles.primaryChatCta, { backgroundColor: colors.primary }]}
                onPress={handleSendMessage}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryChatCtaText}>Enviar Mensagem ao Tutor</Text>
              </TouchableOpacity>

              {/* Ação Especial: Oferecer Lar Temporário Solidário */}
              {(item.status === 'lost' || (item.status === 'found' && !isAdoption)) && (
                <View style={{ gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : colors.primaryLight,
                      borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : COLORS.primaryBorder,
                      borderWidth: 1.5,
                      borderRadius: 14,
                      paddingVertical: 12,
                    }}
                    onPress={() => navigation.navigate('FosterVolunteers', { city: item.city || item.address || '', species: item.species || 'all' })}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="groups" size={19} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.primary }}>
                      🤝 Buscar Lar Temporário na Região
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4',
                      borderColor: isDark ? 'rgba(22, 163, 74, 0.3)' : '#BBF7D0',
                      borderWidth: 1.5,
                      borderRadius: 14,
                      paddingVertical: 12,
                    }}
                    onPress={handleOfferFoster}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="home-work" size={19} color="#16A34A" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#15803D' }}>
                      🏡 Oferecer Lar Temporário
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.reportBtn}
                onPress={handleOpenReport}
                activeOpacity={0.7}
              >
                <MaterialIcons name="flag" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={styles.reportBtnText}>Denunciar publicação</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PAINEL DE CONTROLE PARA AUTOR E SUPER ADMIN */}
          {(isOwner || isAdmin) && (
            <View style={[styles.ownerActionsGrid, { borderTopColor: colors.border }]}>
              {isAdmin && !isOwner && (
                <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: isDark ? '#D97706' : '#FDE68A' }}>
                  <MaterialIcons name="admin-panel-settings" size={16} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: isDark ? '#FCD34D' : '#B45309' }}>
                    Acesso Super Admin • Moderação Total
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.ownerActionBtn, { backgroundColor: isDark ? '#1E293B' : colors.primaryLight, borderColor: colors.border }]}
                onPress={handleEditItem}
              >
                <MaterialIcons name="edit" size={17} color={colors.primary} />
                <Text style={[styles.ownerActionText, { color: colors.primary }]}>
                  {isAdmin && !isOwner ? 'Editar (Admin)' : 'Editar'}
                </Text>
              </TouchableOpacity>

              {isAdmin && (
                <TouchableOpacity
                  style={[styles.ownerActionBtn, { backgroundColor: isDark ? '#1E293B' : '#FEF3C7', borderColor: '#FDE68A' }]}
                  onPress={() => {
                    Alert.alert(
                      'Alterar Status (Admin)',
                      'Selecione o novo status que deseja aplicar a esta publicação:',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: '🔴 Animal Perdido', onPress: () => handleAdminChangeStatus('lost', false) },
                        { text: '🟢 Animal Encontrado', onPress: () => handleAdminChangeStatus('found', false) },
                        { text: '💖 Para Adoção', onPress: () => handleAdminChangeStatus('found', true) },
                        { text: '🎉 Reencontrado (Resolvido)', onPress: () => handleAdminChangeStatus('resolved', false) },
                      ]
                    );
                  }}
                >
                  <MaterialIcons name="swap-horiz" size={18} color="#D97706" />
                  <Text style={[styles.ownerActionText, { color: '#B45309' }]}>Status</Text>
                </TouchableOpacity>
              )}

              {isOwner && item.status === 'found' && item.extra_fields?.found_custody !== 'spotted' && !isAdmin && (
                <TouchableOpacity
                  style={[styles.ownerActionBtn, { backgroundColor: item.extra_fields?.available_for_adoption ? '#FDF2F8' : '#ECFDF5', borderColor: item.extra_fields?.available_for_adoption ? '#F472B6' : '#A7F3D0' }]}
                  onPress={handleToggleAdoption}
                  disabled={togglingAdoption}
                >
                  <MaterialIcons
                    name="favorite"
                    size={17}
                    color={item.extra_fields?.available_for_adoption ? '#DB2777' : '#2E5634'}
                  />
                  <Text
                    style={[styles.ownerActionText, { color: item.extra_fields?.available_for_adoption ? '#DB2777' : '#2E5634' }]}
                  >
                    {togglingAdoption ? 'Salvando...' : item.extra_fields?.available_for_adoption ? 'Pausar Adoção' : 'P/ Adoção'}
                  </Text>
                </TouchableOpacity>
              )}

              {isOwner && renewalInfo.canRenew && (
                <TouchableOpacity
                  style={[styles.ownerActionBtn, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                  onPress={handleRenewItem}
                  disabled={renewing}
                >
                  <MaterialIcons name="refresh" size={17} color="#D97706" />
                  <Text style={[styles.ownerActionText, { color: '#B45309' }]}>
                    {renewing ? 'Renovando...' : 'Renovar'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.ownerActionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                onPress={handleDeleteItem}
                disabled={deleting}
              >
                <MaterialIcons name="delete-outline" size={17} color="#DC2626" />
                <Text style={[styles.ownerActionText, { color: '#DC2626' }]}>
                  {deleting ? 'Excluindo...' : (isAdmin && !isOwner ? 'Excluir (Admin)' : 'Excluir')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* 6. COMENTÁRIOS E PISTAS DA COMUNIDADE */}
      <View style={[styles.cardSection, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 40 }]}>
        <View style={styles.commentsHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.commentsTitle, { color: colors.text }]}>Pistas & Comentários</Text>
            <View style={[styles.commentsCountBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.commentsCountText, { color: colors.primary }]}>{sightings.length}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.addCommentBtn, { backgroundColor: colors.primary }]}
            onPress={handleReportSighting}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add-comment" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addCommentBtnText}>Comentar</Text>
          </TouchableOpacity>
        </View>

        {sightings.length === 0 ? (
          <View style={styles.emptyCommentsBox}>
            <MaterialIcons name="forum" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyCommentsText, { color: colors.textMuted }]}>
              Nenhum comentário ou pista ainda.
            </Text>
            <Text style={[styles.emptyCommentsSub, { color: colors.textMuted }]}>
              Viu este animal? Compartilhe informações para ajudar o tutor!
            </Text>
          </View>
        ) : (
          sightings.map((s, idx) => {
            let instagram = '', whatsapp = '', facebook = '', contatoExtra = '';
            if (s.contact_info && typeof s.contact_info === 'object') {
              instagram = s.contact_info.instagram || '';
              whatsapp = s.contact_info.whatsapp || '';
              facebook = s.contact_info.facebook || '';
            } else if (typeof s.contact_info === 'string' && s.contact_info.trim() !== '') {
              contatoExtra = s.contact_info;
            }

            const isAuthor = user && s.user_id === user.id;

            return (
              <View
                key={s.id || idx}
                style={[
                  styles.commentBubble,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.commentHeaderRow}>
                  {(() => {
                    const sAvatar = s.profiles?.avatar_url || s.profiles?.avatarUrl || null;
                    const sName = s.profiles?.name || 'Usuário';
                    const sInitial = sName.trim()[0]?.toUpperCase() || 'U';

                    if (sAvatar) {
                      return <Image source={{ uri: sAvatar }} style={styles.commentAvatarImg} />;
                    }
                    return (
                      <View style={[styles.commentAvatarFallback, { backgroundColor: colors.primary }]}>
                        <Text style={styles.commentAvatarInitial}>{sInitial}</Text>
                      </View>
                    );
                  })()}

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.commentAuthorName, { color: colors.text }]}>{s.profiles?.name || 'Usuário'}</Text>
                    <Text style={[styles.commentTimestamp, { color: colors.textMuted }]}>
                      {new Date(s.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {(isAuthor || isAdmin) && (
                    <View style={styles.commentActionsWrap}>
                      {isAdmin && !isAuthor && (
                        <View style={{ backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 4 }}>
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: isDark ? '#FCD34D' : '#B45309' }}>ADMIN</Text>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => handleEditComment(s)} style={{ padding: 4, marginRight: 4 }}>
                        <MaterialIcons name="edit" size={17} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteComment(s)} style={{ padding: 4 }}>
                        <MaterialIcons name="delete-outline" size={17} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Text style={[styles.commentContentText, { color: colors.text }]}>{s.description}</Text>

                {(() => {
                  const loc = s.location;
                  let displayLoc = null;
                  if (loc) {
                    if (typeof loc === 'object') {
                      displayLoc = loc.address || 'Localização marcada no mapa';
                    } else {
                      const str = String(loc).trim();
                      if (str.startsWith('{') || str.startsWith('[')) {
                        try {
                          const parsed = JSON.parse(str);
                          displayLoc = parsed.address || 'Localização marcada no mapa';
                        } catch {
                          displayLoc = 'Localização marcada no mapa';
                        }
                      } else if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(str)) {
                        displayLoc = 'Localização marcada no mapa';
                      } else {
                        displayLoc = str;
                      }
                    }
                  }

                  if (!displayLoc) return null;

                  return (
                    <View style={[styles.commentLocationChip, { backgroundColor: isDark ? '#0F172A' : colors.primaryLight }]}>
                      <MaterialIcons name="location-on" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.commentLocationText, { color: colors.primary }]}>{displayLoc}</Text>
                    </View>
                  );
                })()}

                {s.photo_url ? (
                  <Image source={{ uri: s.photo_url }} style={styles.commentAttachedImage} resizeMode="cover" />
                ) : null}

                {(instagram || whatsapp || facebook || contatoExtra) ? (
                  <View style={styles.commentContactsContainer}>
                    {whatsapp ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`https://wa.me/55${whatsapp.replace(/\D/g, '')}`)}
                        style={[styles.contactTag, { backgroundColor: '#DCFCE7' }]}
                      >
                        <FontAwesome name="whatsapp" size={14} color="#15803D" style={{ marginRight: 4 }} />
                        <Text style={[styles.contactTagText, { color: '#15803D' }]}>{whatsapp}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {instagram ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`https://instagram.com/${instagram.replace('@', '')}`)}
                        style={[styles.contactTag, { backgroundColor: '#FCE7F3' }]}
                      >
                        <FontAwesome name="instagram" size={14} color="#BE185D" style={{ marginRight: 4 }} />
                        <Text style={[styles.contactTagText, { color: '#BE185D' }]}>@{instagram.replace('@', '')}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {facebook ? (
                      <View style={[styles.contactTag, { backgroundColor: '#DBEAFE' }]}>
                        <FontAwesome name="facebook-square" size={14} color="#1D4ED8" style={{ marginRight: 4 }} />
                        <Text style={[styles.contactTagText, { color: '#1D4ED8' }]}>{facebook}</Text>
                      </View>
                    ) : null}

                    {contatoExtra ? (
                      <View style={[styles.contactTag, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.contactTagText, { color: colors.textSecondary }]}>{contatoExtra}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      {/* MODAL DE SIGHTING / PISTAS */}
      <SightingModal
        visible={sightingModalVisible}
        onClose={() => setSightingModalVisible(false)}
        onSubmit={handleSubmitSighting}
        loading={sightingLoading}
      />

      {/* MODAL DE DENÚNCIA */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Denunciar Publicação</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Escolha o motivo da denúncia para análise de moderação.
            </Text>
            {['Conteúdo falso ou enganoso', 'Conteúdo inadequado', 'Informações de contato suspeitas', 'Outro'].map(reason => (
              <TouchableOpacity
                key={reason}
                onPress={() => setReportReason(reason)}
                style={styles.radioOptionRow}
              >
                <MaterialIcons
                  name={reportReason === reason ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={reportReason === reason ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.radioOptionText, { color: colors.text }]}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="Detalhes adicionais (opcional)"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.modalInput, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
            />
            <View style={styles.modalActionButtons}>
              <TouchableOpacity onPress={() => setReportModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitReport}
                disabled={reporting}
                style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
              >
                <Text style={styles.modalSubmitText}>{reporting ? 'Enviando...' : 'Enviar Denúncia'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE EDIÇÃO DE COMENTÁRIO */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelEditComment}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%', maxWidth: 440, alignItems: 'center' }}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Comentário</Text>
                  <TextInput
                    value={editCommentText}
                    onChangeText={setEditCommentText}
                    multiline
                    style={[styles.modalInput, { minHeight: 60, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                    placeholder="Digite seu comentário"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    value={editCommentLocation}
                    onChangeText={setEditCommentLocation}
                    style={[styles.modalInput, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                    placeholder="Local onde viu o pet (opcional)"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    value={editCommentWhatsapp}
                    onChangeText={t => setEditCommentWhatsapp(t.replace(/[^0-9]/g, ''))}
                    style={[styles.modalInput, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                    placeholder="WhatsApp para contato (opcional)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                  <TextInput
                    value={editCommentInstagram}
                    onChangeText={setEditCommentInstagram}
                    style={[styles.modalInput, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                    placeholder="Instagram (opcional)"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                  <View style={styles.modalActionButtons}>
                    <TouchableOpacity onPress={handleCancelEditComment} style={styles.modalCancelBtn}>
                      <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveEditComment} style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}>
                      <Text style={styles.modalSubmitText}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL DE FOTO EM TELA CHEIA */}
      <Modal
        visible={fullScreenPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenPhotoModal(false)}
      >
        <View style={styles.fullScreenModalBg}>
          <TouchableOpacity
            onPress={() => setFullScreenPhotoModal(false)}
            style={styles.fullScreenCloseBtn}
          >
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {photos && photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: fullScreenIndex * screenWidth, y: 0 }}
              style={{ width: screenWidth, flex: 1 }}
            >
              {photos.map((photo, idx) => (
                <View key={photo.id || idx} style={{ width: screenWidth, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Image
                    source={{ uri: photo.url }}
                    style={{ width: screenWidth, height: '80%' }}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      {/* MODAL DE COMPROVAÇÃO DE TUTOR / LIBERAÇÃO DE ENDEREÇO */}
      <ProofUploadModal
        visible={proofModalVisible}
        onClose={() => setProofModalVisible(false)}
        item={item}
        userId={user?.id}
        onSuccess={() => {
          loadVerification();
        }}
      />

      {/* MODAL DE CARTAZ */}
      <ShareFlyerModal
        visible={shareFlyerVisible}
        onClose={() => setShareFlyerVisible(false)}
        item={item}
        imageUrl={photos?.[0]?.url}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  detailPage: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  errorText: { marginTop: 12, fontSize: 16, fontWeight: 'bold' },
  navBackBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginRight: 8, borderRadius: 19, backgroundColor: 'rgba(255, 255, 255, 0.14)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.28)' },

  // Hero Section
  heroContainer: { position: 'relative', width: '100%', height: 320, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  heroImageItem: { width: '100%', height: 320 },
  noPhotoHero: { width: '100%', height: 320, justifyContent: 'center', alignItems: 'center' },
  noPhotoText: { marginTop: 8, fontSize: 14, fontWeight: '600' },
  photoCountBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0, 0, 0, 0.65)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  photoCountText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  zoomButton: { position: 'absolute', bottom: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 0, 0, 0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  paginationRow: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, zIndex: 10 },
  paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.45)' },
  paginationDotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  floatingShareBtn: { position: 'absolute', top: 16, right: 16, zIndex: 12 },

  // Card Section Container
  cardSection: { marginHorizontal: 16, marginTop: 14, borderRadius: 18, padding: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  // Status and Title
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  lostPill: { backgroundColor: '#FFEDD5' },
  foundPill: { backgroundColor: '#DCFCE7' },
  adoptionPill: { backgroundColor: '#FCE7F3' },
  statusPillText: { fontSize: 12.5, fontWeight: '800' },
  petMainTitle: { fontSize: 24, fontWeight: '800', lineHeight: 30, marginBottom: 14 },

  // Attribute Chips Grid
  attributeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginBottom: 14 },
  attrChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, width: '48.5%' },
  attrChipEmoji: { fontSize: 18, width: 24, textAlign: 'center', marginRight: 8 },
  attrChipTextWrap: { flex: 1 },
  attrChipLabel: { fontSize: 10.5, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  attrChipValue: { fontSize: 13.5, fontWeight: '700' },

  // Description Block
  descriptionBlock: { borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 4 },
  sectionSubtitle: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  descriptionText: { fontSize: 14.5, lineHeight: 21 },

  // Reward Banner
  rewardBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#FDE68A' },
  rewardIconBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rewardTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.3 },
  rewardAmount: { fontSize: 16, fontWeight: '800', color: '#B45309', marginTop: 2 },

  // Adoption & Custody Notice Cards (Modern & Sleek Accordion)
  adoptionNoticeCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#FDF2F8',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  custodyNoticeCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  adoptionNoticeTitle: { fontSize: 13, fontWeight: '700', color: '#9D174D' },
  adoptionNoticeText: { fontSize: 12, lineHeight: 17, color: '#BE185D' },
  custodyNoticeTitle: { fontSize: 13, fontWeight: '700' },
  custodyNoticeText: { fontSize: 12, lineHeight: 17 },

  // Location Card
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  locationBody: { paddingLeft: 4 },
  locationCityText: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  locationStreetText: { fontSize: 13.5, lineHeight: 19, marginTop: 3 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  dateLabel: { fontSize: 13 },
  dateValue: { fontWeight: '700' },

  // Owner Card
  ownerHeader: { flexDirection: 'row', alignItems: 'center' },
  ownerAvatarImage: { width: 46, height: 46, borderRadius: 23, marginRight: 12, backgroundColor: COLORS.primaryLight },
  ownerAvatarFallback: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  ownerAvatarInitial: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  ownerInfoTextContainer: { flex: 1 },
  ownerLabel: { fontSize: 11, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.3 },
  ownerName: { fontSize: 15.5, fontWeight: '800', marginTop: 1 },
  ownerMeta: { fontSize: 12, marginTop: 2 },

  // Third Party Owner
  thirdPartyOwnerBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  thirdPartyOwnerTitle: { fontSize: 12, fontWeight: '700', color: '#166534' },
  thirdPartyOwnerName: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 1 },
  thirdPartyPhoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  thirdPartyPhoneText: { fontSize: 14, fontWeight: '700', color: '#15803D' },

  // Action CTAs
  visitorActionsBlock: { marginTop: 14 },
  primaryChatCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  primaryChatCtaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 6 },
  reportBtnText: { color: '#DC2626', fontSize: 12.5, fontWeight: '700' },

  ownerActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  ownerActionBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 10, borderWidth: 1, gap: 6 },
  ownerActionText: { fontSize: 13, fontWeight: '800' },

  // Flyer Banner
  flyerBannerWrap: { marginHorizontal: 16, marginTop: 14 },
  flyerBannerBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, borderWidth: 1.5, gap: 12 },
  flyerIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flyerBtnTitle: { fontSize: 14.5, fontWeight: '800' },
  flyerBtnSub: { fontSize: 11.5, marginTop: 2, lineHeight: 16 },

  // Comments Section
  commentsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  commentsTitle: { fontSize: 16, fontWeight: '800' },
  commentsCountBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6 },
  commentsCountText: { fontSize: 12, fontWeight: '800' },
  addCommentBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addCommentBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  emptyCommentsBox: { alignItems: 'center', paddingVertical: 20 },
  emptyCommentsText: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  emptyCommentsSub: { fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },

  // Comment Bubble
  commentBubble: { borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1 },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  commentAvatarImg: { width: 34, height: 34, borderRadius: 17, marginRight: 8, backgroundColor: COLORS.primaryLight },
  commentAvatarFallback: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  commentAvatarInitial: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  commentAuthorName: { fontSize: 13.5, fontWeight: '700' },
  commentTimestamp: { fontSize: 11 },
  commentActionsWrap: { flexDirection: 'row', alignItems: 'center' },
  commentContentText: { fontSize: 13.5, lineHeight: 19 },
  commentLocationChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6, alignSelf: 'flex-start' },
  commentLocationText: { fontSize: 12, fontWeight: '700' },
  commentAttachedImage: { width: '100%', height: 140, borderRadius: 10, marginTop: 8 },
  commentContactsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  contactTag: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  contactTagText: { fontSize: 11.5, fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { borderRadius: 20, padding: 20, width: '100%', maxWidth: 440 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, marginBottom: 14 },
  radioOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  radioOptionText: { fontSize: 14, marginLeft: 8, fontWeight: '600' },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10 },
  modalActionButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
  modalCancelBtn: { paddingVertical: 9, paddingHorizontal: 14 },
  modalCancelText: { fontSize: 14, fontWeight: '700' },
  modalSubmitBtn: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  modalSubmitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  // Full Screen Photo Modal
  fullScreenModalBg: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  fullScreenCloseBtn: { position: 'absolute', top: 48, right: 20, zIndex: 20, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 20, padding: 8 },
});

export default ItemDetailScreen;
