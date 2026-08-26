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
import * as notificationsService from '../services/notifications';
import * as claimsService from '../services/itemClaims';
import Card from '../components/Card';
import ShareButton from '../components/ShareButton';
// Get screen width for carousel
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_IMAGE_HEIGHT = 340; // altura intermediária para a foto do card
import Button from '../components/Button';
import Input from '../components/Input';
import NotificationBell from '../components/NotificationBell';
import OptimizedImage from '../components/OptimizedImage';
import MapLocationPicker from '../components/MapLocationPicker';
import { MaterialIcons } from '@expo/vector-icons';

const regionToUf = {
  Acre: 'AC', Alagoas: 'AL', Amapá: 'AP', Amazonas: 'AM', Bahia: 'BA', Ceará: 'CE',
  'Distrito Federal': 'DF', 'Espírito Santo': 'ES', Goiás: 'GO', Maranhão: 'MA',
  'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', Pará: 'PA',
  Paraíba: 'PB', Paraná: 'PR', Pernambuco: 'PE', Piauí: 'PI',
  'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS',
  Rondônia: 'RO', Roraima: 'RR', 'Santa Catarina': 'SC', 'São Paulo': 'SP',
  Sergipe: 'SE', Tocantins: 'TO',
};

const normalizeRegionName = (value) => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const normalizedRegionToUf = Object.fromEntries(Object.entries(regionToUf).map(([name, uf]) => [normalizeRegionName(name), uf]));

const formatItemDate = (value) => {
  if (!value) return '';
  const raw = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
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
  const number = (details?.number || item?.house_number || item?.number || '').trim();
  const district = (details?.district || item?.neighborhood || '').trim();

  const streetPart = street && number ? `${street}, ${number}` : street || (number ? `Nº ${number}` : '');
  const parts = [streetPart, district].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(' - ');
  }

  const rawText = (details?.text || item?.address || '').trim();
  if (rawText && rawText !== formatCityState(item)) {
    return rawText;
  }

  return '';
};

