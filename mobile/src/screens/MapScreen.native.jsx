import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as itemsService from '../services/items';
import { citiesByState, neighborhoodsByCity, states } from '../lib/br-locations';
import OptimizedImage from '../components/OptimizedImage';

const BRAZIL_REGION = {
  latitude: -14.235,
  longitude: -51.9253,
  latitudeDelta: 35,
  longitudeDelta: 35,
};

const hasCoordinates = (item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));
const normalizeSearchText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const catalogSuggestions = [
  ...states.map((state) => ({ label: state, detail: 'Estado', search: normalizeSearchText(state), type: 'state' })),
  ...Object.entries(citiesByState).flatMap(([state, cities]) => cities.map((city) => ({
    label: `${city}, ${state}`,
    search: normalizeSearchText(`${city}, ${state}`),
    detail: 'Cidade',
    type: 'city',
  }))),
  ...Object.entries(neighborhoodsByCity).flatMap(([city, neighborhoods]) => neighborhoods.map((neighborhood) => ({
    label: `${neighborhood}, ${city}`,
    search: normalizeSearchText(`${neighborhood}, ${city}`),
    detail: 'Bairro',
    type: 'neighborhood',
  }))),
];

const MapScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('checking');
  const locationStatusRef = useRef('checking');
  const [region, setRegion] = useState(BRAZIL_REGION);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [remoteSuggestions, setRemoteSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    const query = searchText.trim();
    if (query.length < 3) {
      setRemoteSuggestions([]);
      setLoadingSuggestions(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(query)}`,
          {
            headers: {
              Accept: 'application/json',
              'Accept-Language': 'pt-BR',
            },
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error(`Busca remota retornou ${response.status}`);
        const results = await response.json();
        setRemoteSuggestions((results || []).map((result) => ({
          label: result.display_name,
          detail: 'OpenStreetMap',
          search: normalizeSearchText(result.display_name),
          latitude: Number(result.lat),
          longitude: Number(result.lon),
          type: 'remote',
        })));
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('[MapScreen] Falha nas sugestões remotas:', error.message);
          setRemoteSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText]);

  const searchSuggestions = useMemo(() => {
    const query = normalizeSearchText(searchText);
    if (query.length < 2) return [];

    const itemSuggestions = items.flatMap((item) => {
      if (!hasCoordinates(item)) return [];
      const location = item.neighborhood
        ? `${item.neighborhood}, ${item.city || ''}, ${item.state || ''}`
        : item.city && item.state ? `${item.city}, ${item.state}` : item.city || item.state || '';
      return location ? [{
        label: location,
        detail: 'Localização de anúncio',
        type: 'item',
        search: normalizeSearchText(location),
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
      }] : [];
    });
    const uniqueSuggestions = [...new Map(
      [...catalogSuggestions, ...itemSuggestions].map((suggestion) => [suggestion.search, suggestion])
    ).values()];

    return [...remoteSuggestions, ...uniqueSuggestions]
      .filter((suggestion) => suggestion.search.includes(query))
      .sort((a, b) => {
        const aStarts = a.search.startsWith(query) ? 0 : 1;
        const bStarts = b.search.startsWith(query) ? 0 : 1;
        return aStarts - bStarts || a.type.localeCompare(b.type) || a.label.localeCompare(b.label, 'pt-BR');
      })
      .slice(0, 6);
  }, [items, remoteSuggestions, searchText]);

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

  const handleSearchLocation = async (value = searchText, suggestion = null) => {
    const query = value.trim();
    if (!query) return;

    setSearchText(query);
    setSearchMessage('');
    if (suggestion?.latitude && suggestion?.longitude) {
      setRegion({
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
      return;
    }
    setSearching(true);
    try {
      const results = await Location.geocodeAsync(query);
      const firstResult = results[0];
      if (!firstResult) {
        setSearchMessage('Localização não encontrada. Tente informar cidade e estado.');
        return;
      }

      setRegion({
        latitude: firstResult.latitude,
        longitude: firstResult.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
    } catch (error) {
      console.warn('[MapScreen] Falha ao pesquisar localização:', error.message);
      setSearchMessage('Não foi possível pesquisar agora. Tente novamente.');
    } finally {
      setSearching(false);
    }
  };

  const handleCenterOnUser = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationStatus('denied');
        return;
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setRegion({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
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
        <ActivityIndicator color="#4F46E5" size="large" />
        <Text style={styles.permissionTitle}>Obtendo sua localização</Text>
        <Text style={styles.permissionText}>Precisamos dela para abrir o mapa perto de você.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={locationStatus === 'granted'}
        showsMyLocationButton={false}
      >
        {items.map((item) => {
          const photoUrl = item.item_photos?.[0]?.url;
          const coordinate = { latitude: Number(item.latitude), longitude: Number(item.longitude) };
          const isFound = item.status === 'found';
          const statusColor = isFound ? '#16A34A' : '#F97316';
          return (
            <Marker
              key={String(item.id)}
              coordinate={coordinate}
              onPress={() => setSelectedItem(item)}
              onCalloutPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
            >
              <View style={[styles.marker, { backgroundColor: statusColor }]} collapsable={false}>
                <View style={styles.markerImageFrame}>
                  {photoUrl ? (
                    <OptimizedImage
                      uri={photoUrl}
                      style={styles.markerImage}
                      onLoad={() => console.log('[MapScreen] Foto carregada:', photoUrl)}
                      onError={(error) => console.warn('[MapScreen] Falha ao carregar foto:', photoUrl, error.nativeEvent.error)}
                    />
                  ) : (
                    <Text style={styles.markerFallback}>🐾</Text>
                  )}
                </View>
              </View>
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>{item.title || 'Pet'}</Text>
                  <Text style={styles.calloutStatus}>{item.status === 'found' ? 'Encontrado' : 'Perdido'}</Text>
                  <Text style={styles.calloutAction}>Toque para ver detalhes</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.searchBar}>
        <TextInput
          value={searchText}
          onChangeText={(value) => {
            setSearchText(value);
            setSearchMessage('');
          }}
          placeholder="Pesquisar cidade ou endereço"
          placeholderTextColor="#6B7280"
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={handleSearchLocation}
          editable={!searching}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchLocation}
          disabled={searching || !searchText.trim()}
        >
          {searching ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.searchButtonText}>Buscar</Text>}
        </TouchableOpacity>
      </View>
      {(searchSuggestions.length > 0 || loadingSuggestions) && !searching && (
        <View style={styles.suggestionsList}>
          {loadingSuggestions && <Text style={styles.loadingSuggestionsText}>Pesquisando localidades...</Text>}
          {searchSuggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.label}
              style={styles.suggestionItem}
              onPress={() => handleSearchLocation(suggestion.label, suggestion)}
            >
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionText}>{suggestion.label}</Text>
                <Text style={styles.suggestionDetail}>{suggestion.detail}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {searchSuggestions.some((suggestion) => suggestion.type === 'remote') && (
            <Text style={styles.attributionText}>Resultados de OpenStreetMap</Text>
          )}
        </View>
      )}
      {searchMessage ? <Text style={styles.searchMessage}>{searchMessage}</Text> : null}

      {selectedItem && (
        <View style={styles.infoCard}>
          <TouchableOpacity style={styles.infoClose} onPress={() => setSelectedItem(null)}>
            <Text style={styles.infoCloseText}>X</Text>
          </TouchableOpacity>
          <Text style={styles.infoTitle} numberOfLines={1}>{selectedItem.title || 'Pet'}</Text>
          <Text style={[styles.infoStatus, { color: selectedItem.status === 'found' ? '#16A34A' : '#F97316' }]}>
            {selectedItem.status === 'found' ? 'Animal encontrado' : 'Animal perdido'}
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
          <MaterialIcons name="my-location" size={24} color="#4F46E5" />
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
          <Text style={styles.emptyText}>Os pets aparecerão aqui quando um ponto for escolhido no cadastro.</Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#4F46E5" />
          <Text style={styles.loadingText}>Carregando localizações...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E5E7EB' },
  map: { flex: 1 },
  searchBar: {
    position: 'absolute',
    top: 68,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: { flex: 1, minHeight: 42, paddingHorizontal: 10, color: '#111827', fontSize: 14 },
  searchButton: { minHeight: 42, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { color: '#FFFFFF', fontWeight: '700' },
  suggestionsList: { position: 'absolute', top: 120, left: 22, right: 22, zIndex: 11, borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 8, elevation: 4, overflow: 'hidden' },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionContent: { gap: 2 },
  suggestionText: { color: '#111827', fontSize: 14, fontWeight: '600' },
  suggestionDetail: { color: '#6B7280', fontSize: 11 },
  loadingSuggestionsText: { padding: 12, color: '#6B7280', fontSize: 13 },
  attributionText: { paddingHorizontal: 14, paddingVertical: 8, color: '#9CA3AF', fontSize: 10 },
  searchMessage: { position: 'absolute', top: 120, left: 22, right: 22, zIndex: 11, padding: 9, borderRadius: 8, backgroundColor: '#FFFFFF', color: '#B45309', fontSize: 12 },
  centerLocationButton: { position: 'absolute', right: 16, bottom: 108, width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  centerLocationButtonRaised: { bottom: 190 },
  permissionState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F9FAFB' },
  permissionTitle: { color: '#111827', fontSize: 18, fontWeight: '700', marginTop: 14 },
  permissionText: { color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  locationNotice: { position: 'absolute', left: 16, right: 16, bottom: 22, padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  locationNoticeText: { color: '#374151', lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', marginTop: 8 },
  retryText: { color: '#4F46E5', fontWeight: '700' },
  marker: {
    width: 52,
    height: 52,
    borderRadius: 28,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  markerImageFrame: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    resizeMode: 'cover',
  },
  markerFallback: { fontSize: 25 },
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
  detailsButton: { marginTop: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#4F46E5', alignItems: 'center' },
  detailsButtonText: { color: '#FFFFFF', fontWeight: '700' },
  callout: { width: 190, padding: 4 },
  calloutTitle: { color: '#111827', fontWeight: '700', fontSize: 15 },
  calloutStatus: { color: '#4F46E5', marginTop: 3 },
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

export default MapScreen;
