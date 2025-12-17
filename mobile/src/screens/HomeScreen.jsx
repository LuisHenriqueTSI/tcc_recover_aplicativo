import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Modal, TextInput } from 'react-native';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';
import { supabase } from '../lib/supabase';
import { getUser } from '../services/user';
import { sendMessage } from '../services/messages';
import Card from '../components/Card';
import ShareButton from '../components/ShareButton';
// Get screen width for carousel
const SCREEN_WIDTH = Dimensions.get('window').width;
import Button from '../components/Button';
import Input from '../components/Input';
import { MaterialIcons } from '@expo/vector-icons';

// ItemCard agora é um componente fora do HomeScreen
const ItemCard = ({ item, user, thumbnails, handleSendMessage }) => {
  const [carouselIndex, setCarouselIndex] = React.useState(0);
  // Cores para status e categoria
  const statusColor = item.status === 'lost' ? '#F87171' : '#34D399';
  const statusLabel = item.status === 'lost' ? 'Perdido' : 'Encontrado';
  const categoryColors = {
    animal: { bg: '#E0E7FF', text: '#6366F1', label: 'Animal' },
    object: { bg: '#FEF3C7', text: '#F59E42', label: 'Objeto' },
    document: { bg: '#FDE68A', text: '#B45309', label: 'Documento' },
    other: { bg: '#F3F4F6', text: '#6B7280', label: 'Outro' },
  };
  const cat = categoryColors[item.category] || categoryColors.other;
  const photos = item.item_photos && item.item_photos.length > 0 ? item.item_photos : (thumbnails[item.id] ? [{ url: thumbnails[item.id] }] : []);
  const showCarousel = photos.length > 1;
  return (
    <Card style={{ padding: 0, marginHorizontal: 12, marginVertical: 14, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}>
      {/* Imagem/Carrossel */}
      <View style={{ position: 'relative', width: '100%', height: 180 }}>
        {photos.length > 0 ? (
          <>
            {showCarousel ? (
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(photo, idx) => photo.id ? String(photo.id) : String(idx)}
                renderItem={({ item: photo }) => (
                  <Image
                    source={{ uri: photo.url }}
                    style={{ width: SCREEN_WIDTH - 24, height: 180, backgroundColor: '#F3F4F6' }}
                    resizeMode="cover"
                  />
                )}
                onMomentumScrollEnd={e => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 24));
                  setCarouselIndex(index);
                }}
                style={{ width: SCREEN_WIDTH - 24 }}
                snapToInterval={SCREEN_WIDTH - 24}
                decelerationRate="fast"
              />
            ) : (
              <Image
                source={{ uri: photos[0].url }}
                style={{ width: '100%', height: 180, backgroundColor: '#F3F4F6' }}
                resizeMode="cover"
              />
            )}
            {/* Indicador de múltiplas imagens estilo Instagram */}
            {showCarousel && (
              <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 4 }}>
                {photos.slice(0, 5).map((photo, idx) => (
                  <View key={photo.id || idx} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: idx === carouselIndex ? '#fff' : '#d1d5db', marginHorizontal: 2, opacity: 0.8 }} />
                ))}
                {photos.length > 5 && (
                  <Text style={{ color: '#fff', fontSize: 10, marginLeft: 4, opacity: 0.8 }}>+{photos.length - 5}</Text>
                )}
              </View>
            )}
          </>
        ) : (
          <View style={{ width: '100%', height: 180, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#9CA3AF' }}>Sem foto</Text>
          </View>
        )}
        {/* Botão de Compartilhar no canto superior direito */}
        <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
          <ShareButton item={item} imageUrl={photos[carouselIndex]?.url || (photos[0]?.url)} />
        </View>
      </View>
      {/* Tags */}
      <View style={{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', gap: 8 }}>
        <View style={{ backgroundColor: statusColor, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{statusLabel}</Text>
        </View>
        <View style={{ backgroundColor: cat.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 6 }}>
          <Text style={{ color: cat.text, fontWeight: 'bold', fontSize: 12 }}>{cat.label}</Text>
        </View>
      </View>
      {/* Conteúdo */}
      <View style={{ padding: 18 }}>
        <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 }}>{item.title}</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>{item.description}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <MaterialIcons name="place" size={16} color="#9CA3AF" style={{ marginRight: 2 }} />
          <Text style={{ fontSize: 13, color: '#9CA3AF', marginRight: 12 }}>{item.location}</Text>
          <MaterialIcons name="event" size={15} color="#9CA3AF" style={{ marginRight: 2 }} />
          <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: '500' }}>{item.owner_name}</Text>
          {user && item.owner_id !== user.id && (
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E42', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }} onPress={() => handleSendMessage(item.owner_id, item.id, item.status)}>
              <MaterialIcons name="chat" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Contato</Text>
            </TouchableOpacity>
          )}
          {!user && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, opacity: 0.7 }}
              onPress={() => alert('Faça login para usar esta funcionalidade.')}
              disabled
            >
              <MaterialIcons name="chat" size={18} color="#9CA3AF" style={{ marginRight: 4 }} />
              <Text style={{ color: '#9CA3AF', fontWeight: 'bold', fontSize: 13 }}>Contato</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );
};

