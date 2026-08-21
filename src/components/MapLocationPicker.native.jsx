import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { states } from '../lib/br-locations';

const BRAZIL_REGION = {
  latitude: -14.235,
  longitude: -51.9253,
  latitudeDelta: 35,
  longitudeDelta: 35,
};

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

const MapLocationPicker = ({ visible, initialLocation, mode, onClose, onConfirm, onSelectLocation }) => {
  const [coordinate, setCoordinate] = useState(initialLocation || null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Campos de endereço editáveis
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [fullAddressText, setFullAddressText] = useState('');

  // Sincroniza o texto completo quando os campos individuais mudam
  const updateAddressFields = (newFields) => {
    const updated = {
      street: newFields.street !== undefined ? newFields.street : street,
      houseNumber: newFields.houseNumber !== undefined ? newFields.houseNumber : houseNumber,
      district: newFields.district !== undefined ? newFields.district : district,
      city: newFields.city !== undefined ? newFields.city : city,
      stateUf: newFields.stateUf !== undefined ? newFields.stateUf : stateUf,
      postalCode: newFields.postalCode !== undefined ? newFields.postalCode : postalCode,
    };

    if (newFields.street !== undefined) setStreet(newFields.street);
    if (newFields.houseNumber !== undefined) setHouseNumber(newFields.houseNumber);
    if (newFields.district !== undefined) setDistrict(newFields.district);
    if (newFields.city !== undefined) setCity(newFields.city);
    if (newFields.stateUf !== undefined) setStateUf(newFields.stateUf);
    if (newFields.postalCode !== undefined) setPostalCode(newFields.postalCode);

    const formatted = [
      updated.street,
      updated.houseNumber,
      updated.district,
      updated.city,
      updated.stateUf,
    ].filter(Boolean).join(', ');

    setFullAddressText(formatted);
  };

  const reverseGeocodeCoordinate = async (coord) => {
    if (!coord) return;
    setGeocoding(true);
    try {
      const addresses = await Location.reverseGeocodeAsync(coord);
      const addr = addresses?.[0];
      if (addr) {
        const rawRegion = String(addr.region || '').trim();
        const normRegion = normalizeRegionName(rawRegion);
        const resolvedUf = states.includes(rawRegion.toUpperCase())
          ? rawRegion.toUpperCase()
          : (normalizedRegionToUf[normRegion] || rawRegion);

        const st = addr.street || addr.name || '';
        const num = (addr.name && /^\d+$/.test(String(addr.name)))
          ? addr.name
          : (addr.streetNumber || addr.houseNumber || '');
        const dist = addr.district || addr.subregion || '';
        const ct = addr.city || addr.subregion || '';
        const cep = addr.postalCode || '';

        setStreet(st);
        setHouseNumber(num);
        setDistrict(dist);
        setCity(ct);
        setStateUf(resolvedUf);
        setPostalCode(cep);

        const formatted = [st, num, dist, ct, resolvedUf].filter(Boolean).join(', ');
        setFullAddressText(formatted);
      }
    } catch (error) {
      console.warn('[MapLocationPicker] Não foi possível identificar o endereço reverso:', error.message);
    } finally {
      setGeocoding(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setCoordinate(initialLocation || null);

    if (initialLocation) {
      reverseGeocodeCoordinate(initialLocation);
      return;
    }

    const loadCurrentLocation = async () => {
      setLoadingLocation(true);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const result = await Location.getCurrentPositionAsync({});
          const currentCoord = { latitude: result.coords.latitude, longitude: result.coords.longitude };
          setCoordinate(currentCoord);
          reverseGeocodeCoordinate(currentCoord);
        }
      } catch (error) {
        console.warn('[MapLocationPicker] Não foi possível obter a localização atual:', error.message);
      } finally {
        setLoadingLocation(false);
      }
    };

    loadCurrentLocation();
  }, [visible, initialLocation]);

  const handleMapPress = (event) => {
    const newCoord = event.nativeEvent.coordinate;
    setCoordinate(newCoord);
    reverseGeocodeCoordinate(newCoord);
  };

  const handleConfirm = () => {
    if (!coordinate) return;

    const addressDetails = {
      street: street.trim(),
      number: houseNumber.trim(),
      district: district.trim(),
      city: city.trim(),
      state: stateUf.trim(),
      postalCode: postalCode.trim(),
      text: fullAddressText.trim() || [street, houseNumber, district, city, stateUf].filter(Boolean).join(', '),
    };

    const address = {
      street: street.trim(),
      name: houseNumber.trim() || street.trim(),
      houseNumber: houseNumber.trim(),
      district: district.trim(),
      city: city.trim(),
      region: stateUf.trim(),
      postalCode: postalCode.trim(),
    };

    const callback = onConfirm || onSelectLocation;
    if (callback) {
      callback({
        coordinate,
        address,
        addressDetails,
        addressText: addressDetails.text,
        city: city.trim(),
        state: stateUf.trim(),
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {mode === 'profile' ? 'Atualize sua localização' : 'Escolha no mapa'}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {mode === 'profile'
                ? 'Toque no mapa e ajuste o endereço abaixo.'
                : 'Toque no ponto no mapa e edite o endereço se necessário.'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>

        {/* Mapa */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={coordinate ? { ...coordinate, latitudeDelta: 0.03, longitudeDelta: 0.03 } : BRAZIL_REGION}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton
          >
            {coordinate && <Marker coordinate={coordinate} />}
          </MapView>

          {(loadingLocation || geocoding) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#2563EB" size="small" />
              <Text style={styles.loadingText}>
                {loadingLocation ? 'Obtendo sua localização...' : 'Identificando endereço...'}
              </Text>
            </View>
          )}
        </View>

        {/* Painel Inferior de Endereço Editável */}
        <View style={styles.bottomCard}>
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={{ paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.cardHeader}>
              <MaterialIcons name="edit-location-alt" size={20} color="#2563EB" />
              <Text style={styles.cardTitle}>Endereço selecionado (editável)</Text>
            </View>

            {coordinate ? (
              <>
                {/* Linha 1: Rua e Número */}
                <View style={styles.inputRow}>
                  <View style={{ flex: 2.2, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Rua / Logradouro</Text>
                    <TextInput
                      style={styles.inputField}
                      value={street}
                      onChangeText={(t) => updateAddressFields({ street: t })}
                      placeholder="Ex: Rua das Flores"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Nº da Casa</Text>
                    <TextInput
                      style={styles.inputField}
                      value={houseNumber}
                      onChangeText={(t) => updateAddressFields({ houseNumber: t })}
                      placeholder="Ex: 123"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                {/* Linha 2: Bairro */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bairro</Text>
                  <TextInput
                    style={styles.inputField}
                    value={district}
                    onChangeText={(t) => updateAddressFields({ district: t })}
                    placeholder="Ex: Centro"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Linha 3: Cidade e Estado */}
                <View style={styles.inputRow}>
                  <View style={{ flex: 2.2, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Cidade</Text>
                    <TextInput
                      style={styles.inputField}
                      value={city}
                      onChangeText={(t) => updateAddressFields({ city: t })}
                      placeholder="Ex: Pelotas"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Estado (UF)</Text>
                    <TextInput
                      style={styles.inputField}
                      value={stateUf}
                      onChangeText={(t) => updateAddressFields({ stateUf: t.toUpperCase() })}
                      placeholder="Ex: RS"
                      maxLength={2}
                      autoCapitalize="characters"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                {/* Endereço completo formatado */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Endereço Completo</Text>
                  <TextInput
                    style={[styles.inputField, styles.multilineInput]}
                    value={fullAddressText}
                    onChangeText={setFullAddressText}
                    placeholder="Edite o endereço completo formatado"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </>
            ) : (
              <View style={styles.emptyPromptBox}>
                <MaterialIcons name="touch-app" size={24} color="#2563EB" />
                <Text style={styles.emptyPromptText}>
                  Toque em qualquer ponto do mapa acima para selecionar e preencher o endereço automaticamente.
                </Text>
              </View>
            )}

            {/* Botão de Confirmação */}
            <TouchableOpacity
              style={[styles.confirmButton, !coordinate && styles.disabledButton]}
              onPress={handleConfirm}
              disabled={!coordinate}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>Usar esta localização</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 10,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 2, color: '#6B7280', fontSize: 13 },
  closeButton: { padding: 8, paddingHorizontal: 12 },
  closeText: { color: '#2563EB', fontWeight: '700', fontSize: 15 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%' },
  loadingOverlay: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  loadingText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  bottomCard: {
    maxHeight: '48%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  formScroll: { paddingHorizontal: 16, paddingTop: 14 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  multilineInput: {
    minHeight: 48,
    maxHeight: 70,
  },
  emptyPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
  },
  emptyPromptText: {
    flex: 1,
    fontSize: 13,
    color: '#1D4ED8',
    lineHeight: 18,
  },
  confirmButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  disabledButton: { backgroundColor: '#93C5FD' },
  confirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default MapLocationPicker;
