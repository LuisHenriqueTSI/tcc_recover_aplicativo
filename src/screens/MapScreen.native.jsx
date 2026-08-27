import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as itemsService from '../services/items';
import { useAuth } from '../contexts/AuthContext';

const BRAZIL_REGION = {
  latitude: -14.235,
  longitude: -51.9253,
  latitudeDelta: 35,
  longitudeDelta: 35,
};

const PETS_ONLY_MAP_STYLE = [
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

// Cache em memória para geocodificação de cidades/estados
const geoCityCache = {};

const geocodeItemLocation = async (item) => {
  // 1. Tenta extrair coordenadas diretas já presentes
  const directLat = item.latitude ?? item.extra_fields?.location_details?.latitude ?? item.extra_fields?.latitude;
  const directLng = item.longitude ?? item.extra_fields?.location_details?.longitude ?? item.extra_fields?.longitude;

  if (Number.isFinite(Number(directLat)) && Number.isFinite(Number(directLng)) && Number(directLat) !== 0 && Number(directLng) !== 0) {
    return {
      latitude: Number(directLat),
      longitude: Number(directLng),
    };
  }

  // 2. Tenta geocodificar por Cidade e Estado
  const city = item.city || item.extra_fields?.city;
  const state = item.state || item.extra_fields?.state;
  if (!city || !state) return null;

  const cacheKey = `${city.trim()}-${state.trim()}`.toLowerCase();
  if (geoCityCache[cacheKey]) {
    return geoCityCache[cacheKey];
  }

  try {
    const query = `${city}, ${state}, Brasil`;
    const results = await Location.geocodeAsync(query);
    if (results && results.length > 0) {
      const coords = {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      };
      geoCityCache[cacheKey] = coords;
      return coords;
    }
  } catch (err) {
    console.log('[MapScreen] Erro no geocoding do item:', err?.message || err);
  }

  return null;
};

const MapScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('checking');
  const locationStatusRef = useRef('checking');
  const [region, setRegion] = useState(BRAZIL_REGION);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase().trim();
    return items.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const species = (item.species || '').toLowerCase();
      const breed = (item.breed || '').toLowerCase();
      const city = (item.city || '').toLowerCase();
      const state = (item.state || '').toLowerCase();
      const neighborhood = (item.neighborhood || '').toLowerCase();
      const category = (item.category || '').toLowerCase();

      return (
        title.includes(term) ||
        desc.includes(term) ||
        species.includes(term) ||
        breed.includes(term) ||
        city.includes(term) ||
        state.includes(term) ||
        neighborhood.includes(term) ||
        category.includes(term)
      );
    });
  }, [items, searchTerm]);

  // Ao buscar, recentraliza suavemente no primeiro animal correspondente encontrado
  useEffect(() => {
    if (searchTerm.trim() && filteredItems.length > 0 && mapRef.current) {
      const first = filteredItems[0];
      if (first?.latitude && first?.longitude) {
        mapRef.current.animateToRegion({
          latitude: Number(first.latitude),
          longitude: Number(first.longitude),
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }, 500);
      }
    }
  }, [searchTerm, filteredItems]);

  const requestUserLocation = useCallback(async () => {
    locationStatusRef.current = 'checking';
    setLocationStatus('checking');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        locationStatusRef.current = 'denied';
        setLocationStatus('denied');
        return null;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      const current = lastKnown || await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinate = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setRegion({ ...coordinate, latitudeDelta: 0.08, longitudeDelta: 0.08 });
      locationStatusRef.current = 'granted';
      setLocationStatus('granted');
      return coordinate;
    } catch (error) {
      console.warn('[MapScreen] Não foi possível obter a localização:', error.message);
      locationStatusRef.current = 'unavailable';
      setLocationStatus('unavailable');
      return null;
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await itemsService.listItemsWithPhotosAndOwner({ resolved: false });

      // Resolve coordenadas de forma resiliente para todos os animais cadastrados
      const resolvedList = await Promise.all(
        (data || []).map(async (rawItem) => {
          const coords = await geocodeItemLocation(rawItem);
          if (coords) {
            return {
              ...rawItem,
              latitude: coords.latitude,
              longitude: coords.longitude,
            };
          }
          return null;
        })
      );

      const validItems = resolvedList.filter(Boolean);
      setItems(validItems);

      // Se o usuário ainda não concedeu GPS, centraliza no primeiro animal encontrado ou região padrão
      if (validItems.length > 0 && locationStatusRef.current !== 'granted') {
        const first = validItems[0];
        setRegion({
          latitude: first.latitude,
          longitude: first.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        });
      }
    } catch (e) {
      console.warn('[MapScreen] Erro ao carregar itens para o mapa:', e?.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCenterOnUser = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationStatus('denied');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const userCoord = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
      setRegion(userCoord);
      if (mapRef.current) {
        mapRef.current.animateToRegion(userCoord, 500);
      }
      locationStatusRef.current = 'granted';
      setLocationStatus('granted');
    } catch (error) {
      console.warn('[MapScreen] Não foi possível recentralizar no usuário:', error.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      requestUserLocation();
      loadItems();
    }, [loadItems, requestUserLocation])
  );

  if (locationStatus === 'checking') {
    return (
      <View style={styles.permissionState}>
        <ActivityIndicator color="#2563EB" size="large" />
        <Text style={styles.permissionTitle}>Obtendo sua localização</Text>
        <Text style={styles.permissionText}>Precisamos dela para abrir o mapa perto de você.</Text>
      </View>
    );
  }

  const isAdoption = itemsService.isPetAvailableForAdoption(selectedItem);
  const isFound = !isAdoption && selectedItem?.status === 'found';
  const statusColor = isAdoption ? '#DB2777' : (isFound ? '#16A34A' : '#F97316');
  const statusLabel = isAdoption ? 'Disponível para Adoção' : (isFound ? 'Animal encontrado' : 'Animal perdido');

  return (
    <View style={styles.container}>
      {/* Barra de Pesquisa Flutuante de Animais */}
      <View style={[styles.searchContainer, { top: Math.max(insets.top + 8, 44) }]}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color="#2563EB" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nome, raça, espécie ou cidade..."
            placeholderTextColor="#94A3B8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchTerm.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearchBtn} activeOpacity={0.7}>
              <MaterialIcons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          ) : (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredItems.length}</Text>
            </View>
          )}
        </View>

        {/* Feedback visual caso nenhum animal seja encontrado */}
        {searchTerm.trim().length > 0 && filteredItems.length === 0 && (
          <View style={styles.noResultsBox}>
            <MaterialIcons name="info-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.noResultsText}>
              Nenhum animal encontrado para "{searchTerm}"
            </Text>
          </View>
        )}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={locationStatus === 'granted'}
        showsMyLocationButton={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        customMapStyle={PETS_ONLY_MAP_STYLE}
      >
        {filteredItems.map((item) => (
          <PetMapMarker
            key={String(item.id)}
            item={item}
            isSelected={selectedItem?.id === item.id}
            onPress={() => setSelectedItem(item)}
            onCalloutPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
          />
        ))}
      </MapView>

      {selectedItem && (
        <View style={styles.infoCard}>
          <TouchableOpacity style={styles.infoClose} onPress={() => setSelectedItem(null)} activeOpacity={0.7}>
            <MaterialIcons name="close" size={18} color="#64748B" />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            {selectedItem.item_photos?.[0]?.url ? (
              <Image
                source={{ uri: selectedItem.item_photos[0].url }}
                style={{ width: 64, height: 64, borderRadius: 14, marginRight: 12, backgroundColor: '#E2E8F0' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 14, marginRight: 12, backgroundColor: statusColor + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 30 }}>🐾</Text>
              </View>
            )}

            <View style={{ flex: 1, paddingRight: 20 }}>
              <Text style={styles.infoTitle} numberOfLines={1}>{selectedItem.title || 'Animal'}</Text>
              <View style={{
                alignSelf: 'flex-start',
                backgroundColor: statusColor + '18',
                borderColor: statusColor + '40',
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 7,
                paddingVertical: 2.5,
                marginTop: 4,
              }}>
                <Text style={{ color: statusColor, fontWeight: '800', fontSize: 11 }}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
            padding: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 10,
          }}>
            <MaterialIcons name="place" size={16} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12.5, color: '#334155', fontWeight: '600', flex: 1 }} numberOfLines={1}>
              {[selectedItem.neighborhood, selectedItem.city, selectedItem.state].filter(Boolean).join(' - ') || 'Localização marcada'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => navigation.navigate('ItemDetail', { itemId: selectedItem.id })}
            activeOpacity={0.85}
          >
            <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
            <MaterialIcons name="chevron-right" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      )}

      {locationStatus === 'granted' && (
        <TouchableOpacity
          style={[styles.centerLocationButton, selectedItem && styles.centerLocationButtonRaised]}
          onPress={handleCenterOnUser}
          accessibilityLabel="Voltar para minha localização"
        >
          <MaterialIcons name="my-location" size={24} color="#2563EB" />
        </TouchableOpacity>
      )}

      {locationStatus !== 'granted' && (
        <View style={styles.locationNotice}>
          <Text style={styles.locationNoticeText}>
            {locationStatus === 'denied'
              ? 'Permita o acesso à localização para abrir o mapa perto de você.'
              : 'Não foi possível obter sua localização. Você pode navegar pelo mapa manualmente.'}
          </Text>
          <TouchableOpacity onPress={requestUserLocation} style={styles.retryButton}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && items.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nenhuma localização marcada</Text>
          <Text style={styles.emptyText}>Os animais aparecerão aqui quando um ponto for escolhido no cadastro.</Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.loadingText}>Carregando animais no mapa...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E5E7EB' },
  map: { flex: 1 },
  searchContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 30,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clearSearchBtn: {
    padding: 4,
    marginLeft: 4,
  },
  countBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginLeft: 4,
  },
  countBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
  },
  noResultsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  noResultsText: {
    color: '#991B1B',
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  centerLocationButton: { position: 'absolute', right: 16, bottom: 108, width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  centerLocationButtonRaised: { bottom: 270 },
  permissionState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F9FAFB' },
  permissionTitle: { color: '#111827', fontSize: 18, fontWeight: '700', marginTop: 14 },
  permissionText: { color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  locationNotice: { position: 'absolute', left: 16, right: 16, bottom: 22, padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  locationNoticeText: { color: '#374151', lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', marginTop: 8 },
  retryText: { color: '#2563EB', fontWeight: '700' },
  markerFallback: { fontSize: 22 },
  infoCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    zIndex: 10,
  },
  infoTitle: { color: '#0F172A', fontSize: 16.5, fontWeight: '800' },
  infoStatus: { fontWeight: '700', marginTop: 4 },
  infoLocation: { color: '#475569', marginTop: 7 },
  infoDescription: { color: '#64748B', marginTop: 6, lineHeight: 18 },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  detailsButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  callout: { width: 190, padding: 4 },
  calloutTitle: { color: '#111827', fontWeight: '700', fontSize: 15 },
  calloutStatus: { color: '#2563EB', marginTop: 3 },
  calloutAction: { color: '#6B7280', fontSize: 12, marginTop: 6 },
  emptyState: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 28,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  emptyTitle: { color: '#111827', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#6B7280', textAlign: 'center', marginTop: 5 },
  loadingState: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  loadingText: { color: '#374151', fontWeight: '600', fontSize: 13 },
});

const getSpeciesEmoji = (item) => {
  const species = (item.species || item.extra_fields?.species || '').toLowerCase();
  const title = (item.title || '').toLowerCase();

  if (species.includes('cachorro') || species.includes('cao') || species.includes('cão') || title.includes('cachorro') || title.includes('cão')) {
    return '🐶';
  }
  if (species.includes('gato') || title.includes('gato')) {
    return 'CAT_ICON';
  }
  if (species.includes('ave') || species.includes('passaro') || species.includes('pássaro') || species.includes('calopsita') || species.includes('papagaio')) {
    return '🦜';
  }
  if (species.includes('cavalo') || species.includes('equino') || species.includes('egua') || species.includes('égua')) {
    return '🐴';
  }
  if (species.includes('bovino') || species.includes('vaca') || species.includes('boi')) {
    return '🐮';
  }
  if (species.includes('coelho')) {
    return '🐰';
  }
  return '🐾';
};

const PetMapMarker = React.memo(({ item, isSelected, onPress, onCalloutPress }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    // Permite que o React Native monte o layout visual antes de congelar a renderização do marcador
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [isSelected, item.id]);

  const coordinate = {
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
  };

  const isAdoption = itemsService.isPetAvailableForAdoption(item);
  const isFound = !isAdoption && item.status === 'found';
  const statusColor = isAdoption ? '#DB2777' : (isFound ? '#16A34A' : '#EA580C');
  const statusLabel = isAdoption ? 'Adoção' : (isFound ? 'Encontrado' : 'Perdido');
  const statusIcon = isAdoption ? '💖' : (isFound ? '🟢' : '🔴');
  const emoji = getSpeciesEmoji(item);

  const RING_SIZE = isSelected ? 33 : 26;
  const BORDER_W = isSelected ? 3.2 : 2.5;

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      onCalloutPress={onCalloutPress}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        collapsable={false}
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: RING_SIZE / 2,
          backgroundColor: '#FFFFFF',
          borderWidth: BORDER_W,
          borderColor: statusColor,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 2.5,
          elevation: 4,
        }}
      >
        {/* Emoji ou Ícone da Espécie */}
        {emoji === 'CAT_ICON' ? (
          <Image
            source={require('../../assets/cat_face.png')}
            style={{
              width: isSelected ? 18 : 14.5,
              height: isSelected ? 18 : 14.5,
            }}
            resizeMode="contain"
          />
        ) : (
          <Text
            style={{
              fontSize: isSelected ? 17 : 13.5,
              includeFontPadding: false,
              textAlign: 'center',
            }}
          >
            {emoji}
          </Text>
        )}
      </View>
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle} numberOfLines={1}>{item.title || 'Animal'}</Text>
          <Text style={[styles.calloutStatus, { color: statusColor }]}>{isAdoption ? 'Para Adoção' : (isFound ? 'Animal Encontrado' : 'Animal Perdido')}</Text>
          <Text style={styles.calloutAction}>Toque para ver detalhes</Text>
        </View>
      </Callout>
    </Marker>
  );
});

export default MapScreen;