const HomeScreen = ({ navigation }) => {
  const { user, userProfile, setUserProfile } = useAuth();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    showMyItems: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  // Localidade padrão do usuário, mas permite alterar livremente
  const [locationFilter, setLocationFilter] = useState('');
  const [locationFilterTouched, setLocationFilterTouched] = useState(false);
  // Modal de edição de localidade
  const [editLocationModal, setEditLocationModal] = useState(false);
  const [editLocationValue, setEditLocationValue] = useState('');

  // Atualiza localidade sempre que a tela ganha foco (ex: após editar perfil)
  useFocusEffect(
    React.useCallback(() => {
      if (userProfile?.location && !locationFilterTouched) {
        setLocationFilter(userProfile.location);
      }
    }, [userProfile, locationFilterTouched])
  );
  const [expandedItem, setExpandedItem] = useState(null);
  const [expandedItemDetails, setExpandedItemDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [thumbnails, setThumbnails] = useState({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const loadItems = async () => {
    try {
      setLoading(true);
      let allItems = [];
      if (searchTerm && searchTerm.trim().length > 0) {
        allItems = await itemsService.searchItems(searchTerm.trim());
      } else {
        const baseFilters = {};
        if (filters.status !== 'all') baseFilters.status = filters.status;
        if (filters.category !== 'all') baseFilters.category = filters.category;
        if (filters.showMyItems && user) baseFilters.owner_id = user.id;
        if (locationFilter) baseFilters.location = locationFilter;
        allItems = await itemsService.listItems(baseFilters);
      }
      // Buscar fotos de cada item
      const itemsWithPhotos = await Promise.all(
        (allItems || []).map(async (item) => {
          // Buscar fotos desse item
          const { data: photos, error: photosError } = await supabase
            .from('item_photos')
            .select('id, url')
            .eq('item_id', item.id);
          // Buscar nome do dono
          let owner_name = 'Usuário';
          if (item.owner_id) {
            const owner = await getUser(item.owner_id);
            owner_name = owner?.name || owner?.email || 'Usuário';
          }
          return {
            ...item,
            owner_name,
            item_photos: photos || [],
          };
        })
      );
      setItems(itemsWithPhotos);
      applyFilters(itemsWithPhotos);
      const ids = (allItems || []).map(i => i.id);
      const thumbsMap = await itemsService.getItemThumbnails(ids);
      setThumbnails(thumbsMap || {});
    } catch (error) {
      setItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Sempre recarregar itens ao mudar locationFilter
  useEffect(() => {
    if (locationFilter) {
      loadItems();
    }
  }, [locationFilter]);

  // Carregar detalhes do item quando expandir
  const handleExpandItem = async (itemId) => {
    if (expandedItem === itemId) {
      // Recolher
      setExpandedItem(null);
      setExpandedItemDetails(null);
      return;
    }

    // Expandir
    setExpandedItem(itemId);
    setLoadingDetails(true);

    try {
      const details = await itemsService.getItemDetails(itemId);
      setExpandedItemDetails(details);
    } catch (error) {
      console.log('[HomeScreen] Erro ao carregar detalhes:', error.message);
      setExpandedItemDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const applyFilters = (itemsToFilter) => {
    let filtered = itemsToFilter;

    if (filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    if (filters.showMyItems && user) {
      filtered = filtered.filter(item => item.owner_id === user?.id);
    }

    if (locationFilter && locationFilter.trim().length > 0) {
      const lf = locationFilter.trim().toLowerCase();
      console.log('[HomeScreen] Aplicando filtro de localização:', lf);
      filtered = filtered.filter(item => {
        const itemLocation = (item.location || '').toLowerCase();
        const matches = itemLocation.includes(lf);
        if (matches) {
          console.log('[HomeScreen] Item encontrado:', item.title, '-', item.location);
        }
        return matches;
      });
    }

    console.log('[HomeScreen] Itens após filtros:', filtered.length);
    setFilteredItems(filtered);
    // Reset expansão ao trocar filtros para evitar blocos estranhos
    setExpandedItem(null);
    setExpandedItemDetails(null);
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    applyFilters(items);
  }, [filters, user, locationFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  // Disable "Meus Itens" filter if not authenticated
  const handleMyItemsToggle = () => {
    if (!user) {
      alert('Faça login para ver seus itens');
      navigation.navigate('Login');
      return;
    }
    setFilters({ ...filters, showMyItems: !filters.showMyItems });
  };

  // Abre o chat com o dono do item
  // Preenche mensagem automática ao abrir o chat
  const handleSendMessage = (ownerId, itemId, itemStatus) => {
    if (!user) {
      alert('Faça login para enviar mensagens');
      navigation.navigate('Login');
      return;
    }
    if (ownerId === user.id) {
      alert('Este é o seu próprio item.');
      return;
    }
    // Define mensagem automática
    let autoMessage = '';
    if (itemStatus === 'lost') {
      autoMessage = 'Oi, eu achei seu item';
    } else {
      autoMessage = 'Oi, você encontrou meu item?';
    }
    navigation.navigate('ChatScreen', {
      conversation: {
        otherId: ownerId,
        itemId: itemId,
      },
      draftMessage: autoMessage,
    });
  };

  const handleReportSighting = () => {
    if (!user) {
      alert('Faça login para reportar avistamentos');
      navigation.navigate('Login');
      return;
    }
    // TODO: Implement report sighting flow
  };

  const handleEditItem = (item) => {
    navigation.navigate('RegisterItem', { editItem: item });
  };

  const handleDeleteItem = async (itemId) => {
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
              setLoading(true);
              await itemsService.deleteItem(itemId);
              Alert.alert('Sucesso', 'Item excluído com sucesso');
              loadItems(); // Reload list
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir item: ' + error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkAsResolved = async (itemId) => {
    Alert.alert(
      'Marcar como Resolvido',
      'Confirma que este item foi encontrado/devolvido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoading(true);
              await itemsService.markItemAsResolved(itemId);
              Alert.alert('Sucesso', 'Item marcado como resolvido!');
              loadItems(); // Reload list
            } catch (error) {
              Alert.alert('Erro', 'Falha ao marcar como resolvido: ' + error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenItemDetail = (itemId) => {
    navigation.navigate('ItemDetail', { itemId });
  };

  // Novo componente para o card com carrossel
  const ItemCard = ({ item }) => {
    const [carouselIndex, setCarouselIndex] = React.useState(0);
    // Cores para status e categoria
    const statusColor = item.status === 'lost' ? '#F87171' : '#34D399';
    const statusLabel = item.status === 'lost' ? 'Perdido' : 'Encontrado';
    const categoryColors = {
      animal: { bg: '#E0E7FF', text: '#6366F1', label: 'Animal' },
      object: { bg: '#FEF3C7', text: '#F59E42', label: 'Objeto' },
      document: { bg: '#FDE68A', text: '#B45309', label: 'Documento' },
      other: { bg: '#F3F4F6', text: '#6B7280', label: 'Outro' },
    };
    const cat = categoryColors[item.category] || categoryColors.other;
    const photos = item.item_photos && item.item_photos.length > 0 ? item.item_photos : (thumbnails[item.id] ? [{ url: thumbnails[item.id] }] : []);
    const showCarousel = photos.length > 1;
    return (
      <Card style={{ padding: 0, marginHorizontal: 12, marginVertical: 14, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}>
        {/* Imagem/Carrossel */}
        <View style={{ position: 'relative', width: '100%', height: 180 }}>
          {photos.length > 0 ? (
            <>
              {showCarousel ? (
                <FlatList
                  data={photos}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(photo, idx) => photo.id ? String(photo.id) : String(idx)}
                  renderItem={({ item: photo }) => (
                    <Image
                      source={{ uri: photo.url }}
                      style={{ width: SCREEN_WIDTH - 24, height: 180, backgroundColor: '#F3F4F6' }}
                      resizeMode="cover"
                    />
                  )}
                  onMomentumScrollEnd={e => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 24));
                    setCarouselIndex(index);
                  }}
                  style={{ width: SCREEN_WIDTH - 24 }}
                  snapToInterval={SCREEN_WIDTH - 24}
                  decelerationRate="fast"
                />
              ) : (
                <Image
                  source={{ uri: photos[0].url }}
                  style={{ width: '100%', height: 180, backgroundColor: '#F3F4F6' }}
                  resizeMode="cover"
                />
              )}
              {/* Indicador de múltiplas imagens estilo Instagram */}
              {showCarousel && (
                <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 4 }}>
                  {photos.slice(0, 5).map((photo, idx) => (
                    <View key={photo.id || idx} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: idx === carouselIndex ? '#fff' : '#d1d5db', marginHorizontal: 2, opacity: 0.8 }} />
                  ))}
                  {photos.length > 5 && (
                    <Text style={{ color: '#fff', fontSize: 10, marginLeft: 4, opacity: 0.8 }}>+{photos.length - 5}</Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={{ width: '100%', height: 180, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF' }}>Sem foto</Text>
            </View>
          )}
          {/* Botão de Compartilhar no canto superior direito */}
          <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
            <ShareButton item={item} imageUrl={photos[carouselIndex]?.url || (photos[0]?.url)} />
          </View>
        </View>
        {/* Tags */}
        <View style={{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', gap: 8 }}>
          <View style={{ backgroundColor: statusColor, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{statusLabel}</Text>
          </View>
          <View style={{ backgroundColor: cat.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginLeft: 6 }}>
            <Text style={{ color: cat.text, fontWeight: 'bold', fontSize: 12 }}>{cat.label}</Text>
          </View>
        </View>
        {/* Conteúdo */}
        <View style={{ padding: 18 }}>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 }}>{item.title}</Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>{item.description}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialIcons name="place" size={16} color="#9CA3AF" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginRight: 12 }}>{item.location}</Text>
            <MaterialIcons name="event" size={15} color="#9CA3AF" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{new Date(item.date).toLocaleDateString()}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: '500' }}>{item.owner_name}</Text>
            {user && item.owner_id !== user.id && (
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E42', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }} onPress={() => handleSendMessage(item.owner_id, item.id, item.status)}>
                <MaterialIcons name="chat" size={18} color="#fff" style={{ marginRight: 4 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Contato</Text>
              </TouchableOpacity>
            )}
            {!user && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, opacity: 0.7 }}
                onPress={() => alert('Faça login para usar esta funcionalidade.')}
                disabled
              >
                <MaterialIcons name="chat" size={18} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text style={{ color: '#9CA3AF', fontWeight: 'bold', fontSize: 13 }}>Contato</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Localidade do usuário */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 18, marginBottom: 2 }}>
        <MaterialIcons name="place" size={20} color="#F59E42" style={{ marginRight: 4 }} />
        <Text style={{ fontWeight: 'bold', color: '#4F46E5', fontSize: 16 }}>
          {locationFilter || 'Defina sua localidade'}
        </Text>
        <TouchableOpacity onPress={() => {
          setEditLocationValue(locationFilter || '');
          setEditLocationModal(true);
        }}>
          <MaterialIcons name="edit" size={18} color="#F59E42" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
      {/* Modal de edição de localidade */}
      <Modal
        visible={editLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditLocationModal(false)}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor:'#fff', borderRadius:12, padding:24, minWidth:280 }}>
            <Text style={{ fontWeight:'bold', fontSize:16, color:'#4F46E5', marginBottom:8 }}>Alterar Localidade</Text>
            <Text style={{ color:'#6B7280', marginBottom:8 }}>Digite sua cidade e estado (ex: Pelotas, RS):</Text>
            <TextInput
              value={editLocationValue}
              onChangeText={setEditLocationValue}
              placeholder="Cidade, UF"
              style={{ borderWidth:1, borderColor:'#E5E7EB', borderRadius:8, padding:10, marginBottom:12, fontSize:15 }}
              autoFocus
            />
            <View style={{ flexDirection:'row', justifyContent:'flex-end', gap:8 }}>
              <TouchableOpacity onPress={() => setEditLocationModal(false)} style={{ paddingVertical:8, paddingHorizontal:16 }}>
                <Text style={{ color:'#6B7280', fontWeight:'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const isValidLocation = (loc) => /^[A-Za-zÀ-ÿ\s]+,\s?[A-Z]{2}$/.test(loc.trim());
                if (!editLocationValue.trim()) {
                  setEditLocationModal(false);
                  return;
                }
                if (!isValidLocation(editLocationValue)) {
                  Alert.alert('Formato inválido', 'Use o formato: Cidade, UF (ex: Pelotas, RS)');
                  return;
                }
                setLocationFilterTouched(true);
                setEditLocationModal(false);
                setLocationFilter(editLocationValue.trim());
              }} style={{ paddingVertical:8, paddingHorizontal:16 }}>
                <Text style={{ color:'#4F46E5', fontWeight:'bold' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Filtro avançado escondido em ícone */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8 }}>
        <TouchableOpacity onPress={() => setShowAdvancedFilters(v => !v)} style={{ marginRight: 8 }}>
          <MaterialIcons name="filter-list" size={28} color="#4F46E5" />
        </TouchableOpacity>
        <Text style={{ fontWeight: 'bold', color: '#4F46E5', fontSize: 16 }}>Filtros</Text>
      </View>
      {/* ...existing code... */}
      {showAdvancedFilters && (
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchLabel}>Buscar</Text>
              <Input
                placeholder="Título, descrição, endereço..."
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchLabel}>Local</Text>
              <Input
                placeholder="Cidade, bairro, endereço..."
                value={locationFilter}
                onChangeText={setLocationFilter}
              />
            </View>
          </View>
          <View style={styles.searchActions}>
            <Button title="Aplicar" onPress={loadItems} />
            <Button
              title="Limpar"
              variant="secondary"
              onPress={() => {
                setSearchTerm('');
                setLocationFilter('');
                setFilters({ ...filters, status: 'all', category: 'all' });
                loadItems();
              }}
            />
          </View>
        </View>
      )}

      {/* Quick Filters Row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filters.status === 'all' && styles.filterChipActive,
          ]}
          onPress={() => setFilters({ ...filters, status: 'all' })}
          activeOpacity={0.85}
        >
          <MaterialIcons name="layers" size={14} color={filters.status === 'all' ? '#fff' : '#1F2937'} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filters.status === 'all' && styles.filterChipTextActive]}>Todos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filters.status === 'lost' && styles.filterChipActive,
          ]}
          onPress={() => setFilters({ ...filters, status: 'lost' })}
          activeOpacity={0.85}
        >
          <MaterialIcons name="highlight-off" size={14} color={filters.status === 'lost' ? '#fff' : '#B91C1C'} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filters.status === 'lost' && styles.filterChipTextActive]}>Perdidos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filters.status === 'found' && styles.filterChipActive,
          ]}
          onPress={() => setFilters({ ...filters, status: 'found' })}
          activeOpacity={0.85}
        >
          <MaterialIcons name="check-circle" size={14} color={filters.status === 'found' ? '#fff' : '#0F9D58'} style={{ marginRight: 4 }} />
          <Text style={[styles.filterChipText, filters.status === 'found' && styles.filterChipTextActive]}>Encontrados</Text>
        </TouchableOpacity>

        {user && (
          <TouchableOpacity
            style={[
              styles.filterChip,
              filters.showMyItems && styles.filterChipActive,
            ]}
            onPress={handleMyItemsToggle}
            activeOpacity={0.85}
          >
            <MaterialIcons name="person" size={14} color={filters.showMyItems ? '#fff' : '#1F2937'} style={{ marginRight: 4 }} />
            <Text style={[styles.filterChipText, filters.showMyItems && styles.filterChipTextActive]}>Meus Itens</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            user={user}
            thumbnails={thumbnails}
            handleSendMessage={handleSendMessage}
          />
        )}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum item encontrado</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  // filtersContainer removido
  searchContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '600',
  },
  searchActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexShrink: 0,
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 14,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  itemCard: {
    marginHorizontal: 12,
    marginVertical: 8,
  },
  itemImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImagePlaceholderText: {
    color: '#6B7280',
    fontSize: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  itemStatus: {
    fontSize: 12,
    marginTop: 4,
    color: '#6B7280',
  },
  rewardBadge: {
    backgroundColor: '#FCD34D',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  rewardBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400E',
  },
  itemDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ownerInfo: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ownerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  ownerEmail: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  ownerInfoExpanded: {
    paddingVertical: 8,
    marginVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
  },
  expandedContent: {
    marginVertical: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
  },
  expandButton: {
    marginTop: 8,
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E5E7EB',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  fabButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default HomeScreen;
