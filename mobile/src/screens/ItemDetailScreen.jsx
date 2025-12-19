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
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [owner, setOwner] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [sightings, setSightings] = useState([]);
  const [sightingModalVisible, setSightingModalVisible] = useState(false);
  const [sightingLoading, setSightingLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Detalhes do Item',
      headerStyle: {
        backgroundColor: '#4F46E5',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
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
    navigation.navigate('RegisterItem', {
      editItem: item,
    });
  };

  const handleDeleteItem = () => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await itemsService.deleteItem(itemId);
              Alert.alert('Sucesso', 'Item excluído com sucesso');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir item: ' + error.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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
    navigation.navigate('ChatScreen', {
      conversation: {
        otherId: item.owner_id,
        itemId: itemId,
        otherName: owner?.name || 'Usuário'
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

  const isOwner = user && item && item.owner_id === user.id;

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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Banner/Fotos do Item */}
      <View style={styles.bannerContainer}>
        {photos && photos.length > 0 ? (
          <Image
            source={{ uri: photos[0].url }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noPhotoContainer}>
            <MaterialIcons name="image-not-supported" size={48} color="#D1D5DB" />
            <Text style={styles.noPhotoText}>Sem foto</Text>
          </View>
        )}
        {/* Badges de status/categoria */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, item.status === 'lost' ? styles.badgeLost : styles.badgeFound]}>
            <Text style={[styles.badgeText, item.status === 'lost' ? styles.badgeLostText : styles.badgeFoundText]}>
              {item.status === 'lost' ? 'Perdido' : 'Encontrado'}
            </Text>
          </View>
          {item.category && (
            <View style={[styles.badge, styles.badgeCategory]}>
              <Text style={styles.badgeCategoryText}>{item.category}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* Título e descrição curta */}
        <Text style={styles.title}>{item.title}</Text>
        {item.short_description && (
          <Text style={styles.shortDescription}>{item.short_description}</Text>
        )}

        {/* Local e Data */}
        <View style={styles.infoRowGroup}>
          <View style={styles.infoBox}>
            <MaterialIcons name="location-on" size={18} color="#6366F1" />
            <Text style={styles.infoBoxText}>{item.location}</Text>
          </View>
          <View style={styles.infoBox}>
            <MaterialIcons name="calendar-today" size={18} color="#6366F1" />
            <Text style={styles.infoBoxText}>{new Date(item.date).toLocaleDateString('pt-BR')}</Text>
          </View>
        </View>

        {/* Informações detalhadas (Animal, Documento, Objeto, etc) */}
        {item.extra_fields && Object.keys(item.extra_fields).length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Informações do {item.category || 'Item'}</Text>
            {Object.entries(item.extra_fields).map(([key, value]) => {
              const labels = {
                brand: 'Marca',
                color: 'Cor',
                serial_number: 'Número de Série',
                model: 'Modelo',
                size: 'Tamanho',
                type: 'Tipo',
                description: 'Descrição',
                race: 'Raça',
                age: 'Idade',
                collar: 'Coleira',
                microchip: 'Microchipado',
                owner_name: 'Nome do Proprietário',
                document_number: 'Número do Documento',
                features: 'Características',
              };
              const label = labels[key] || key;
              return (
                <View key={key} style={styles.extraFieldRow}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <Text style={styles.fieldValue}>{value}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Descrição longa */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Descrição</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        {/* Usuário que publicou */}
        {owner && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Publicado por</Text>
            <View style={styles.ownerRow}>
              {owner.avatar_url ? (
                <Image source={{ uri: owner.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerName}>{owner.name}</Text>
                <Text style={styles.ownerSince}>Membro desde {owner.created_at ? new Date(owner.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : ''}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage} disabled={isOwner}>
              <Text style={styles.messageButtonText}>Enviar Mensagem</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Contato rápido (ligar) */}
        {owner && owner.phone && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Contato Rápido</Text>
            <TouchableOpacity style={styles.callButton} onPress={() => {}}>
              <MaterialIcons name="call" size={20} color="#fff" />
              <Text style={styles.callButtonText}>Ligar para {owner.name}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botões de editar/excluir para o dono */}
        {isOwner && (
          <View style={styles.ownerActionsRow}>
            <TouchableOpacity onPress={handleEditItem} style={styles.editButton} accessibilityLabel="Editar">
              <MaterialIcons name="edit" size={20} color="#6366F1" />
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteItem} style={styles.deleteButton} accessibilityLabel="Excluir" disabled={deleting}>
              <MaterialIcons name="delete" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Comentários */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Comentários</Text>
            <View style={styles.commentsCountBadge}>
              <Text style={styles.commentsCountText}>{sightings.length}</Text>
            </View>
            <TouchableOpacity style={styles.addCommentButton} onPress={handleReportSighting}>
              <MaterialIcons name="add-comment" size={18} color="#6366F1" />
              <Text style={styles.addCommentButtonText}>Comentar</Text>
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
                <View key={s.id || idx} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    {s.profiles?.avatar_url ? (
                      <Image source={{ uri: s.profiles.avatar_url }} style={styles.commentAvatar} />
                    ) : (
                      <View style={styles.commentAvatarPlaceholder} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.commentAuthor}>{s.profiles?.name || 'Usuário'}</Text>
                      <Text style={styles.commentDate}>{new Date(s.created_at).toLocaleString('pt-BR')}</Text>
                    </View>
                  </View>
                  <Text style={styles.commentText}>{s.description}</Text>
                  {s.photo_url ? (
                    <Image source={{ uri: s.photo_url }} style={styles.commentImage} />
                  ) : null}
                  {s.location ? <Text style={styles.commentLocation}>Local: {s.location}</Text> : null}
                  {(instagram || whatsapp || facebook || contatoExtra) ? (
                    <View style={styles.commentContactsRow}>
                      {instagram ? (
                        <View style={styles.commentContactTag}>
                          <FontAwesome name="instagram" size={14} color="#C13584" style={{ marginRight: 4 }} />
                          <Text style={styles.commentContactText}>@{instagram}</Text>
                        </View>
                      ) : null}
                      {whatsapp ? (
                        <View style={styles.commentContactTag}>
                          <FontAwesome name="whatsapp" size={14} color="#25D366" style={{ marginRight: 4 }} />
                          <Text style={styles.commentContactText}>{whatsapp}</Text>
                        </View>
                      ) : null}
                      {facebook ? (
                        <View style={styles.commentContactTag}>
                          <FontAwesome name="facebook-square" size={14} color="#1877F3" style={{ marginRight: 4 }} />
                          <Text style={styles.commentContactText}>{facebook}</Text>
                        </View>
                      ) : null}
                      {contatoExtra ? (
                        <View style={styles.commentContactTag}>
                          <Text style={styles.commentContactText}>{contatoExtra}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
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

        <View style={styles.spacer} />
      </View>
    </ScrollView>
  );
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
    backgroundColor: '#6366F1',
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
