import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Callout, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as itemsService from '../services/items';

const BRAZIL_REGION = {
  latitude: -14.235,
  longitude: -51.9253,
  latitudeDelta: 35,
  longitudeDelta: 35,
};

const hasCoordinates = (item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));

const MapScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState('checking');
  const locationStatusRef = useRef('checking');
  const [region, setRegion] = useState(BRAZIL_REGION);
  const [selectedItem, setSelectedItem] = useState(null);

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
        showsMyLocationButton={locationStatus === 'granted'}
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
                    <Image source={{ uri: photoUrl }} style={styles.markerImage} />
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

      <View style={styles.header} pointerEvents="none">
        <Text style={styles.title}>Pets no mapa</Text>
        <Text style={styles.subtitle}>{items.length} {items.length === 1 ? 'localização marcada' : 'localizações marcadas'}</Text>
      </View>

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
  permissionState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F9FAFB' },
  permissionTitle: { color: '#111827', fontSize: 18, fontWeight: '700', marginTop: 14 },
  permissionText: { color: '#6B7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  header: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { color: '#111827', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#6B7280', marginTop: 3 },
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
