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
} from 'react-native';
import { MaterialIcons, FontAwesome, FontAwesome5, Entypo } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import * as itemsService from '../services/items';
import { formatarDataMembro } from './_dateUtils';

import Card from '../components/Card';
import Button from '../components/Button';
import ShareButton from '../components/ShareButton';
import ShareFlyerModal from '../components/ShareFlyerModal';

import SightingModal from '../components/SightingModal';
import * as sightingsService from '../services/sightings';
import { getRenewalInfo } from '../services/itemExpiration';
import { createRenewalReminderNotification } from '../services/notifications';
import * as reportsService from '../services/reports';

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

const formatStreetNumberNeighborhood = (item) => {
  const details = item?.extra_fields?.location_details;
  const street = (details?.street || item?.street || '').trim();
  const number = (details?.number || item?.house_number || '').trim();
  const district = (details?.district || item?.neighborhood || '').trim();

  const streetPart = street && number ? `${street}, ${number}` : street || (number ? `Nº ${number}` : '');
  const parts = [streetPart, district].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  const rawText = (details?.text || item?.address || '').trim();
  if (rawText) {
    return rawText;
  }

  return '';
};

const ItemDetailScreen = ({ route, navigation }) => {
  const { itemId } = route.params;
  const { user, userProfile, isAdmin } = useAuth();
  const [item, setItem] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [owner, setOwner] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [sightings, setSightings] = useState([]);
  const [sightingModalVisible, setSightingModalVisible] = useState(false);
  const [sightingLoading, setSightingLoading] = useState(false);
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
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    navigation.setOptions({
      title: 'Detalhes do Pet',
      headerStyle: {
        backgroundColor: '#2563EB',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
        color: '#fff',
      },
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 12, marginRight: 8, padding: 4 }}>
          <MaterialIcons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, []);


  useFocusEffect(
    useCallback(() => {
      loadItemDetails();
      loadSightings();
    }, [itemId])
  );

  const loadSightings = async () => {
    try {
      const data = await sightingsService.getSightings(itemId);
      setSightings(data);
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
        if (isOwner && itemData && itemData.owner_id === user?.id) {
          const renewalInfo = getRenewalInfo(itemData);
          if (renewalInfo.needsRenewal) {
            await createRenewalReminderNotification(itemData, user.id);
          }
        }
        // Log para depuração do array de fotos
        if (itemData.item_photos && Array.isArray(itemData.item_photos)) {
          console.log('[ItemDetailScreen] Fotos retornadas:', itemData.item_photos);
          itemData.item_photos.forEach((photo, idx) => {
            console.log(`[ItemDetailScreen] Foto[${idx}]:`, photo);
          });
        } else {
          console.log('[ItemDetailScreen] Nenhuma foto retornada ou formato inesperado:', itemData.item_photos);
        }
        // Log para depuração das recompensas
        console.log('[ItemDetailScreen] Rewards retornadas:', itemData.rewards);
        // Log para depuração do created_at do owner
        if (itemData.profiles) {
          console.log('[ItemDetailScreen] Owner created_at:', itemData.profiles.created_at);
        } else {
          console.log('[ItemDetailScreen] Owner não encontrado');
        }
        setPhotos(itemData.item_photos || []);
        setOwner(itemData.profiles);
        setRewards(itemData.rewards || []);
      } else {
        Alert.alert('Erro', 'Pet não encontrado');
        navigation.goBack();
      }
    } catch (error) {
      console.error('[ItemDetailScreen] Erro ao carregar:', error);
      Alert.alert('Erro', 'Falha ao carregar detalhes do pet');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = () => {
    if (!item) return;
    console.log('[Editar publicação] Navegando para edição com item:', item);
    navigation.navigate('RegisterItem', {
      editItem: item,
      modo: 'editar', // opcional: pode ser útil para debug
    });
  };

  const renewalInfo = item ? getRenewalInfo(item) : { canRenew: false, daysRemaining: 0, expired: false };

  const handleDeleteItem = () => {
    Alert.alert(
      'Excluir Pet',
      'Tem certeza que deseja excluir este pet?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive', onPress: async () => {
            setDeleting(true);
            try {
              await itemsService.deleteItem(itemId);
              Alert.alert('Sucesso', 'Pet excluído com sucesso!');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir pet: ' + error.message);
            } finally {
              setDeleting(false);
            }
          }
        }
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

  // Abrir modal de edição
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

  // Salvar edição
  const handleSaveEditComment = async () => {
    if (!editCommentObj || !editCommentText.trim()) {
      setEditModalVisible(false);
      return;
    }
    let photoUrlToSave = editCommentPhotoUrl;
    // Só tenta upload se a foto for local e diferente da original
    const isLocalPhoto = photoUrlToSave && photoUrlToSave.startsWith('file:///');
    let uploadError = null;
    if (isLocalPhoto && photoUrlToSave !== editCommentObj.photo_url) {
      try {
        if (sightingsService.uploadSightingPhoto) {
          console.log('[handleSaveEditComment] Chamando uploadSightingPhoto com:', photoUrlToSave);
          const uploadedUrl = await sightingsService.uploadSightingPhoto(editCommentObj.id, photoUrlToSave);
          console.log('[handleSaveEditComment] URL retornada do upload:', uploadedUrl);
          if (uploadedUrl && !uploadedUrl.startsWith('file:///')) {
            photoUrlToSave = uploadedUrl;
          } else {
            // Upload não retornou URL pública, mantém anterior
            photoUrlToSave = editCommentObj.photo_url;
          }
        }
      } catch (err) {
        uploadError = err;
        photoUrlToSave = editCommentObj.photo_url;
      }
    }
    // Nunca salva file:/// no banco
    if (photoUrlToSave && photoUrlToSave.startsWith('file:///')) {
      photoUrlToSave = editCommentObj.photo_url;
    }
    // Se não houve alteração de foto, mantém a anterior
    if (!photoUrlToSave && editCommentObj.photo_url) {
      photoUrlToSave = editCommentObj.photo_url;
    }
    console.log('[handleSaveEditComment] Valor final de photoUrlToSave:', photoUrlToSave);
    try {
      await sightingsService.updateSighting(editCommentObj.id, {
        description: editCommentText.trim(),
        location: editCommentLocation,
        contact_info: {
          instagram: editCommentInstagram,
          whatsapp: editCommentWhatsapp,
          facebook: editCommentFacebook,
        },
        photo_url: photoUrlToSave,
      });
      setEditModalVisible(false);
      setEditCommentObj(null);
      setEditCommentText('');
      setEditCommentLocation('');
      setEditCommentInstagram('');
      setEditCommentWhatsapp('');
      setEditCommentFacebook('');
      setEditCommentPhotoUrl('');
      await loadSightings();
      await loadItemDetails();
      if (uploadError) {
        Alert.alert('Comentário atualizado', 'Foto não foi atualizada devido a erro de upload.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao editar comentário: ' + error.message);
    }
  };

  // Cancelar edição
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
  const handleMarkAsResolved = () => {
    Alert.alert(
      'Marcar como Resolvido',
      'Confirma que este pet foi encontrado/devolvido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await itemsService.markItemAsResolved(itemId);
              Alert.alert('Sucesso', 'Pet marcado como resolvido!');
              loadItemDetails();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao marcar como resolvido: ' + error.message);
            }
          },
        },
      ]
    );
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

    // Mensagem automática depende do status do pet
    let initialMessage = '';
    if (item.status === 'lost') {
      initialMessage = 'Oi, eu encontrei seu pet!';
    } else if (item.status === 'found') {
      initialMessage = 'Oi, você achou meu pet?';
    }

    navigation.navigate('ChatScreen', {
      conversation: {
        otherId: item.owner_id,
        itemId: itemId,
        otherName: owner?.name || 'Usuário',
        initialMessage,
      }
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
        `Este animal foi encontrado na rua e está no período prioritário de busca pelo tutor original. Faltam ${waitingDays} dia${waitingDays === 1 ? '' : 's'} para a liberação oficial de adoção. Deseja liberar a adoção agora caso já tenha certeza que o animal não possui tutor?`,
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
        : 'Ao disponibilizar para adoção responsável, outros membros da comunidade poderão entrar em contato para adotar o pet. Deseja continuar?',
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
      Alert.alert('Denúncia enviada', 'A equipe administrativa analisará esta publicação.');
    } catch (error) {
      Alert.alert('Não foi possível denunciar', error.message || 'Tente novamente.');
    } finally {
      setReporting(false);
    }
  };

  const handleSubmitSighting = async (form) => {
    console.log('[ItemDetailScreen.handleSubmitSighting] ➡️ Iniciando com form:', form);
    setSightingLoading(true);
    try {
      const created = await sightingsService.createSighting({
        item_id: itemId,
        user_id: user.id,
        location: form.location,
        description: form.description,
        contact_info: form.contact_info,
        photo_url: form.photo_url,
      });
      console.log('[ItemDetailScreen.handleSubmitSighting] ✓ Informação criada no banco:', created);
      setSightingModalVisible(false);
      loadSightings();

      console.log('[ItemDetailScreen.handleSubmitSighting] item atual:', { itemId, owner_id: item?.owner_id, title: item?.title });

      // Notifica o tutor do pet sobre a nova informação (inclusive por WhatsApp se opt-in)
      if (item?.owner_id) {
        try {
          const { createNotification } = require('../services/notifications');
          const commenterName = userProfile?.name || user?.user_metadata?.name || 'Um membro da comunidade';
          console.log('[ItemDetailScreen] Disparando notificação de informação para o tutor:', { ownerId: item.owner_id, commenter: commenterName });

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

          notificationMessage += `\n\n🐾 *Acesse o aplicativo WeFIND para conferir mais detalhes.*`;

          const notifRes = await createNotification({
            user_id: item.owner_id,
            type: 'sighting',
            title: `🐾 Nova informação sobre ${item.title || 'seu pet'}!`,
            message: notificationMessage,
            item_id: item.id,
          });
          console.log('[ItemDetailScreen] Resultado da createNotification:', notifRes);
        } catch (notifErr) {
          console.error('[ItemDetailScreen] Falha ao enviar notificação de informação:', notifErr);
        }
      } else {
        console.warn('[ItemDetailScreen] ⚠️ item.owner_id não encontrado!', item);
      }

      Alert.alert('Sucesso', 'Informações compartilhadas com sucesso!');
    } catch (e) {
      console.error('[ItemDetailScreen.handleSubmitSighting] ❌ Erro:', e);
      Alert.alert('Erro', 'Não foi possível enviar as informações.');
    } finally {
      setSightingLoading(false);
    }
  };

  // Excluir comentário
  const handleDeleteCommentConfirmed = async (comment) => {
    try {
      await sightingsService.deleteSighting(comment.id);
      setSightings(prev => prev.filter(c => c.id !== comment.id));
      loadSightings();
    } catch (error) {
      console.error('Falha ao excluir comentário:', error);
    }
  };

  const handleDeleteComment = (comment) => {
    Alert.alert(
      'Excluir comentário',
      'Tem certeza que deseja excluir este comentário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive', onPress: () => handleDeleteCommentConfirmed(comment) }
      ]
    );
  };

  const isOwner = user && item && item.owner_id === user.id;
  const canDelete = isOwner || isAdmin;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Pet não encontrado</Text>
      </View>
    );
  }

  // NOVO DESIGN INSPIRADO NO ANEXO
  return (
    <ScrollView style={styles.detailPage} showsVerticalScrollIndicator={false}>
      <View style={{ padding: 0, margin: 0 }}>
        {/* Fotos do animal no topo */}
        <View style={styles.heroImage}>
          {photos && photos.length > 0 ? (
            <View style={{ width: '100%', height: 280, position: 'relative' }}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                  setActivePhotoIndex(newIndex);
                }}
                style={{ width: screenWidth, height: 280 }}
              >
                {photos.map((photo, idx) => (
                  <TouchableOpacity
                    key={photo.id || idx}
                    activeOpacity={0.95}
                    onPress={() => {
                      setFullScreenIndex(idx);
                      setFullScreenPhotoModal(true);
                    }}
                    style={{ width: screenWidth, height: 280 }}
                  >
                    <Image
                      source={{ uri: photo.url }}
                      style={{ width: screenWidth, height: 280, backgroundColor: '#F3F4F6' }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Contador de fotos */}
              {photos.length > 1 && (
                <View style={{ position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0, 0, 0, 0.65)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, zIndex: 10 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    {activePhotoIndex + 1}/{photos.length}
                  </Text>
                </View>
              )}

              {/* Indicador de toque para ampliar */}
              <View style={{ position: 'absolute', bottom: 12, right: 16, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 }}>
                <MaterialIcons name="zoom-in" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Toque para ampliar</Text>
              </View>

              {/* Pontos de Paginação */}
              {photos.length > 1 && (
                <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, zIndex: 10 }}>
                  {photos.map((_, dotIndex) => (
                    <View
                      key={dotIndex}
                      style={{
                        width: activePhotoIndex === dotIndex ? 18 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: activePhotoIndex === dotIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={{ width: '100%', height: 280, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
              <MaterialIcons name="image-not-supported" size={48} color="#D1D5DB" />
              <Text style={{ marginTop: 8, color: '#9CA3AF', fontSize: 14 }}>Sem foto</Text>
            </View>
          )}
          <View style={styles.detailShareButton}>
            <ShareButton item={item} imageUrl={photos?.[0]?.url} />
          </View>
        </View>


        {/* Título, descrição e recompensa */}
        <View style={styles.introSection}>
          <View style={[styles.statusPill, item.extra_fields?.is_direct_adoption ? { backgroundColor: '#FCE7F3' } : (item.status === 'found' ? styles.foundPill : styles.lostPill)]}>
            <MaterialIcons
              name={item.extra_fields?.is_direct_adoption ? 'favorite' : (item.status === 'found' ? 'check-circle' : 'search')}
              size={15}
              color={item.extra_fields?.is_direct_adoption ? '#BE185D' : (item.status === 'found' ? '#047857' : '#C2410C')}
            />
            <Text style={[styles.statusPillText, { color: item.extra_fields?.is_direct_adoption ? '#BE185D' : (item.status === 'found' ? '#047857' : '#C2410C') }]}>
              {item.extra_fields?.is_direct_adoption ? 'Para Adoção' : (item.status === 'found' ? 'Encontrado' : 'Perdido')}
            </Text>
          </View>
          <Text style={styles.detailTitle}>{item.title}</Text>
          {item.description ? <Text style={styles.detailDescription}>{item.description}</Text> : null}
          {/* Bloco de recompensa */}
          {Array.isArray(rewards) && rewards.some(reward => reward?.status === 'active') && (
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MaterialIcons name="emoji-events" size={28} color="#F59E42" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#B45309', fontWeight: 'bold', fontSize: 16 }}>Recompensa oferecida</Text>
                {rewards
                  .filter(reward => reward?.status === 'active')
                  .map((reward, index) => (
                    <Text key={reward?.id || index} style={{ color: '#B45309', fontSize: 15, marginTop: 2 }}>
                      {reward?.amount ? `R$ ${parseFloat(reward.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}{reward?.description ? ` - ${reward.description}` : ''}
                    </Text>
                  ))}
              </View>
            </View>
          )}
        </View>

        {/* Card de Adoção Direta (Animal sem tutor prévio) */}
        {item.extra_fields?.is_direct_adoption && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 10,
              padding: 14,
              borderRadius: 12,
              borderWidth: 1.5,
              backgroundColor: '#FDF2F8',
              borderColor: '#F472B6',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
              <MaterialIcons name="favorite" size={18} color="#DB2777" />
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#9D174D' }}>
                Disponível para Adoção Responsável
              </Text>
            </View>
            <Text style={{ fontSize: 12.5, lineHeight: 18, color: '#BE185D' }}>
              Este animal não tem tutor conhecido e está pronto para adoção imediata. Fale diretamente com quem o resgatou pelo chat para combinar o encontro!
            </Text>
          </View>
        )}

        {/* Card de Custódia para Pet Encontrado */}
        {item.status === 'found' && !item.extra_fields?.is_direct_adoption && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 10,
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              backgroundColor: item.extra_fields?.found_custody === 'spotted' ? '#FFFBEB' : '#ECFDF5',
              borderColor: item.extra_fields?.found_custody === 'spotted' ? '#FDE68A' : '#A7F3D0',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
              <MaterialIcons
                name={item.extra_fields?.found_custody === 'spotted' ? 'visibility' : 'home'}
                size={18}
                color={item.extra_fields?.found_custody === 'spotted' ? '#D97706' : '#059669'}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: item.extra_fields?.found_custody === 'spotted' ? '#B45309' : '#047857',
                }}
              >
                {item.extra_fields?.found_custody === 'spotted'
                  ? 'Animal Avistado na Rua'
                  : 'Animal sob Cuidados / Lar Temporário'}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12.5,
                lineHeight: 18,
                color: item.extra_fields?.found_custody === 'spotted' ? '#92400E' : '#065F46',
              }}
            >
              {item.extra_fields?.found_custody === 'spotted'
                ? 'Quem publicou apenas viu o pet no local informado e tirou a foto, mas não está com o animal. Se for ao local, compartilhe pistas nos comentários.'
                : 'Quem encontrou acolheu o animal em sua casa ou espaço seguro enquanto o tutor é procurado pela comunidade.'}
            </Text>
          </View>
        )}

        {/* Card de Período de Busca vs Adoção Liberada para Pet Encontrado com Intenção de Adoção */}
        {item.status === 'found' && !item.extra_fields?.is_direct_adoption && (
          itemsService.isPetAvailableForAdoption(item) ? (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 10,
                padding: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                backgroundColor: '#FDF2F8',
                borderColor: '#F472B6',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                <MaterialIcons name="favorite" size={18} color="#DB2777" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#9D174D' }}>
                  Período de busca encerrado - Liberado para Adoção!
                </Text>
              </View>
              <Text style={{ fontSize: 12.5, lineHeight: 18, color: '#BE185D' }}>
                O período prioritário de 7 dias de busca pelo tutor foi concluído sem localização do dono original. O pet agora está aberto para adoção responsável com amor!
              </Text>
            </View>
          ) : (
            item.extra_fields?.adoption_intent && itemsService.getAdoptionWaitingDays(item) > 0 ? (
              <View
                style={{
                  marginHorizontal: 16,
                  marginTop: 10,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  backgroundColor: '#FFFBEB',
                  borderColor: '#FDE68A',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                  <MaterialIcons name="schedule" size={18} color="#D97706" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#B45309' }}>
                    Período Prioritário de Busca pelo Tutor (Faltam {itemsService.getAdoptionWaitingDays(item)} dia{itemsService.getAdoptionWaitingDays(item) === 1 ? '' : 's'})
                  </Text>
                </View>
                <Text style={{ fontSize: 12.5, lineHeight: 18, color: '#92400E' }}>
                  Este pet foi encontrado na rua e está na primeira semana obrigatória de busca pelo tutor original. Caso o dono não apareça até o final deste prazo, a adoção responsável será oficialmente liberada.
                </Text>
              </View>
            ) : null
          )
        )}

        {/* Bairro e Data */}
        <View style={styles.locationGrid}>
          <View style={styles.locationCard}>
            <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: 'bold', marginBottom: 2 }}>
              {item.status === 'lost' ? 'Última vez visto' : 'Local onde foi encontrado'}
            </Text>
            <Text style={{ fontSize: 16, color: '#1F2937', fontWeight: 'bold', lineHeight: 22 }}>
              {formatCityState(item)}
            </Text>
            {formatStreetNumberNeighborhood(item) ? (
              <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 }}>
                {formatStreetNumberNeighborhood(item)}
              </Text>
            ) : null}
          </View>
          <View style={styles.locationCard}>
            <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: 'bold', marginBottom: 2 }}>Data</Text>
            <Text style={{ fontSize: 16, color: '#1F2937', fontWeight: 'bold' }}>{formatItemDate(item.date)}</Text>
          </View>
        </View>

        {/* Informações detalhadas do item, baseadas no tipo */}
        {item.category === 'animal' ? (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Informações do Animal</Text>
            <AnimalInfoRow
              icon={<MaterialIcons name="pets" size={18} color="#6B7280" />}
              label="Espécie"
              value={item.species}
            />
            <Separator />
            <AnimalInfoRow
              icon={<MaterialIcons name="wc" size={18} color="#6B7280" />}
              label="Sexo / Gênero"
              value={item.gender || item.extra_fields?.gender}
            />
            <Separator />
            <AnimalInfoRow
              icon={<MaterialIcons name="label" size={18} color="#6B7280" />}
              label="Raça"
              value={item.breed}
            />
            <Separator />
            <AnimalInfoRow
              icon={<MaterialIcons name="palette" size={18} color="#6B7280" />}
              label="Cor"
              value={item.color}
            />
            <Separator />
            <AnimalInfoRow
              icon={<MaterialIcons name="straighten" size={18} color="#6B7280" />}
              label="Porte"
              value={item.size}
            />
            <Separator />
            <AnimalInfoRow
              icon={<MaterialIcons name="event" size={18} color="#6B7280" />}
              label="Idade"
              value={item.age}
            />
          </View>
        ) : item.category === 'document' ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, margin: 16, marginTop: 8, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>Informações do Documento</Text>
            <View style={{ gap: 0 }}>
              <InfoRow label="Tipo de Documento" value={item.brand || item.extra_fields?.brand || 'Não informado'} />
              <Separator />
              <InfoRow label="Nome do Proprietário" value={item.extra_fields?.owner_name} />
              <Separator />
              <InfoRow label="Número do Documento" value={item.serial_number || item.extra_fields?.serial_number || 'Não informado'} />
            </View>
          </View>
        ) : item.category === 'object' ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, margin: 16, marginTop: 8, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>Informações do Objeto</Text>
            <View style={{ gap: 0 }}>
              <InfoRow label="Marca" value={item.brand || item.extra_fields?.brand || 'Não informado'} />
              <Separator />
              <InfoRow label="Cor" value={item.color || item.extra_fields?.color || 'Não informado'} />
              <Separator />
              <InfoRow label="Características" value={item.serial_number || item.extra_fields?.serial_number || 'Não informado'} />
            </View>
          </View>
        ) : item.category === 'electronics' ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, margin: 16, marginTop: 8, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>Informações do Eletrônico</Text>
            <View style={{ gap: 0 }}>
              <InfoRow label="Marca/Modelo" value={item.brand || item.extra_fields?.brand || 'Não informado'} />
              <Separator />
              <InfoRow label="Cor" value={item.color || item.extra_fields?.color || 'Não informado'} />
              <Separator />
              <InfoRow label="Número de Série/IMEI" value={item.serial_number || item.extra_fields?.serial_number || 'Não informado'} />
            </View>
          </View>
        ) : item.category === 'jewelry' ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, margin: 16, marginTop: 8, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>Informações da Joia/Acessório</Text>
            <View style={{ gap: 0 }}>
              <InfoRow label="Material" value={item.brand || item.extra_fields?.brand || 'Não informado'} />
              <Separator />
              <InfoRow label="Cor" value={item.color || item.extra_fields?.color || 'Não informado'} />
              <Separator />
              <InfoRow label="Marcas Distintivas" value={item.serial_number || item.extra_fields?.serial_number || 'Não informado'} />
            </View>
          </View>
        ) : item.category === 'clothing' ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, margin: 16, marginTop: 8, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>Informações da Roupa</Text>
            <View style={{ gap: 0 }}>
              <InfoRow label="Tamanho/Marca" value={item.brand || item.extra_fields?.brand || 'Não informado'} />
              <Separator />
              <InfoRow label="Cor" value={item.color || item.extra_fields?.color || 'Não informado'} />
              <Separator />
              <InfoRow label="Detalhes/Padrão" value={item.serial_number || item.extra_fields?.serial_number || 'Não informado'} />
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, margin: 16, marginTop: 8, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>Informações do Item</Text>
            <View style={{ gap: 0 }}>
              <InfoRow label="Marca/Tipo" value={item.brand || item.extra_fields?.brand || 'Não informado'} />
              <Separator />
              <InfoRow label="Cor" value={item.color || item.extra_fields?.color || 'Não informado'} />
              <Separator />
              <InfoRow label="Características" value={item.serial_number || item.extra_fields?.serial_number || 'Não informado'} />
            </View>
          </View>
        )}

        {/* Informações do Tutor / Dono Real quando publicado por terceiro */}
        {item.extra_fields?.third_party_owner?.active && item.extra_fields?.third_party_owner?.name && (
          <View style={{ backgroundColor: '#F0FDF4', borderRadius: 14, marginHorizontal: 16, marginTop: 16, marginBottom: 0, padding: 16, borderWidth: 1.5, borderColor: '#BBF7D0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <MaterialIcons name="person-pin" size={20} color="#16A34A" />
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#166534' }}>
                {item.status === 'lost' ? 'Tutor do Animal' : 'Responsável pelo Animal'}
              </Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>
              {item.extra_fields.third_party_owner.name}
            </Text>
            {item.extra_fields.third_party_owner.phone ? (
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#15803D' }}>
                📞 {item.extra_fields.third_party_owner.phone}
              </Text>
            ) : null}
            <Text style={{ fontSize: 12, color: '#15803D', opacity: 0.8, marginTop: 4 }}>
              * Anúncio realizado por terceiro em nome do tutor acima.
            </Text>
          </View>
        )}

        {/* Publicado por */}
        {owner && (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginTop: 16, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 }}>Publicado por</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              {owner.avatar_url ? (
                <Image source={{ uri: owner.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: '#E5E7EB' }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1F2937' }}>{owner.name}</Text>
                {owner.created_at && formatarDataMembro(owner.created_at) && formatarDataMembro(owner.created_at) !== 'não informado' && (
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Membro desde {formatarDataMembro(owner.created_at)}</Text>
                )}
                {item.created_at && (
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                    {(() => {
                      const data = new Date(item.created_at);
                      const dia = data.getDate().toString().padStart(2, '0');
                      const mes = data.toLocaleString('pt-BR', { month: 'long' });
                      const ano = data.getFullYear();
                      const hora = data.getHours().toString().padStart(2, '0');
                      const minuto = data.getMinutes().toString().padStart(2, '0');
                      return `Publicado em ${dia} de ${mes} de ${ano} às ${hora}:${minuto}`;
                    })()}
                  </Text>
                )}
                {isOwner && renewalInfo.canRenew && Number.isFinite(renewalInfo.daysRemaining) && (
                  <Text style={{ fontSize: 13, color: '#F59E0B', marginTop: 2 }}>
                    {renewalInfo.expired ? 'Esta publicação expirou.' : `Expira em ${renewalInfo.daysRemaining} dia${renewalInfo.daysRemaining === 1 ? '' : 's'}`}
                  </Text>
                )}
              </View>
            </View>
            {(isOwner || isAdmin) && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: '#F3F4F6',
                }}
              >
                {isOwner && (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      minWidth: '45%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#EFF6FF',
                      borderRadius: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                    }}
                    onPress={handleEditItem}
                  >
                    <MaterialIcons name="edit" size={16} color="#2563EB" />
                    <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 13, marginLeft: 6 }}>
                      Editar
                    </Text>
                  </TouchableOpacity>
                )}

                {isOwner && item.status === 'found' && item.extra_fields?.found_custody !== 'spotted' && (
                  itemsService.getAdoptionWaitingDays(item) > 0 && !item.extra_fields?.available_for_adoption ? (
                    <View
                      style={{
                        flex: 1,
                        minWidth: '45%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FEF3C7',
                        borderRadius: 8,
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                      }}
                    >
                      <MaterialIcons name="schedule" size={16} color="#B45309" />
                      <Text style={{ color: '#B45309', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>
                        Busca ({itemsService.getAdoptionWaitingDays(item)}d)
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        minWidth: '45%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: item.extra_fields?.available_for_adoption ? '#FDF2F8' : '#ECFDF5',
                        borderWidth: 1,
                        borderColor: item.extra_fields?.available_for_adoption ? '#F472B6' : '#A7F3D0',
                        borderRadius: 8,
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                      }}
                      onPress={handleToggleAdoption}
                      disabled={togglingAdoption}
                    >
                      <MaterialIcons
                        name="favorite"
                        size={16}
                        color={item.extra_fields?.available_for_adoption ? '#DB2777' : '#059669'}
                      />
                      <Text
                        style={{
                          color: item.extra_fields?.available_for_adoption ? '#DB2777' : '#059669',
                          fontWeight: 'bold',
                          fontSize: 12.5,
                          marginLeft: 6,
                        }}
                      >
                        {togglingAdoption
                          ? 'Atualizando...'
                          : item.extra_fields?.available_for_adoption
                          ? 'Pausar Adoção'
                          : 'Colocar p/ Adoção'}
                      </Text>
                    </TouchableOpacity>
                  )
                )}

                {isOwner && renewalInfo.canRenew && (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      minWidth: '45%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#F59E0B',
                      borderRadius: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                    }}
                    onPress={handleRenewItem}
                    disabled={renewing}
                  >
                    <MaterialIcons name="refresh" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginLeft: 6 }}>
                      {renewing ? 'Renovando...' : 'Renovar'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FEE2E2',
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: '#FECACA',
                  }}
                  onPress={handleDeleteItem}
                  disabled={deleting}
                >
                  <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                  <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 13, marginLeft: 6 }}>
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {!isOwner && !isAdmin && (
              <View style={{ marginTop: 8 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#2563EB',
                    borderRadius: 10,
                    paddingVertical: 13,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    shadowColor: '#2563EB',
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                  onPress={handleSendMessage}
                >
                  <MaterialIcons name="chat" size={19} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>
                    Enviar Mensagem
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {!isOwner && !isAdmin && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingVertical: 8 }}
                onPress={handleOpenReport}
              >
                <MaterialIcons name="flag" size={17} color="#B91C1C" />
                <Text style={{ color: '#B91C1C', fontWeight: '700', fontSize: 13, marginLeft: 6 }}>Denunciar publicação</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Botão de Compartilhar Cartaz Destacado */}
        <View style={{ marginHorizontal: 16, marginTop: 14 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#EFF6FF',
              borderWidth: 1.5,
              borderColor: '#2563EB',
              borderRadius: 12,
              paddingVertical: 12,
              gap: 8,
            }}
            onPress={() => setShareFlyerVisible(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="share" size={20} color="#2563EB" />
            <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 15 }}>
              Compartilhar Cartaz do Pet
            </Text>
          </TouchableOpacity>
        </View>

        {/* Comentários */}
        <View style={{ backgroundColor: '#fff', borderRadius: 14, margin: 16, marginTop: 16, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1F2937' }}>Comentários ({sightings.length})</Text>
            <TouchableOpacity style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }} onPress={handleReportSighting}>
              <MaterialIcons name="add-comment" size={18} color="#2563EB" />
              <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 13, marginLeft: 4 }}>Comentar</Text>
            </TouchableOpacity>
          </View>
          {sightings.length === 0 ? (
            <Text style={{ color: '#6B7280', textAlign: 'center', marginVertical: 16 }}>Nenhum comentário ainda. Seja o primeiro a comentar!</Text>
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
              return (
                <React.Fragment key={s.id || idx}>
                  <View style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      {s.profiles?.avatar_url ? (
                        <Image source={{ uri: s.profiles.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8, backgroundColor: '#E5E7EB' }} />
                      ) : (
                        <View style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8, backgroundColor: '#E5E7EB' }} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: 'bold', color: '#1F2937', fontSize: 14 }}>{s.profiles?.name || 'Usuário'}</Text>
                        <Text style={{ color: '#6B7280', fontSize: 11 }}>{new Date(s.created_at).toLocaleString('pt-BR')}</Text>
                      </View>
                      {/* Botões de editar/excluir se o usuário for o autor */}
                      {user && s.user_id === user.id && (
                        <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                          <TouchableOpacity onPress={() => handleEditComment(s)} style={{ marginRight: 8 }}>
                            <MaterialIcons name="edit" size={18} color="#2563EB" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteComment(s)}>
                            <MaterialIcons name="delete" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: '#374151', marginBottom: 4, fontSize: 13 }}>{s.description}</Text>
                    {s.location ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginVertical: 4, alignSelf: 'flex-start' }}>
                        <MaterialIcons name="location-on" size={14} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#1E40AF', fontSize: 12, fontWeight: '600' }}>{s.location}</Text>
                      </View>
                    ) : null}
                    {(instagram || whatsapp || facebook || contatoExtra) ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {instagram ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 4 }}>
                            <FontAwesome name="instagram" size={14} color="#C13584" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#2563EB', fontSize: 12, marginLeft: 2 }}>@{instagram}</Text>
                          </View>
                        ) : null}
                        {whatsapp ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 4 }}>
                            <FontAwesome name="whatsapp" size={14} color="#25D366" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#2563EB', fontSize: 12, marginLeft: 2 }}>{whatsapp}</Text>
                          </View>
                        ) : null}
                        {facebook ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 4 }}>
                            <FontAwesome name="facebook-square" size={14} color="#1877F3" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#2563EB', fontSize: 12, marginLeft: 2 }}>{facebook}</Text>
                          </View>
                        ) : null}
                        {contatoExtra ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 4 }}>
                            <Text style={{ color: '#2563EB', fontSize: 12, marginLeft: 2 }}>{contatoExtra}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  {idx < sightings.length - 1 && <Separator />}
                </React.Fragment>
              );
            })
          )}
        </View>

        <SightingModal
          visible={sightingModalVisible}
          onClose={() => setSightingModalVisible(false)}
          onSubmit={handleSubmitSighting}
          loading={sightingLoading}
        />

        <Modal
          visible={reportModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReportModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: '#1F2937', marginBottom: 6 }}>Denunciar publicação</Text>
              <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 14 }}>Escolha o motivo para enviar à equipe administrativa.</Text>
              {['Conteúdo falso ou enganoso', 'Conteúdo inadequado', 'Informações de contato suspeitas', 'Outro'].map(reason => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
                >
                  <MaterialIcons name={reportReason === reason ? 'radio-button-checked' : 'radio-button-unchecked'} size={21} color={reportReason === reason ? '#2563EB' : '#9CA3AF'} />
                  <Text style={{ color: '#374151', fontSize: 14, marginLeft: 9 }}>{reason}</Text>
                </TouchableOpacity>
              ))}
              <TextInput
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Detalhes adicionais (opcional)"
                multiline
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 9, padding: 10, minHeight: 70, marginTop: 8, textAlignVertical: 'top' }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 16 }}>
                <TouchableOpacity onPress={() => setReportModalVisible(false)} style={{ paddingVertical: 9 }}>
                  <Text style={{ color: '#6B7280', fontWeight: '700' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSubmitReport} disabled={reporting} style={{ backgroundColor: '#B91C1C', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{reporting ? 'Enviando...' : 'Enviar denúncia'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de edição de comentário */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCancelEditComment}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '85%' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Editar comentário</Text>
              <TextInput
                value={editCommentText}
                onChangeText={setEditCommentText}
                multiline
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, minHeight: 60, marginBottom: 10, fontSize: 15 }}
                placeholder="Digite seu comentário"
              />
              <TextInput
                value={editCommentLocation}
                onChangeText={setEditCommentLocation}
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 }}
                placeholder="Local (opcional)"
              />
              <TextInput
                value={editCommentFacebook}
                onChangeText={setEditCommentFacebook}
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 }}
                placeholder="Facebook (opcional)"
                autoCapitalize="none"
              />
              <TextInput
                value={editCommentInstagram}
                onChangeText={setEditCommentInstagram}
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 }}
                placeholder="Instagram (opcional)"
                autoCapitalize="none"
              />
              <TextInput
                value={editCommentWhatsapp}
                onChangeText={text => setEditCommentWhatsapp(text.replace(/[^0-9]/g, ''))}
                style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 }}
                placeholder="WhatsApp (apenas números)"
                keyboardType="numeric"
                maxLength={15}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={async () => {
                  const { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync, MediaTypeOptions } = await import('expo-image-picker');
                  const permissionResult = await requestMediaLibraryPermissionsAsync();
                  if (!permissionResult.granted) {
                    alert('Permissão para acessar fotos é necessária!');
                    return;
                  }
                  setEditUploading(true);
                  let pickerResult = await launchImageLibraryAsync({
                    mediaTypes: MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.7,
                  });
                  setEditUploading(false);
                  if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
                    setEditCommentPhotoUrl(pickerResult.assets[0].uri);
                  }
                }}
                style={{ marginBottom: 10, backgroundColor: '#E5E7EB', borderRadius: 8, padding: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#2563EB', fontWeight: 'bold' }}>{editUploading ? 'Abrindo galeria...' : (editCommentPhotoUrl ? 'Trocar foto' : 'Adicionar foto')}</Text>
              </TouchableOpacity>
              {editCommentPhotoUrl ? (
                <Image source={{ uri: editCommentPhotoUrl }} style={{ width: '100%', height: 110, borderRadius: 8, marginBottom: 10 }} />
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                <TouchableOpacity onPress={handleCancelEditComment} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                  <Text style={{ color: '#6B7280', fontWeight: 'bold', fontSize: 15 }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEditComment} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                  <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 15 }}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={{ height: 40 }} />
      </View>

      {/* Modal de visualização de foto em tela cheia */}
      <Modal
        visible={fullScreenPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenPhotoModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setFullScreenPhotoModal(false)}
            style={{ position: 'absolute', top: 48, right: 20, zIndex: 20, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 20, padding: 8 }}
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

      <ShareFlyerModal
        visible={shareFlyerVisible}
        onClose={() => setShareFlyerVisible(false)}
        item={item}
        imageUrl={photos?.[0]?.url}
      />
    </ScrollView>
  );
// Componente InfoRow para exibir label e valor alinhados (usado para outros tipos)
function InfoRow({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
      <Text style={{ fontSize: 15, color: '#6B7280', minWidth: 90 }}>{label}</Text>
      <Text style={{ fontSize: 15, color: '#1F2937', fontWeight: 'bold', marginLeft: 8 }}>{value || 'não informado'}</Text>
    </View>
  );
}

// Componente AnimalInfoRow para exibir campo com ícone, label, valor, fonte e fallback
function AnimalInfoRow({ icon, label, value }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36 }}>
      <View style={{ width: 28, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>{label}</Text>
        <Text style={{ fontSize: 15, color: '#1F2937', fontWeight: 600 }}>{value && value.trim() ? value : 'não informado'}</Text>
      </View>
    </View>
  );
}

// Linha separadora
function Separator() {
  return <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 6 }} />;
}
};

const styles = StyleSheet.create({
  detailPage: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  heroImageItem: {
    width: '100%',
    height: 280,
  },
  detailShareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
  },
  introSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  foundPill: { backgroundColor: '#DCFCE7' },
  lostPill: { backgroundColor: '#FFEDD5' },
  statusPillText: { fontSize: 12, fontWeight: '800' },
  detailTitle: {
    color: '#0F172A',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailDescription: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  locationGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 10,
  },
  locationCard: {
    flex: 1,
    minHeight: 82,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 0,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  bannerContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: 220,
  },
  badgesRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  badgeLost: {
    backgroundColor: '#FEE2E2',
  },
  badgeFound: {
    backgroundColor: '#DCFCE7',
  },
  badgeText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  badgeLostText: {
    color: '#DC2626',
  },
  badgeFoundText: {
    color: '#059669',
  },
  badgeCategory: {
    backgroundColor: '#DBEAFE',
  },
  badgeCategoryText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 13,
  },
  noPhotoContainer: {
    flex: 1,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  noPhotoText: {
    marginTop: 8,
    color: '#9CA3AF',
    fontSize: 14,
  },
  contentContainer: {
    padding: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  shortDescription: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 10,
  },
  infoRowGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  extraFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
    backgroundColor: '#E5E7EB',
  },
  ownerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  ownerSince: {
    fontSize: 12,
    color: '#6B7280',
  },
  messageButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
    opacity: 1,
  },
  messageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
  callButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  ownerActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    justifyContent: 'flex-end',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  editButtonText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 6,
  },
  commentsCountBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    paddingHorizontal: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
  commentsCountText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 13,
  },
  addCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addCommentButtonText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 4,
  },
  commentCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  commentAuthor: {
    fontWeight: 'bold',
    color: '#1F2937',
    fontSize: 14,
  },
  commentDate: {
    color: '#6B7280',
    fontSize: 11,
  },
  commentText: {
    color: '#374151',
    marginBottom: 4,
    fontSize: 13,
  },
  commentImage: {
    width: '100%',
    height: 110,
    borderRadius: 8,
    marginBottom: 4,
  },
  commentLocation: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 2,
  },
  commentContactsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  commentContactTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  commentContactText: {
    color: '#2563EB',
    fontSize: 12,
    marginLeft: 2,
  },
  spacer: {
    height: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default ItemDetailScreen;
