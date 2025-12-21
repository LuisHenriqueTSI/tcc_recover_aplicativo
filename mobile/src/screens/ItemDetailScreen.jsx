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
} from 'react-native';
import { MaterialIcons, FontAwesome, FontAwesome5, Entypo } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import * as itemsService from '../services/items';

import Card from '../components/Card';
import Button from '../components/Button';

import SightingModal from '../components/SightingModal';
import * as sightingsService from '../services/sightings';


const ItemDetailScreen = ({ route, navigation }) => {
  const { itemId } = route.params;
  const { user, isAdmin } = useAuth();
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

  useEffect(() => {
    navigation.setOptions({
      title: 'Detalhes do Item',
      headerStyle: {
        backgroundColor: '#4F46E5',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
        color: '#fff',
      },
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 8 }}>
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
      const itemData = await itemsService.getItemById(itemId);
      if (itemData) {
        setItem(itemData);
        // Log para depuração do array de fotos
        if (itemData.item_photos && Array.isArray(itemData.item_photos)) {
          console.log('[ItemDetailScreen] Fotos retornadas:', itemData.item_photos);
          itemData.item_photos.forEach((photo, idx) => {
            console.log(`[ItemDetailScreen] Foto[${idx}]:`, photo);
          });
        } else {
          console.log('[ItemDetailScreen] Nenhuma foto retornada ou formato inesperado:', itemData.item_photos);
        }
        setPhotos(itemData.item_photos || []);
        setOwner(itemData.profiles);
        // Rewards would come from a separate query if needed
      } else {
        Alert.alert('Erro', 'Item não encontrado');
        navigation.goBack();
      }
    } catch (error) {
      console.error('[ItemDetailScreen] Erro ao carregar:', error);
      Alert.alert('Erro', 'Falha ao carregar detalhes do item');
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

  const handleDeleteItem = () => {
    Alert.alert(
      'Excluir Item',
      'Tem certeza que deseja excluir este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive', onPress: async () => {
            setDeleting(true);
            try {
              await itemsService.deleteItem(itemId);
              Alert.alert('Sucesso', 'Item excluído com sucesso!');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir item: ' + error.message);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
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
      'Confirma que este item foi encontrado/devolvido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await itemsService.markItemAsResolved(itemId);
              Alert.alert('Sucesso', 'Item marcado como resolvido!');
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
      Alert.alert('Login Necessário', 'Faça login para enviar mensagens');
      navigation.navigate('Login');
      return;
    }
    if (!item) return;
    // Mensagem automática depende do papel do usuário
    let initialMessage = '';
    if (item.status === 'lost') {
      if (user.id === item.owner_id) {
        initialMessage = 'Oi, você achou meu item?';
      } else {
        initialMessage = 'Oi, eu encontrei seu item!';
      }
    } else if (item.status === 'found') {
      if (user.id === item.owner_id) {
        initialMessage = 'Oi, você encontrou meu item?';
      } else {
        initialMessage = 'Oi, você achou meu item?';
      }
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
      Alert.alert('Login Necessário', 'Faça login para comentar');
      navigation.navigate('Login');
      return;
    }
    setSightingModalVisible(true);
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
      Alert.alert('Sucesso', 'Comentário enviado!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível enviar o comentário.');
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
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Item não encontrado</Text>
      </View>
    );
  }

  // NOVO DESIGN INSPIRADO NO ANEXO
  return (
    <ScrollView style={{ backgroundColor: '#F9FAFB' }} showsVerticalScrollIndicator={false}>
      <View style={{ padding: 0, margin: 0 }}>
        {/* Fotos do animal no topo */}
        <View style={{ width: '100%', height: 240, backgroundColor: '#E5E7EB', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, overflow: 'hidden', marginBottom: 0 }}>
          {photos && photos.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ width: '100%', height: 240 }} contentContainerStyle={{ flexGrow: 1 }}>
              {photos.map((photo, idx) => (
                <View key={photo.id || idx} style={{ width: '100%', height: 240 }}>
                  <Image
                    source={{ uri: photo.url }}
                    style={{ width: '100%', height: 240, resizeMode: 'cover' }}
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, height: 240, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
              <MaterialIcons name="image-not-supported" size={48} color="#D1D5DB" />
              <Text style={{ marginTop: 8, color: '#9CA3AF', fontSize: 14 }}>Sem foto</Text>
            </View>
          )}
        </View>

        {/* Título e descrição */}
    <View style={{ padding: 24, paddingBottom: 0 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 }}>{item.title}</Text>
      <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 12 }}>{item.description}</Text>
    </View>

        {/* Bairro e Data */}
        <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 24, marginTop: 8, marginBottom: 8 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'flex-start', justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: 'bold', marginBottom: 2 }}>Bairro</Text>
            <Text style={{ fontSize: 16, color: '#1F2937', fontWeight: 'bold' }}>{item.neighborhood || '-'}</Text>
            <Text style={{ fontSize: 13, color: '#6B7280' }}>{item.city}, {item.state}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'flex-start', justifyContent: 'center', borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: 'bold', marginBottom: 2 }}>Data</Text>
            <Text style={{ fontSize: 16, color: '#1F2937', fontWeight: 'bold' }}>{new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
          </View>
        </View>

        {/* Informações detalhadas do item, baseadas no tipo */}
        {item.category === 'animal' ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, margin: 16, marginTop: 8, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>Informações do Animal</Text>
            <AnimalInfoRow
              icon={<MaterialIcons name="pets" size={18} color="#6B7280" />}
              label="Espécie"
              value={item.species}
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
            <Separator />
            <AnimalInfoRow
              icon={<MaterialIcons name="style" size={18} color="#6B7280" />}
              label="Coleira"
              value={item.collar}
            />
            <Separator />
            <AnimalInfoRow
              icon={<MaterialIcons name="tag" size={18} color="#6B7280" />}
              label="Microchipado"
              value={item.microchip}
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
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Membro desde {owner.created_at ? new Date(owner.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : ''}</Text>
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
              </View>
            </View>
            {isOwner && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 0, justifyContent: 'flex-end', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, marginRight: 4 }}
                  onPress={handleEditItem}
                >
                  <MaterialIcons name="edit" size={18} color="#6366F1" />
                  <Text style={{ color: '#6366F1', fontWeight: 'bold', fontSize: 13, marginLeft: 4 }}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DC2626', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 }}
                  onPress={handleDeleteItem}
                  disabled={deleting}
                >
                  <MaterialIcons name="delete" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, marginLeft: 4 }}>{deleting ? 'Excluindo...' : 'Excluir'}</Text>
                </TouchableOpacity>
              </View>
            )}
            {!isOwner && (
              <TouchableOpacity style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff', marginTop: 8 }} onPress={handleSendMessage}>
                <Text style={{ color: '#374151', fontWeight: 'bold', fontSize: 15 }}>Enviar Mensagem</Text>
              </TouchableOpacity>
            )}
          </View>
        )}


        {/* Contato Rápido */}
        {owner && owner.phone && (
          <View style={{ backgroundColor: '#fff', borderRadius: 14, margin: 16, marginTop: 16, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 }}>Contato Rápido</Text>
            <TouchableOpacity style={{ backgroundColor: '#3B82F6', borderRadius: 8, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }} onPress={() => {}}>
              <MaterialIcons name="call" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>Ligar para {owner.name}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Comentários */}
        <View style={{ backgroundColor: '#fff', borderRadius: 14, margin: 16, marginTop: 16, marginBottom: 0, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1F2937' }}>Comentários ({sightings.length})</Text>
            <TouchableOpacity style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }} onPress={handleReportSighting}>
              <MaterialIcons name="add-comment" size={18} color="#6366F1" />
              <Text style={{ color: '#6366F1', fontWeight: 'bold', fontSize: 13, marginLeft: 4 }}>Comentar</Text>
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
                            <MaterialIcons name="edit" size={18} color="#6366F1" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteComment(s)}>
                            <MaterialIcons name="delete" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: '#374151', marginBottom: 4, fontSize: 13 }}>{s.description}</Text>
                    {s.photo_url ? (
                      <Image source={{ uri: s.photo_url }} style={{ width: '100%', height: 110, borderRadius: 8, marginBottom: 4 }} />
                    ) : null}
                    {s.location ? <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 2 }}>Local: {s.location}</Text> : null}
                    {(instagram || whatsapp || facebook || contatoExtra) ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {instagram ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 4 }}>
                            <FontAwesome name="instagram" size={14} color="#C13584" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#6366F1', fontSize: 12, marginLeft: 2 }}>@{instagram}</Text>
                          </View>
                        ) : null}
                        {whatsapp ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 4 }}>
                            <FontAwesome name="whatsapp" size={14} color="#25D366" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#6366F1', fontSize: 12, marginLeft: 2 }}>{whatsapp}</Text>
                          </View>
                        ) : null}
                        {facebook ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 4 }}>
                            <FontAwesome name="facebook-square" size={14} color="#1877F3" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#6366F1', fontSize: 12, marginLeft: 2 }}>{facebook}</Text>
                          </View>
                        ) : null}
                        {contatoExtra ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 4 }}>
                            <Text style={{ color: '#6366F1', fontSize: 12, marginLeft: 2 }}>{contatoExtra}</Text>
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
                <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>{editUploading ? 'Abrindo galeria...' : (editCommentPhotoUrl ? 'Trocar foto' : 'Adicionar foto')}</Text>
              </TouchableOpacity>
              {editCommentPhotoUrl ? (
                <Image source={{ uri: editCommentPhotoUrl }} style={{ width: '100%', height: 110, borderRadius: 8, marginBottom: 10 }} />
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                <TouchableOpacity onPress={handleCancelEditComment} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                  <Text style={{ color: '#6B7280', fontWeight: 'bold', fontSize: 15 }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEditComment} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                  <Text style={{ color: '#4F46E5', fontWeight: 'bold', fontSize: 15 }}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={{ height: 40 }} />
      </View>
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
    backgroundColor: '#E0E7FF',
  },
  badgeCategoryText: {
    color: '#6366F1',
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
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  editButtonText: {
    color: '#6366F1',
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
    backgroundColor: '#E0E7FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
  commentsCountText: {
    color: '#6366F1',
    fontWeight: 'bold',
    fontSize: 13,
  },
  addCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addCommentButtonText: {
    color: '#6366F1',
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
    color: '#6366F1',
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
