import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { states, citiesByState, neighborhoodsByCity } from '../lib/br-locations';
import * as userService from '../services/user';
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
const CARD_IMAGE_HEIGHT = 340; // altura intermediária para a foto do card
import Button from '../components/Button';
import Input from '../components/Input';
import { MaterialIcons } from '@expo/vector-icons';

// ItemCard agora é um componente fora do HomeScreen
const ItemCard = ({ item, user, thumbnails, handleSendMessage, handleEditItem, handleDeleteItem, onPress }) => {
  const [carouselIndex, setCarouselIndex] = React.useState(0);
  const flatListRef = React.useRef(null);
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
  const IMAGE_HEIGHT = 290;
  // Defensive string conversion for all text props
  const safeTitle = item.title != null ? String(item.title) : '';
  const safeDescription = item.description != null ? String(item.description) : '';
  const safeOwnerName = item.owner_name != null ? String(item.owner_name) : '';
  const safeCity = item.city != null ? String(item.city) : '';
  const safeState = item.state != null ? String(item.state) : '';
  const safeNeighborhood = item.neighborhood != null ? String(item.neighborhood) : '';
  return (
    <Card style={{ padding: 0, marginHorizontal: 8, marginVertical: 10, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
      {/* Imagem */}
      <View style={{ position: 'relative', width: '100%', height: IMAGE_HEIGHT }}>
        {photos.length > 0 ? (
          <Image
            source={{ uri: photos[0].url }}
            style={{ width: '100%', height: IMAGE_HEIGHT, backgroundColor: '#F3F4F6' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: '100%', height: IMAGE_HEIGHT, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#9CA3AF' }}>Sem foto</Text>
          </View>
        )}
        {/* Badges */}
        <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 8 }}>
          <View style={{ backgroundColor: statusColor, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginRight: 6 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{statusLabel}</Text>
          </View>
          <View style={{ backgroundColor: cat.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Text style={{ color: cat.text, fontWeight: 'bold', fontSize: 13 }}>{cat.label}</Text>
          </View>
        </View>
        {/* Botão de Compartilhar no canto superior direito */}
        <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
          <ShareButton item={item} imageUrl={photos[0]?.url} />
        </View>
      </View>
      {/* Conteúdo */}
      <View style={{ padding: 16, paddingBottom: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#374151', marginBottom: 16 }}>{safeTitle}</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>{safeDescription}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <MaterialIcons name="place" size={16} color="#9CA3AF" style={{ marginRight: 2 }} />
          <Text style={{ fontSize: 13, color: '#6B7280', marginRight: 12, fontWeight: 500 }}>{
            (safeCity && safeState ? `${safeCity}, ${safeState}` : (safeCity || safeState || '-')) + (safeNeighborhood ? ` - ${safeNeighborhood}` : '')
          }</Text>
          <MaterialIcons name="event" size={15} color="#9CA3AF" style={{ marginRight: 2 }} />
          <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{item.date ? new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}</Text>
        </View>
        {/* Barra divisória fina */}
        <View style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: '500' }}>{safeOwnerName}</Text>
          <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
            <MaterialIcons name="visibility" size={18} color="#1F2937" style={{ marginRight: 4 }} />
            <Text style={{ color: '#1F2937', fontSize: 14 }}>Ver detalhes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
};

const HomeScreen = ({ navigation, route }) => {
    // Limpa filtros ao sair da HomeScreen
    useEffect(() => {
      const unsubscribe = navigation.addListener('blur', () => {
        setFilters({ status: 'all', category: 'all', showMyItems: false });
        setSearchTerm('');
        setLocationFilter('');
        setLocationFilterTouched(false);
        setEditState(userProfile?.state || '');
        setEditCity(userProfile?.city || '');
        setEditNeighborhood('');
      });
      return unsubscribe;
    }, [navigation, userProfile]);
  const { user, userProfile, refreshProfile, setUserProfile, signOut } = useAuth();
  // Corrige erro: garantir estado do modal de perfil
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  // Localidade do perfil (fixa)
  const [showProfileLocationModal, setShowProfileLocationModal] = useState(false);
  const [profileEditState, setProfileEditState] = useState('');
  const [profileEditCity, setProfileEditCity] = useState('');

  useEffect(() => {
    setProfileEditState(userProfile?.state || '');
    setProfileEditCity(userProfile?.city || '');
  }, [userProfile]);

  // Salvar localidade do perfil
  const handleSaveProfileLocation = async () => {
    if (!user || !profileEditState || !profileEditCity) return;
    try {
      await userService.updateProfile(user.id, {
        state: profileEditState,
        city: profileEditCity,
      });
      if (typeof refreshProfile === 'function') refreshProfile();
      setShowProfileLocationModal(false);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar a localidade do perfil.');
    }
  };
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
  // Estado e cidade do perfil, fixos para filtro
  const [editState, setEditState] = useState(userProfile?.state || '');
  const [editCity, setEditCity] = useState(userProfile?.city || '');
  const [editNeighborhood, setEditNeighborhood] = useState('');

  // Sempre recarrega os itens ao focar na HomeTab
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadItems();
    });
    return unsubscribe;
  }, [navigation]);

  // Atualiza localidade ao focar (mantém lógica anterior)
  useFocusEffect(
    React.useCallback(() => {
      if (userProfile?.city && userProfile?.state && !locationFilterTouched) {
        setEditState(userProfile.state);
        setEditCity(userProfile.city);
        setEditNeighborhood(userProfile.neighborhood || '');
        setLocationFilter(`${userProfile.state}, ${userProfile.city}${userProfile.neighborhood ? ', ' + userProfile.neighborhood : ''}`);
      }
    }, [userProfile, locationFilterTouched])
  );
  const [expandedItem, setExpandedItem] = useState(null);
  const [expandedItemDetails, setExpandedItemDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [thumbnails, setThumbnails] = useState({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    category: 'all',
  });

  const loadItems = async () => {
    try {
      setLoading(true);
      let allItems = [];
      if (searchTerm && searchTerm.trim().length > 0) {
        // Busca otimizada ainda não implementada para search, usar antiga
        allItems = await itemsService.searchItems(searchTerm.trim());
        // Buscar fotos e owner manualmente para search
        allItems = await Promise.all(
          (allItems || []).map(async (item) => {
            const { data: photos } = await supabase
              .from('item_photos')
              .select('id, url')
              .eq('item_id', item.id);
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
      } else {
        const baseFilters = {};
        if (filters.status !== 'all') baseFilters.status = filters.status;
        if (filters.category !== 'all') baseFilters.category = filters.category;
        if (filters.showMyItems && user) baseFilters.owner_id = user.id;
        // Filtro por estado, cidade e bairro
        if (editState) baseFilters.state = editState;
        if (editCity) baseFilters.city = editCity;
        if (editNeighborhood) baseFilters.neighborhood = editNeighborhood;
        allItems = await itemsService.listItemsWithPhotosAndOwner(baseFilters);
        // Ajustar owner_name para compatibilidade
        allItems = (allItems || []).map(item => ({
          ...item,
          owner_name: item.profiles?.name || item.profiles?.email || 'Usuário',
          item_photos: item.item_photos || [],
        }));
      }
      setItems(allItems);
      applyFilters(allItems);
      // Thumbnails: usar a primeira foto de cada item
      const thumbsMap = {};
      (allItems || []).forEach(item => {
        if (item.item_photos && item.item_photos.length > 0) {
          thumbsMap[item.id] = item.item_photos[0].url;
        }
      });
      setThumbnails(thumbsMap);
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
      const [city, state] = locationFilter.split(',').map(s => s.trim().toLowerCase());
      filtered = filtered.filter(item => {
        const itemCity = (item.city || '').toLowerCase();
        const itemState = (item.state || '').toLowerCase();
        return (
          (!city || itemCity === city) && (!state || itemState === state)
        );
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
    loadItems();
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
      navigation.navigate('Login', {
        redirectAfterLogin: null,
      });
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


  // Atualiza os itens filtrados ao digitar na busca
  useEffect(() => {
    const search = searchTerm?.trim().toLowerCase() || '';
    if (!search) {
      setFilteredItems(items);
      return;
    }
    const filtered = items.filter(item =>
      (item.title && item.title.toLowerCase().includes(search)) ||
      (item.description && item.description.toLowerCase().includes(search))
    );
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  return (
    <View style={styles.container}>
      {/* Overlay para fechar o menu ao clicar fora */}
      {user && showProfileMenu && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
        >
          {/* TouchableOpacity precisa de filho, mesmo que vazio */}
          <View />
        </TouchableOpacity>
      )}
      {/* App Bar ajustada: filtro de localidade ao lado da busca */}
      <View style={{ backgroundColor: '#fff', paddingTop: 56, paddingBottom: 8, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Text style={{ color: '#1F2937', fontWeight: 'bold', fontSize: 22, marginBottom: 2 }}>Recover</Text>
            {userProfile?.city && userProfile?.state && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}
                onPress={() => setShowProfileLocationModal(true)}
                accessibilityLabel={`Localidade do perfil: ${userProfile.city}, ${userProfile.state}`}
              >
                <MaterialIcons name="place" size={16} color="#9CA3AF" style={{ marginRight: 2 }} />
                <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '400' }}>{userProfile.city}, {userProfile.state}</Text>
              </TouchableOpacity>
            )}
          </View>
          {user && (
            <TouchableOpacity
              onPress={() => setShowProfileMenu((prev) => !prev)}
              style={{ marginLeft: 12 }}
              accessibilityLabel="Abrir menu do perfil"
            >
              {userProfile?.avatar_url ? (
                <Image source={{ uri: userProfile.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' }} />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#60A5FA', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{userProfile?.name ? userProfile.name[0].toUpperCase() : 'U'}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          {/* Modal de menu de perfil minimalista */}
          {/* Perfil/Sair menu inline below profile photo */}
          {user && showProfileMenu && (
            <View style={{ position: 'absolute', top: 48, right: 18, backgroundColor: 'white', borderRadius: 10, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, paddingVertical: 8, paddingHorizontal: 16, zIndex: 100 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowProfileMenu(false);
                  navigation.navigate('ProfileTab');
                }}
                style={{ paddingVertical: 8 }}
              >
                <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 16 }}>Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowProfileMenu(false);
                  if (typeof signOut === 'function') signOut();
                  else if (typeof navigation?.navigate === 'function') navigation.navigate('Login');
                }}
                style={{ paddingVertical: 8 }}
              >
                <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 16 }}>Sair</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowProfileMenu(false)}
                style={{ paddingVertical: 8 }}
              >
                <Text style={{ color: '#6B7280', fontWeight: 'bold', fontSize: 16 }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Barra de pesquisa única, fundo branco */}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 14, paddingHorizontal: 16, height: 44 }}>
            <MaterialIcons name="search" size={22} color="#6B7280" style={{ marginRight: 8 }} />
            <Input
              placeholder="Buscar itens perdidos ou encontrados."
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={{ flex: 1, backgroundColor: 'transparent', borderWidth: 0, fontSize: 16, color: '#222', paddingVertical: 0, paddingHorizontal: 0 }}
              textStyle={{ fontSize: 16, color: '#222' }}
              placeholderTextColor="#6B7280"
            />
          </View>
        </View>
        {/* Modal para atualizar localidade do perfil */}
        <Modal
          visible={!!showProfileLocationModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProfileLocationModal(false)}
        >
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
            <View style={{ backgroundColor:'#fff', borderRadius:12, paddingVertical:24, paddingHorizontal:16, minWidth:360, maxWidth: '95%' }}>
              <Text style={{ fontWeight:'bold', fontSize:16, color:'#4F46E5', marginBottom:8 }}>Atualizar Localidade do Perfil</Text>
              <Text style={{ color:'#6B7280', marginBottom:8 }}>Selecione estado e cidade:</Text>
              {/* Estado */}
              <Text style={{ marginBottom: 6 }}>Estado</Text>
              <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 12, minWidth: 320, maxWidth: '100%', width: '100%', height: 56, justifyContent: 'center' }}>
                <Picker
                  selectedValue={profileEditState}
                  onValueChange={uf => {
                    setProfileEditState(uf);
                    setProfileEditCity('');
                  }}
                  style={{ height: 56, minWidth: 320 }}
                >
                  <Picker.Item label="Selecione o estado" value="" />
                  {states.map(uf => (
                    <Picker.Item key={uf} label={uf} value={uf} />
                  ))}
                </Picker>
              </View>
              {/* Cidade */}
              <Text style={{ marginBottom: 6 }}>Cidade</Text>
              <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 16, minWidth: 320, maxWidth: '100%', width: '100%', height: 56, justifyContent: 'center' }}>
                <Picker
                  selectedValue={profileEditCity}
                  onValueChange={setProfileEditCity}
                  enabled={!!profileEditState}
                  style={{ height: 56, minWidth: 320 }}
                >
                  <Picker.Item label="Selecione a cidade" value="" />
                  {(citiesByState[profileEditState] || []).map(city => (
                    <Picker.Item key={city} label={city} value={city} />
                  ))}
                </Picker>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Button title="Cancelar" onPress={() => setShowProfileLocationModal(false)} style={{ marginRight: 8, backgroundColor: '#E5E7EB', color: '#222' }} />
                <Button title="Salvar" onPress={handleSaveProfileLocation} disabled={!profileEditState || !profileEditCity} />
              </View>
            </View>
          </View>
        </Modal>
      </View>

      {/* Modal de edição de localidade */}
      <Modal
        visible={editLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditLocationModal(false)}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor:'#fff', borderRadius:12, paddingVertical:24, paddingHorizontal:16, minWidth:360, maxWidth: '95%' }}>
            {user ? (
              <>
                <Text style={{ fontWeight:'bold', fontSize:16, color:'#4F46E5', marginBottom:8 }}>Filtrar por Bairro</Text>
                <Text style={{ color:'#6B7280', marginBottom:8 }}>Selecione o bairro para filtrar. Cidade e estado são do seu perfil.</Text>
                <Text style={{ marginBottom: 6 }}>Estado</Text>
                <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 12, minWidth: 320, maxWidth: '100%', width: '100%', height: 56, justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
                  <Text style={{ paddingLeft: 12, paddingTop: 16, fontSize: 16, color: '#6B7280' }}>{editState}</Text>
                </View>
                <Text style={{ marginBottom: 6 }}>Cidade</Text>
                <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 12, minWidth: 320, maxWidth: '100%', width: '100%', height: 56, justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
                  <Text style={{ paddingLeft: 12, paddingTop: 16, fontSize: 16, color: '#6B7280' }}>{editCity}</Text>
                </View>
                <Text style={{ marginBottom: 6 }}>Bairro</Text>
                <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 16, minWidth: 320, maxWidth: '100%', width: '100%', height: 56, justifyContent: 'center' }}>
                  <Picker
                    selectedValue={editNeighborhood}
                    onValueChange={setEditNeighborhood}
                    enabled={!!editCity}
                    style={{ height: 56, minWidth: 320 }}
                  >
                    <Picker.Item label="Selecione o bairro" value="" />
                    {(neighborhoodsByCity[editCity] || []).map(bairro => (
                      <Picker.Item key={bairro} label={bairro} value={bairro} />
                    ))}
                  </Picker>
                </View>
              </>
            ) : (
              <>
                <Text style={{ fontWeight:'bold', fontSize:16, color:'#4F46E5', marginBottom:8 }}>Filtrar por Localidade</Text>
                <Text style={{ color:'#6B7280', marginBottom:8 }}>Selecione estado, cidade e bairro para filtrar.</Text>
                <Text style={{ marginBottom: 6 }}>Estado</Text>
                <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 12, minWidth: 320, maxWidth: '100%', width: '100%', height: 56, justifyContent: 'center' }}>
                  <Picker
                    selectedValue={editState}
                    onValueChange={uf => {
                      setEditState(uf);
                      setEditCity('');
                      setEditNeighborhood('');
                    }}
                    style={{ height: 56, minWidth: 320 }}
                  >
                    <Picker.Item label="Selecione o estado" value="" />
                    {states.map(uf => (
                      <Picker.Item key={uf} label={uf} value={uf} />
                    ))}
                  </Picker>
                </View>
                <Text style={{ marginBottom: 6 }}>Cidade</Text>
                <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 12, minWidth: 320, maxWidth: '100%', width: '100%', height: 56, justifyContent: 'center' }}>
                  <Picker
                    selectedValue={editCity}
                    onValueChange={city => {
                      setEditCity(city);
                      setEditNeighborhood('');
                    }}
                    enabled={!!editState}
                    style={{ height: 56, minWidth: 320 }}
                  >
                    <Picker.Item label="Selecione a cidade" value="" />
                    {(citiesByState[editState] || []).map(city => (
                      <Picker.Item key={city} label={city} value={city} />
                    ))}
                  </Picker>
                </View>
                <Text style={{ marginBottom: 6 }}>Bairro</Text>
                <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 16, minWidth: 320, maxWidth: '100%', width: '100%', height: 56, justifyContent: 'center' }}>
                  <Picker
                    selectedValue={editNeighborhood}
                    onValueChange={setEditNeighborhood}
                    enabled={!!editCity}
                    style={{ height: 56, minWidth: 320 }}
                  >
                    <Picker.Item label="Selecione o bairro" value="" />
                    {(neighborhoodsByCity[editCity] || []).map(bairro => (
                      <Picker.Item key={bairro} label={bairro} value={bairro} />
                    ))}
                  </Picker>
                </View>
              </>
            )}
            <View style={{ flexDirection:'row', justifyContent:'flex-end', gap:8 }}>
              <TouchableOpacity onPress={() => {
                setEditState(user ? editState : '');
                setEditCity(user ? editCity : '');
                setEditNeighborhood('');
              }} style={{ paddingVertical:8, paddingHorizontal:16, backgroundColor:'#E5E7EB', borderRadius:6, marginRight:8 }}>
                <Text style={{ color:'#222', fontWeight:'bold' }}>Limpar Filtro</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditLocationModal(false)} style={{ paddingVertical:8, paddingHorizontal:16 }}>
                <Text style={{ color:'#6B7280', fontWeight:'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                setLocationFilterTouched(true);
                setEditLocationModal(false);
                setLocationFilter(`${editState}, ${editCity}${editNeighborhood ? ', ' + editNeighborhood : ''}`);
                loadItems(); // Carrega imediatamente após salvar
                // Atualiza localidade no perfil do usuário
                try {
                  if (user && user.id) {
                    await userService.updateProfile(user.id, { neighborhood: editNeighborhood });
                  }
                } catch (e) {
                  console.log('[HomeScreen] Erro ao atualizar localidade no perfil:', e.message);
                }
              }} style={{ paddingVertical:8, paddingHorizontal:16 }}>
                <Text style={{ color:'#4F46E5', fontWeight:'bold' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Filtro avançado removido conforme solicitado */}
      {/* Campos duplicados de buscar/local removidos */}

      {/* Quick Filters Row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
                {/* Filtro avançado: tipo de item */}
                <TouchableOpacity
                  style={{ marginRight: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: showAdvancedFilters ? '#E5E7EB' : '#fff', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setShowAdvancedFilters(v => !v)}
                >
                  <MaterialIcons name="tune" size={22} color="#4F46E5" />
                </TouchableOpacity>
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
          {/* Bolinha removida */}
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
          {/* Bolinha removida */}
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
            {/* Filtros avançados: tipo de item */}
            {showAdvancedFilters && (
              <View style={{ flexDirection: 'column', paddingHorizontal: 16, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'animal', label: 'Animal' },
                    { key: 'object', label: 'Objeto' },
                    { key: 'clothing', label: 'Roupa' },
                    { key: 'document', label: 'Documento' },
                    { key: 'other', label: 'Outro' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 14,
                        borderRadius: 8,
                        backgroundColor: advancedFilters.category === opt.key ? '#4F46E5' : '#F3F4F6',
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                      onPress={() => setAdvancedFilters(f => ({ ...f, category: opt.key }))}
                    >
                      <Text style={{ color: advancedFilters.category === opt.key ? '#fff' : '#4F46E5', fontWeight: 'bold', fontSize: 13 }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Filtro de bairro dentro do filtro avançado */}
                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setEditLocationModal(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, height: 44 }}>
                    <MaterialIcons name="place" size={22} color="#F59E42" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#222', fontSize: 15 }}>
                      Filtrar por bairro
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
      {/* Quantidade de itens encontrados */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ color: '#6B7280', fontSize: 15 }}>
          {/* Corrigido: tudo dentro de <Text> */}
          {String(filteredItems.filter(item => advancedFilters.category === 'all' ? true : item.category === advancedFilters.category).length) + ' itens encontrados'}
        </Text>
      </View>
      <FlatList
        data={filteredItems.filter(item =>
          advancedFilters.category === 'all' ? true : item.category === advancedFilters.category
        )}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            user={user}
            thumbnails={thumbnails}
            handleSendMessage={handleSendMessage}
            handleEditItem={handleEditItem}
            handleDeleteItem={handleDeleteItem}
            onPress={() => {
              if (!user) {
                // Corrigido: nunca retorna alert() no JSX, apenas executa efeito colateral
                Alert.alert('Atenção', 'Faça login para ver detalhes do item');
                navigation.navigate('Login', {
                  redirectAfterLogin: null,
                });
                return;
              }
              navigation.navigate('ItemDetail', { itemId: item.id });
            }}
          />
        )}
        keyExtractor={item => {
          // Defensive: always return a string, never undefined/null
          if (item && item.id !== undefined && item.id !== null) {
            return String(item.id);
          }
          // Fallback: use a random string (should not happen in production)
          return `unknown-${Math.random().toString(36).substr(2, 9)}`;
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum item encontrado</Text>
          </View>
        )}
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
