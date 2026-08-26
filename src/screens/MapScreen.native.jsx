import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as itemsService from '../services/items';

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

const hasCoordinates = (item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));

const MapScreen = ({ navigation }) => {
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
      const mappedItems = (data || []).filter(hasCoordinates);
      setItems(mappedItems);
      if (mappedItems.length > 0 && locationStatusRef.current !== 'granted') {
        setRegion({
          latitude: Number(mappedItems[0].latitude),
          longitude: Number(mappedItems[0].longitude),
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        });
      }
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
          <TouchableOpacity style={styles.infoClose} onPress={() => setSelectedItem(null)}>
            <Text style={styles.infoCloseText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.infoTitle} numberOfLines={1}>{selectedItem.title || 'Animal'}</Text>
          <Text style={[styles.infoStatus, { color: statusColor }]}>
            {statusLabel}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: statusColor, marginTop: 4 }}>
            {isFound ? 'Local onde foi encontrado:' : (isAdoption ? 'Local para adoção:' : 'Última vez visto em:')}
          </Text>
          <Text style={styles.infoLocation} numberOfLines={1}>
            {[selectedItem.city, selectedItem.state, selectedItem.neighborhood].filter(Boolean).join(' - ') || 'Localização escolhida no mapa'}
          </Text>
          {selectedItem.description ? (
            <Text style={styles.infoDescription} numberOfLines={2}>{selectedItem.description}</Text>
          ) : null}
          <TouchableOpacity style={styles.detailsButton} onPress={() => navigation.navigate('ItemDetail', { itemId: selectedItem.id })}>
            <Text style={styles.detailsButtonText}>Ver informações completas</Text>
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
          <Text style={styles.loadingText}>Carregando localizações...</Text>
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
  // markerRing, markerRingSelected e markerInner removidos — estilos inline no componente
  markerFallback: { fontSize: 22 },
  infoCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 22,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  infoClose: { position: 'absolute', top: 8, right: 10, padding: 6 },
  infoCloseText: { color: '#6B7280', fontWeight: '700' },
  infoTitle: { color: '#111827', fontSize: 17, fontWeight: '700', paddingRight: 24 },
  infoStatus: { fontWeight: '700', marginTop: 4 },
  infoLocation: { color: '#4B5563', marginTop: 7 },
  infoDescription: { color: '#6B7280', marginTop: 6, lineHeight: 18 },
  detailsButton: { marginTop: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2563EB', alignItems: 'center' },
  detailsButtonText: { color: '#FFFFFF', fontWeight: '700' },
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
  },
  loadingText: { color: '#374151' },
});

const PetMapMarker = React.memo(({ item, isSelected, onPress, onCalloutPress }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const photoUrl = item.item_photos?.[0]?.url;
  const coordinate = { latitude: Number(item.latitude), longitude: Number(item.longitude) };
  const isAdoption = itemsService.isPetAvailableForAdoption(item);
  const isFound = !isAdoption && item.status === 'found';
  const statusColor = isAdoption ? '#DB2777' : (isFound ? '#16A34A' : '#F97316');
  const statusLabel = isAdoption ? 'Para Adoção' : (isFound ? 'Encontrado' : 'Perdido');

  const SIZE = isSelected ? 70 : 56;
  const BORDER = 4;
  // Diâmetro interno da foto = circulo total menos as 2 bordas e 2px de gap branco
  const GAP = 2;
  const PHOTO = SIZE - (BORDER + GAP) * 2;

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      onCalloutPress={onCalloutPress}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      {/*
        Android: elevation + borderRadius num View pai clipa os filhos.
        Solução: estrutura PLANA — o anel é um View circular sem elevation;
        a foto é uma Image com borderRadius (Android clipa a Image por conta
        própria sem precisar de overflow:hidden no pai).
        iOS: usamos shadowColor no wrapper transparente.
      */}
      <View
        collapsable={false}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: BORDER,
          borderColor: statusColor,
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          // iOS shadow (não afeta Android)
          shadowColor: statusColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.6,
          shadowRadius: 6,
          // Android: NÃO usar elevation aqui — causaria clipping
          // Escala quando selecionado
          transform: isSelected ? [{ scale: 1.12 }] : [{ scale: 1 }],
        }}
      >
        {photoUrl ? (
          // Image com borderRadius: Android renderiza circular sem overflow:hidden no pai
          <Image
            source={{ uri: photoUrl }}
            style={{
              width: PHOTO,
              height: PHOTO,
              borderRadius: PHOTO / 2,
              backgroundColor: '#E5E7EB',
            }}
            resizeMode="cover"
            onLoadEnd={() => {
              setTimeout(() => setTracksViewChanges(false), 500);
            }}
          />
        ) : (
          <View
            style={{
              width: PHOTO,
              height: PHOTO,
              borderRadius: PHOTO / 2,
              backgroundColor: statusColor + '28',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18 }}>🐾</Text>
          </View>
        )}
      </View>
      <Callout>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle} numberOfLines={1}>{item.title || 'Animal'}</Text>
          <Text style={[styles.calloutStatus, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={styles.calloutAction}>Toque para ver detalhes</Text>
        </View>
      </Callout>
    </Marker>
  );
});

export default MapScreen;