// ItemCard agora é um componente fora do HomeScreen
const ItemCard = ({ item, user, thumbnails, handleSendMessage, handleEditItem, handleDeleteItem, onPress }) => {
  const [carouselIndex, setCarouselIndex] = React.useState(0);
  const [cardWidth, setCardWidth] = React.useState(0);
  // Cores para status e categoria
  const statusColor = item.status === 'lost' ? '#F87171' : '#34D399';
  const statusLabel = item.status === 'lost' ? 'Perdido' : 'Encontrado';
  const animalLabel = String(item.species || 'Animal').trim() || 'Animal';
  const categoryColors = {
    animal: { bg: '#DBEAFE', text: '#2563EB', label: animalLabel },
    other: { bg: '#F3F4F6', text: '#6B7280', label: animalLabel },
  };
  const cat = categoryColors[item.category] || categoryColors.other;
  const photos = item.item_photos && item.item_photos.length > 0 ? item.item_photos : (thumbnails[item.id] ? [{ url: thumbnails[item.id] }] : []);
  const IMAGE_HEIGHT = 290;
  // Defensive string conversion for all text props
  const safeTitle = item.title != null ? String(item.title) : '';
  const safeDescription = item.description != null ? String(item.description) : '';
  const safeOwnerName = item.owner_name != null ? String(item.owner_name) : '';
  const safeCity = item.city != null ? String(item.city) : '';
  const safeState = item.state != null ? String(item.state) : '';
  const safeNeighborhood = item.neighborhood != null ? String(item.neighborhood) : '';
  const activeReward = Array.isArray(item.rewards)
    ? item.rewards.find(reward => reward?.status === 'active')
    : null;
  return (
    <Card style={{ padding: 0, marginHorizontal: 8, marginVertical: 10, borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
      {/* Imagem / Carrossel de Fotos */}
      <View
        style={{ position: 'relative', width: '100%', height: IMAGE_HEIGHT }}
        onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}
      >
        {photos.length > 0 ? (
          photos.length > 1 && cardWidth > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
                setCarouselIndex(newIndex);
              }}
              style={{ width: cardWidth, height: IMAGE_HEIGHT }}
            >
              {photos.map((photo, index) => (
                <View key={photo.id || index} style={{ width: cardWidth, height: IMAGE_HEIGHT }}>
                  <OptimizedImage
                    uri={photo.url}
                    style={{ width: cardWidth, height: IMAGE_HEIGHT, backgroundColor: '#F3F4F6' }}
                    resizeMode="cover"
                    resizeMethod="resize"
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <OptimizedImage
              uri={photos[0].url}
              style={{ width: '100%', height: IMAGE_HEIGHT, backgroundColor: '#F3F4F6' }}
              resizeMode="cover"
              resizeMethod="resize"
            />
          )
        ) : (
          <View style={{ width: '100%', height: IMAGE_HEIGHT, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#9CA3AF' }}>Sem foto</Text>
          </View>
        )}

        {/* Badges */}
        <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 8, zIndex: 10 }}>
          <View style={{ backgroundColor: statusColor, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginRight: 6 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{statusLabel}</Text>
          </View>
          <View style={{ backgroundColor: cat.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Text style={{ color: cat.text, fontWeight: 'bold', fontSize: 13 }}>{cat.label}</Text>
          </View>
        </View>

        {/* Contador de fotos (se houver mais de 1 foto) */}
        {photos.length > 1 && (
          <View style={{ position: 'absolute', top: 12, right: 54, backgroundColor: 'rgba(0, 0, 0, 0.65)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, zIndex: 10 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
              {carouselIndex + 1}/{photos.length}
            </Text>
          </View>
        )}

        {/* Pontos de Paginação na parte inferior da foto */}
        {photos.length > 1 && (
          <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, zIndex: 10 }}>
            {photos.map((_, dotIndex) => (
              <View
                key={dotIndex}
                style={{
                  width: carouselIndex === dotIndex ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: carouselIndex === dotIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
                }}
              />
            ))}
          </View>
        )}

        {item.owner_id === user?.id && item.renewalInfo?.needsRenewal && Number.isFinite(item.renewalInfo?.daysRemaining) && (
          <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(245, 158, 11, 0.95)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, zIndex: 10 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
              Renove esta publicação em {item.renewalInfo.daysRemaining} dia{item.renewalInfo.daysRemaining === 1 ? '' : 's'}
            </Text>
          </View>
        )}
        {/* Botão de Compartilhar no canto superior direito */}
        <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
          <ShareButton item={item} imageUrl={photos[0]?.url} />
        </View>
      </View>
      {/* Conteúdo */}
      <View style={{ padding: 16, paddingBottom: 12 }}>
        {/* Título */}
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: safeDescription?.trim() ? 6 : 10 }}>
          {safeTitle}
        </Text>

        {/* Descrição (renderiza apenas se existir texto) */}
        {safeDescription?.trim() ? (
          <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 12 }} numberOfLines={2}>
            {safeDescription}
          </Text>
        ) : null}

        {/* Recompensa (se houver) */}
        {activeReward && (
          <View style={[styles.rewardBadge, { marginBottom: 12 }]}>
            <Text style={styles.rewardBadgeText}>
              {activeReward.amount ? `Recompensa: R$ ${parseFloat(activeReward.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Recompensa oferecida'}
              {activeReward.description ? ` • ${activeReward.description}` : ''}
            </Text>
          </View>
        )}

        {/* Bloco de Localização e Data Moderno */}
        <View style={{
          backgroundColor: '#F8FAFC',
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          marginBottom: 12,
        }}>
          {/* Cabeçalho do bloco: Rótulo de Status à esquerda e Data à direita */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons
                name="place"
                size={16}
                color={item.status === 'lost' ? '#D97706' : '#16A34A'}
              />
              <Text style={{
                fontSize: 11,
                fontWeight: '700',
                color: item.status === 'lost' ? '#D97706' : '#16A34A',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {item.status === 'lost' ? 'Última vez visto' : 'Local onde foi encontrado'}
              </Text>
            </View>
            {item.date ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <MaterialIcons name="event" size={13} color="#94A3B8" />
                <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '500' }}>
                  {formatItemDate(item.date)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Endereço: Cidade - Estado e Complemento */}
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1E293B', lineHeight: 20, marginTop: 2 }}>
            {formatCityState(item)}
          </Text>
          {formatStreetNumberNeighborhood(item) ? (
            <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2, lineHeight: 18 }}>
              {formatStreetNumberNeighborhood(item)}
            </Text>
          ) : null}
        </View>

        {/* Informações do Tutor real (se publicado por terceiro) */}
        {item.extra_fields?.third_party_owner?.active && item.extra_fields?.third_party_owner?.name ? (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F0FDF4',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 5,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: '#DCFCE7',
          }}>
            <MaterialIcons name="person-pin" size={15} color="#16A34A" />
            <Text style={{ fontSize: 12, color: '#166534', fontWeight: '700', marginLeft: 4 }}>
              {item.status === 'lost' ? 'Tutor:' : 'Responsável:'}{' '}
              <Text style={{ fontWeight: '600' }}>{item.extra_fields.third_party_owner.name}</Text>
              {item.extra_fields.third_party_owner.phone ? ` • 📞 ${item.extra_fields.third_party_owner.phone}` : ''}
            </Text>
          </View>
        ) : null}

        {/* Rodapé: Dono e Ação */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#64748B' }}>Por </Text>
            <Text style={{ fontSize: 13, color: '#1E293B', fontWeight: '600' }} numberOfLines={1}>
              {safeOwnerName || 'Usuário'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#EFF6FF',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="visibility" size={16} color="#2563EB" style={{ marginRight: 5 }} />
            <Text style={{ color: '#2563EB', fontSize: 13, fontWeight: '700' }}>Ver detalhes</Text>
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
  const { user, userProfile, isAdmin, refreshProfile, setUserProfile, signOut } = useAuth();
  // Corrige erro: garantir estado do modal de perfil
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  // Localidade do perfil e sessão
  const [showProfileLocationModal, setShowProfileLocationModal] = useState(false);
  const [sessionCity, setSessionCity] = useState('');
  const [sessionState, setSessionState] = useState('');
  const [profileEditState, setProfileEditState] = useState('');
  const [profileEditCity, setProfileEditCity] = useState('');
  const [profileMapVisible, setProfileMapVisible] = useState(false);

  useEffect(() => {
    if (userProfile?.state && userProfile?.city) {
      setProfileEditState(userProfile.state);
      setProfileEditCity(userProfile.city);
    }
  }, [userProfile]);

  // Localidade ativa para exibição no cabeçalho (padrão Todo o Brasil)
  const activeCity = sessionCity;
  const activeState = sessionState;
  const displayLocation = (activeCity && activeState)
    ? `${activeCity}, ${activeState}`
    : (activeCity || activeState || 'Todo o Brasil');

  // Salvar localidade (perfil ou sessão)
  const handleSaveProfileLocation = async () => {
    if (!profileEditState || !profileEditCity) return;
    
    setSessionCity(profileEditCity);
    setSessionState(profileEditState);
    setLocationFilter(`${profileEditCity}, ${profileEditState}`);
    setLocationFilterTouched(true);

    if (user) {
      try {
        await userService.updateProfile(user.id, {
          state: profileEditState,
          city: profileEditCity,
        });
        if (typeof refreshProfile === 'function') refreshProfile();
      } catch (err) {
        console.warn('[HomeScreen] Falha ao atualizar perfil no Supabase:', err.message);
      }
    }
    setShowProfileLocationModal(false);
  };

  // Limpar filtro de localidade e voltar para "Brasil"
  const handleResetToBrazil = () => {
    setSessionCity('');
    setSessionState('');
    setProfileEditCity('');
    setProfileEditState('');
    setLocationFilter('');
    setLocationFilterTouched(true);
    setShowProfileLocationModal(false);
  };

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'animal',
    animalType: 'all',
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

  // Ao focar na tela, sincroniza seletor interno caso o perfil possua cidade
  useFocusEffect(
    React.useCallback(() => {
      if (userProfile?.city && userProfile?.state) {
        setEditState(userProfile.state);
        setEditCity(userProfile.city);
        setEditNeighborhood(userProfile.neighborhood || '');
      }
    }, [userProfile])
  );
  const [expandedItem, setExpandedItem] = useState(null);
  const [expandedItemDetails, setExpandedItemDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [thumbnails, setThumbnails] = useState({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    category: 'animal',
    animalType: 'all',
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
        if (filters.animalType && filters.animalType !== 'all') baseFilters.species = filters.animalType;
        if (filters.showMyItems && user) baseFilters.owner_id = user.id;
        // A localização pode existir apenas como coordenadas escolhidas no mapa.
        // O filtro textual é aplicado abaixo, depois que todos os itens são carregados.
        allItems = await itemsService.listItemsWithPhotosAndOwner(baseFilters);
        // Ajustar owner_name para compatibilidade
        allItems = (allItems || []).map(item => ({
          ...item,
          owner_name: item.profiles?.name || item.profiles?.email || 'Usuário',
          item_photos: item.item_photos || [],
        }));
      }
      if (user?.id) {
        await notificationsService.syncRenewalNotifications(user.id, allItems);
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
        console.error('[HomeScreen] Erro ao carregar itens:', error);
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

  const normalizeText = (text = '') =>
    String(text || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const applyFilters = (itemsToFilter) => {
    let filtered = itemsToFilter || [];

    // Filtro por status (Perdido / Encontrado)
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // Filtro por categoria (animal, objeto, etc)
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Filtro por espécie (Cachorro, Gato, etc)
    if (filters.animalType && filters.animalType !== 'all') {
      const selected = normalizeText(filters.animalType);
      filtered = filtered.filter(item => {
        const species = normalizeText(item.species || item.extra_fields?.species || '');
        if (selected === 'outro') {
          return species && !['cachorro', 'gato', 'bovino', 'ave', 'cavalo'].some(t => species.includes(t));
        }
        return species.includes(selected) || selected.includes(species);
      });
    }

    // Filtro "Meus Itens"
    if (filters.showMyItems && user?.id) {
      filtered = filtered.filter(item => item.owner_id === user.id);
    }

    // Filtro por Localização (Cidade / Estado)
    if (locationFilter && locationFilter.trim().length > 0) {
      const parts = locationFilter
        .split(',')
        .map(p => normalizeText(p))
        .filter(Boolean);

      // Identifica estado (UF ou nome por extenso)
      const stateToken = parts.find(p =>
        states.some(uf => normalizeText(uf) === p) ||
        Object.keys(normalizedRegionToUf).some(reg => reg === p)
      );
      const targetUf = stateToken
        ? (states.find(uf => normalizeText(uf) === stateToken) || normalizedRegionToUf[stateToken] || stateToken).toUpperCase()
        : null;

      // Identifica cidade
      const cityToken = parts.find(p => p !== stateToken);

      filtered = filtered.filter(item => {
        const rawItemCity = item.city || item.extra_fields?.location_details?.city || '';
        const rawItemState = item.state || item.extra_fields?.location_details?.state || '';

        const itemCityNorm = normalizeText(rawItemCity);
        const itemStateNorm = normalizeText(rawItemState);
        const itemStateUf = (
          states.find(uf => normalizeText(uf) === itemStateNorm) ||
          normalizedRegionToUf[itemStateNorm] ||
          rawItemState
        ).toUpperCase();

        const matchesCity = !cityToken || itemCityNorm.includes(cityToken) || cityToken.includes(itemCityNorm);
        const matchesState = !targetUf || itemStateUf === targetUf;

        return matchesCity && matchesState;
      });
    }

    // Filtro por termo de busca
    const search = normalizeText(searchTerm);
    if (search.length > 0) {
      filtered = filtered.filter(item => {
        const extra = item.extra_fields || {};
        const locDetails = extra.location_details || {};
        const searchableFields = [
          item.title,
          item.description,
          item.species,
          item.breed,
          item.city,
          item.state,
          item.neighborhood,
          extra.species,
          extra.breed,
          extra.animal_name,
          extra.third_party_owner?.name,
          locDetails.city,
          locDetails.state,
          locDetails.district,
          locDetails.street,
        ];
        return searchableFields.some(val => normalizeText(val).includes(search));
      });
    }

    console.log('[HomeScreen] Itens após filtros:', filtered.length);
    setFilteredItems(filtered);
    setExpandedItem(null);
    setExpandedItemDetails(null);
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    applyFilters(items);
  }, [filters, user, locationFilter, searchTerm, items]);

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
  // Preenche mensagem automática ao abrir o chat diretamente
  const handleSendMessage = async (ownerId, itemId, itemStatus) => {
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
    if (ownerId === user.id) {
      Alert.alert('Aviso', 'Você é o autor desta publicação.');
      return;
    }
    // Define mensagem automática inicial
    let autoMessage = '';
    if (itemStatus === 'lost') {
      autoMessage = 'Oi, eu encontrei seu pet!';
    } else {
      autoMessage = 'Oi, você encontrou meu pet?';
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
      Alert.alert(
        'Login necessário',
        'Entre ou crie uma conta para compartilhar informações sobre o pet.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Entrar', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
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

  const handleSendTestNotification = async () => {
    if (!user || !isAdmin) {
      Alert.alert('Acesso restrito', 'Apenas administradores podem testar o envio de notificações.');
      return;
    }

    try {
      await notificationsService.createNotification({
        user_id: user.id,
        type: 'test',
        title: 'Teste de WhatsApp',
        message: 'Esta é uma notificação de teste do app WeFIND.',
        item_id: null,
      });
      Alert.alert('Teste enviado', 'A notificação foi criada e o encaminhamento para WhatsApp foi acionado.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível enviar a notificação de teste.');
    }
  };

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
      <View style={{ backgroundColor: '#2563EB', paddingTop: 40, paddingBottom: 8, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#2563EB' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 23, letterSpacing: 0.8, marginBottom: 2 }}>WeFIND</Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 5,
                marginTop: 4,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.28)',
              }}
              onPress={() => {
                setProfileEditCity(activeCity);
                setProfileEditState(activeState);
                setShowProfileLocationModal(true);
              }}
              accessibilityLabel={`Localidade: ${displayLocation}`}
              activeOpacity={0.75}
            >
              <MaterialIcons name="place" size={15} color="#FEA937" style={{ marginRight: 4 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginRight: 6 }}>
                {displayLocation}
              </Text>
              <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 10, padding: 2 }}>
                <MaterialIcons name="edit" size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
          {user && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
              <NotificationBell />
              <TouchableOpacity
                onPress={() => setShowProfileMenu((prev) => !prev)}
                style={{ borderWidth: 2, borderColor: '#fff', borderRadius: 22, padding: 2 }}
                accessibilityLabel="Abrir menu do perfil"
              >
                {userProfile?.avatar_url ? (
                  <Image source={{ uri: userProfile.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' }} />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F28213', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{userProfile?.name ? userProfile.name[0].toUpperCase() : 'U'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
          {user && showProfileMenu && (
            <View style={styles.profileMenu}>
              <View style={styles.profileMenuHeader}>
                <View style={styles.profileMenuAvatar}>
                  {userProfile?.avatar_url ? (
                    <Image source={{ uri: userProfile.avatar_url }} style={styles.profileMenuAvatarImage} />
                  ) : (
                    <Text style={styles.profileMenuAvatarText}>{userProfile?.name ? userProfile.name[0].toUpperCase() : 'U'}</Text>
                  )}
                </View>
                <View style={styles.profileMenuIdentity}>
                  <Text style={styles.profileMenuName} numberOfLines={1}>{userProfile?.name || 'Usuário'}</Text>
                  <Text style={styles.profileMenuEmail} numberOfLines={1}>{user?.email || 'Conta WeFIND'}</Text>
                </View>
              </View>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => {
                    setShowProfileMenu(false);
                    navigation.navigate('Admin');
                  }}
                  style={styles.profileMenuItem}
                >
                  <View style={[styles.profileMenuIcon, styles.profileMenuAdminIcon]}>
                    <MaterialIcons name="admin-panel-settings" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.profileMenuItemText}>Administração</Text>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  setShowProfileMenu(false);
                  navigation.navigate('ProfileTab');
                }}
                style={styles.profileMenuItem}
              >
                <View style={styles.profileMenuIcon}>
                  <MaterialIcons name="person-outline" size={18} color="#2563EB" />
                </View>
                <Text style={styles.profileMenuItemText}>Perfil</Text>
                <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <View style={styles.profileMenuDivider} />
              <TouchableOpacity
                onPress={() => {
                  setShowProfileMenu(false);
                  if (typeof signOut === 'function') signOut();
                  else if (typeof navigation?.navigate === 'function') navigation.navigate('Login');
                }}
                style={styles.profileMenuItem}
              >
                <View style={[styles.profileMenuIcon, styles.profileMenuLogoutIcon]}>
                  <MaterialIcons name="logout" size={18} color="#DC2626" />
                </View>
                <Text style={styles.profileMenuLogoutText}>Sair</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {isAdmin && (
          <TouchableOpacity
            onPress={handleSendTestNotification}
            style={{ marginTop: 12, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' }}
          >
            <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 14 }}>Testar WhatsApp</Text>
          </TouchableOpacity>
        )}

        {/* Modal para atualizar localidade do perfil ou filtrar por região */}
        <Modal
          visible={!!showProfileLocationModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProfileLocationModal(false)}
        >
          <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' }}>
            <View style={{ backgroundColor:'#fff', borderRadius:14, paddingVertical:24, paddingHorizontal:18, minWidth:340, maxWidth: '95%' }}>
              <Text style={{ fontWeight:'bold', fontSize:17, color:'#2563EB', marginBottom:4 }}>
                {user ? 'Atualizar Localidade' : 'Filtrar por Região'}
              </Text>
              <Text style={{ color:'#6B7280', fontSize:13, marginBottom:14 }}>
                {user
                  ? 'Escolha sua cidade e estado para personalizar o feed e seu perfil:'
                  : 'Escolha uma cidade e estado para visualizar publicações dessa região:'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowProfileLocationModal(false);
                  setProfileMapVisible(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#2563EB', borderRadius: 10, paddingVertical: 12, marginBottom: 14 }}
              >
                <MaterialIcons name="map" size={19} color="#2563EB" />
                <Text style={{ color: '#2563EB', fontWeight: '700', marginLeft: 8 }}>Escolher no mapa</Text>
              </TouchableOpacity>
              {(profileEditCity || profileEditState) ? (
                <View style={{ backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginBottom: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#374151', fontSize: 13, fontWeight: '500' }}>Localização selecionada:</Text>
                  <Text style={{ color: '#2563EB', fontSize: 15, fontWeight: '800', marginTop: 2 }}>
                    {[profileEditCity, profileEditState].filter(Boolean).join(', ')}
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 }}>
                <Button
                  title="Cancelar"
                  variant="secondary"
                  onPress={() => setShowProfileLocationModal(false)}
                  style={{ flex: 1, minHeight: 46 }}
                />
                <Button
                  title="Salvar"
                  variant="primary"
                  onPress={handleSaveProfileLocation}
                  disabled={!profileEditState || !profileEditCity}
                  style={{ flex: 1, minHeight: 46 }}
                />
              </View>
              {(sessionCity || userProfile?.city || locationFilter) ? (
                <TouchableOpacity
                  onPress={handleResetToBrazil}
                  style={{ marginTop: 12, alignItems: 'center', paddingVertical: 6 }}
                >
                  <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
                    🇧🇷 Ver publicações de todo o Brasil
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Modal>
        <MapLocationPicker
          visible={profileMapVisible}
          mode="profile"
          onClose={() => setProfileMapVisible(false)}
          onConfirm={({ address, addressDetails }) => {
            const region = String(addressDetails?.state || address?.region || '').trim();
            const stateValue = states.includes(region.toUpperCase())
              ? region.toUpperCase()
              : (normalizedRegionToUf[normalizeRegionName(region)] || region);
            const cityValue = addressDetails?.city || address?.city || address?.subregion || address?.district || '';
            setProfileEditState(stateValue);
            setProfileEditCity(cityValue);
            setProfileMapVisible(false);
            setShowProfileLocationModal(true);
          }}
        />
      </View>

      {/* Busca de pets acima dos filtros */}
      <View style={{ marginTop: 12, marginHorizontal: 16 }}>
        <Text style={{ color: '#1E1B4B', fontSize: 14, fontWeight: '800', marginBottom: 7 }}>
          Encontre um pet perdido ou encontrado
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1E3A8A', paddingHorizontal: 14, height: 48, shadowColor: '#1E3A8A', shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 }}>
          <MaterialIcons name="search" size={23} color="#1E3A8A" style={{ marginRight: 8 }} />
          <Input
            placeholder="Nome, raça, espécie ou cidade..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{ flex: 1, backgroundColor: 'transparent', borderWidth: 0, fontSize: 16, color: '#111827', paddingVertical: 0, paddingHorizontal: 0 }}
            textStyle={{ fontSize: 16, color: '#111827' }}
            placeholderTextColor="#475569"
          />
        </View>
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
                <Text style={{ fontWeight:'bold', fontSize:16, color:'#2563EB', marginBottom:8 }}>Filtrar por Bairro</Text>
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
                <Text style={{ fontWeight:'bold', fontSize:16, color:'#2563EB', marginBottom:8 }}>Filtrar por Localidade</Text>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setEditState(user ? editState : '');
                  setEditCity(user ? editCity : '');
                  setEditNeighborhood('');
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}
              >
                <Text style={{ color: '#374151', fontWeight: 'bold', fontSize: 13 }}>Limpar Filtro</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditLocationModal(false)}
                style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#E5E7EB', borderRadius: 8 }}
              >
                <Text style={{ color: '#1F2937', fontWeight: 'bold', fontSize: 13 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setLocationFilterTouched(true);
                  setEditLocationModal(false);
                  setLocationFilter(`${editCity}, ${editState}${editNeighborhood ? ', ' + editNeighborhood : ''}`);
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
                <Text style={{ color:'#2563EB', fontWeight:'bold' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Filtros rápidos */}
      <View style={styles.filterToolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterToolbarContent}>
          <TouchableOpacity
            style={[styles.filterToggle, showAdvancedFilters && styles.filterToggleActive]}
            onPress={() => setShowAdvancedFilters(v => !v)}
            accessibilityLabel="Abrir filtros avançados"
          >
            <MaterialIcons name="tune" size={21} color={showAdvancedFilters ? '#fff' : '#1E3A8A'} />
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
            accessibilityLabel="Minhas publicações"
          >
              <MaterialIcons name="person" size={16} color={filters.showMyItems ? '#fff' : '#1F2937'} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Lista de pets */}
      {showAdvancedFilters && (
        <View style={styles.advancedFiltersPanel}>
          <Text style={styles.advancedFiltersTitle}>Mais filtros</Text>
          <View style={styles.speciesPickerWrapper}>
            <MaterialIcons name="pets" size={19} color="#1E3A8A" style={{ marginLeft: 12 }} />
            <Picker
              selectedValue={advancedFilters.animalType || 'all'}
              onValueChange={value => {
                setAdvancedFilters(f => ({ ...f, animalType: value }));
                setFilters(f => ({ ...f, animalType: value }));
              }}
              style={styles.speciesPicker}
            >
              <Picker.Item label="Todas" value="all" />
              <Picker.Item label="Cachorro" value="cachorro" />
              <Picker.Item label="Gato" value="gato" />
              <Picker.Item label="Bovino" value="bovino" />
              <Picker.Item label="Ave" value="ave" />
              <Picker.Item label="Cavalo" value="cavalo" />
              <Picker.Item label="Outro" value="outro" />
            </Picker>
          </View>
          <View style={styles.locationFilterRow}>
            <TouchableOpacity onPress={() => setEditLocationModal(true)} style={styles.locationFilterButton}>
              <MaterialIcons name="place" size={20} color="#1E3A8A" style={{ marginRight: 8 }} />
              <Text style={styles.locationFilterText}>Filtrar por bairro</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Quantidade de pets encontrados */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ color: '#6B7280', fontSize: 15 }}>
          {String(filteredItems.filter(item => {
            const matchesAnimalType = advancedFilters.animalType === 'all' || advancedFilters.animalType === undefined || !item.species
              ? true
              : String(item.species || '').toLowerCase().includes(String(advancedFilters.animalType).toLowerCase());
            return (advancedFilters.category === 'all' || item.category === advancedFilters.category) && matchesAnimalType;
          }).length) + ' pets encontrados'}
        </Text>
      </View>
      <FlatList
        data={filteredItems.filter(item => {
          const matchesAnimalType = advancedFilters.animalType === 'all' || advancedFilters.animalType === undefined || !item.species
            ? true
            : String(item.species || '').toLowerCase().includes(String(advancedFilters.animalType).toLowerCase());
          return (advancedFilters.category === 'all' || item.category === advancedFilters.category) && matchesAnimalType;
        })}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            user={user}
            thumbnails={thumbnails}
            handleSendMessage={handleSendMessage}
            handleEditItem={handleEditItem}
            handleDeleteItem={handleDeleteItem}
            onPress={() => {
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
            <Text style={styles.emptyText}>Nenhum pet encontrado</Text>
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
  profileMenu: {
    position: 'absolute',
    top: 56,
    right: 18,
    width: 236,
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    shadowColor: '#111827',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 100,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
  },
  profileMenuAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    overflow: 'hidden',
  },
  profileMenuAvatarImage: { width: 36, height: 36 },
  profileMenuAvatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  profileMenuIdentity: { flex: 1, marginLeft: 10 },
  profileMenuName: { color: '#111827', fontSize: 14, fontWeight: '800' },
  profileMenuEmail: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  profileMenuItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  profileMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  profileMenuAdminIcon: { backgroundColor: '#EFF6FF' },
  profileMenuLogoutIcon: { backgroundColor: '#FEF2F2' },
  profileMenuItemText: { flex: 1, marginLeft: 10, color: '#1F2937', fontSize: 14, fontWeight: '700' },
  profileMenuLogoutText: { flex: 1, marginLeft: 10, color: '#DC2626', fontSize: 14, fontWeight: '700' },
  profileMenuDivider: { height: 1, marginVertical: 4, backgroundColor: '#E5E7EB' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  filterToolbar: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
  },
  filterToolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  filterToggle: {
    width: 38,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  filterToggleActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  advancedFiltersPanel: {
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
  },
  advancedFiltersTitle: {
    color: '#1E1B4B',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  speciesPickerWrapper: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  speciesPicker: {
    flex: 1,
    height: 52,
    minWidth: 0,
    color: '#1E1B4B',
  },
  locationFilterRow: {
    marginTop: 14,
  },
  locationFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  locationFilterText: {
    color: '#1E1B4B',
    fontSize: 16,
    fontWeight: '700',
  },
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
    marginRight: 0,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexShrink: 0,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
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
    color: '#2563EB',
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
    borderLeftColor: '#2563EB',
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
    backgroundColor: '#2563EB',
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
