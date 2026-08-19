import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const BRAZIL_REGION = {
  latitude: -14.235,
  longitude: -51.9253,
  latitudeDelta: 35,
  longitudeDelta: 35,
};

const MapLocationPicker = ({ visible, initialLocation, mode, onClose, onConfirm }) => {
  const [coordinate, setCoordinate] = useState(initialLocation || null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCoordinate(initialLocation || null);
    if (initialLocation) return;

    const loadCurrentLocation = async () => {
      setLoadingLocation(true);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const result = await Location.getCurrentPositionAsync({});
          setCoordinate({ latitude: result.coords.latitude, longitude: result.coords.longitude });
        }
      } catch (error) {
        console.warn('[MapLocationPicker] Não foi possível obter a localização atual:', error.message);
      } finally {
        setLoadingLocation(false);
      }
    };

    loadCurrentLocation();
  }, [visible, initialLocation]);

  const handleConfirm = async () => {
    if (!coordinate) return;
    let address = null;
    try {
      const addresses = await Location.reverseGeocodeAsync(coordinate);
      address = addresses[0] || null;
    } catch (error) {
      console.warn('[MapLocationPicker] Não foi possível identificar o endereço:', error.message);
    }
    onConfirm({ coordinate, address });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{mode === 'profile' ? 'Atualize sua localização' : 'Escolha no mapa'}</Text>
            <Text style={styles.subtitle}>{mode === 'profile' ? 'Toque no mapa onde você está.' : 'Toque no ponto onde o animal foi perdido ou encontrado.'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>
        <MapView
          style={styles.map}
          initialRegion={coordinate ? { ...coordinate, latitudeDelta: 0.04, longitudeDelta: 0.04 } : BRAZIL_REGION}
          onPress={(event) => setCoordinate(event.nativeEvent.coordinate)}
          showsUserLocation
          showsMyLocationButton
        >
          {coordinate && <Marker coordinate={coordinate} />}
        </MapView>
        {loadingLocation && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#4F46E5" />
            <Text style={styles.loadingText}>Obtendo sua localização...</Text>
          </View>
        )}
        <View style={styles.footer}>
          <Text style={styles.hint}>{coordinate ? 'Ponto selecionado' : 'Toque no mapa para selecionar um ponto'}</Text>
          <TouchableOpacity
            style={[styles.confirmButton, !coordinate && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={!coordinate}
          >
            <Text style={styles.confirmText}>Usar esta localização</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 16, paddingTop: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6B7280', maxWidth: 250 },
  closeButton: { padding: 8 },
  closeText: { color: '#4F46E5', fontWeight: '700' },
  map: { flex: 1 },
  loadingOverlay: { position: 'absolute', top: 120, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: '#FFFFFF' },
  loadingText: { color: '#374151' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  hint: { color: '#6B7280', marginBottom: 10, textAlign: 'center' },
  confirmButton: { backgroundColor: '#4F46E5', padding: 14, borderRadius: 8, alignItems: 'center' },
  disabledButton: { backgroundColor: '#A5B4FC' },
  confirmText: { color: '#FFFFFF', fontWeight: '700' },
});

export default MapLocationPicker;
