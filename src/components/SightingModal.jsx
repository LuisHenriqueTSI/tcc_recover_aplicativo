import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons, Feather, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Button from './Button';
import MapLocationPicker from './MapLocationPicker';

const SightingModal = ({ visible, onClose, onSubmit, loading }) => {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coordinate, setCoordinate] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [facebook, setFacebook] = useState('');
  const [showContacts, setShowContacts] = useState(false);

  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // Força o retorno do modal à posição centralizada quando o teclado fecha
  useEffect(() => {
    const subscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Keyboard.dismiss();
      }
    );
    return () => subscription.remove();
  }, []);

  const handleSend = () => {
    if (!description.trim()) return;
    onSubmit({
      description: description.trim(),
      location: location.trim(),
      coordinate,
      location_details: locationDetails,
      contact_info: {
        instagram: instagram.trim(),
        whatsapp: whatsapp.trim(),
        facebook: facebook.trim(),
        coordinate,
        location_details: locationDetails,
      },
      photo_url: photoUrl,
    });
    handleReset();
  };

  const handleReset = () => {
    setDescription('');
    setLocation('');
    setCoordinate(null);
    setLocationDetails(null);
    setInstagram('');
    setWhatsapp('');
    setFacebook('');
    setShowContacts(false);
    setPhotoUrl('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permissão para acessar fotos é necessária!');
      return;
    }
    setUploading(true);
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    setUploading(false);
    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      setPhotoUrl(pickerResult.assets[0].uri);
    }
  };

  const handleConfirmLocation = (data) => {
    setMapPickerVisible(false);
    if (data?.coordinate) {
      setCoordinate(data.coordinate);
    }
    if (data?.addressDetails) {
      setLocationDetails(data.addressDetails);
    }
    const formatted = data?.fullAddressText || data?.addressDetails?.text || '';
    if (formatted) {
      setLocation(formatted);
    }
  };

  return (
    <>
      <Modal visible={visible && !mapPickerVisible} animationType="slide" transparent statusBarTranslucent onRequestClose={handleClose}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.overlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%', maxWidth: 440, alignItems: 'center' }}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modal}>
                  {/* Header */}
                  <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                      <View style={styles.iconCircle}>
                        <MaterialIcons name="visibility" size={20} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Compartilhar Informação</Text>
                        <Text style={styles.subtitle}>Ajude o tutor com detalhes ou pistas sobre o pet</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                      <MaterialIcons name="close" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Campo de Descrição */}
              <Text style={styles.inputLabel}>Detalhes e Informações *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Vi o pet correndo na calçada em direção ao parque..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              {/* Seção de Localização com Mapa */}
              <Text style={styles.inputLabel}>Onde foi visto?</Text>
              <View style={styles.locationCard}>
                <View style={styles.locationCardHeader}>
                  <MaterialIcons name="location-on" size={20} color="#2563EB" />
                  <Text style={styles.locationCardTitle}>
                    {location ? 'Localização Selecionada' : 'Marcar no mapa'}
                  </Text>
                </View>

                {location ? (
                  <View style={styles.locationPreview}>
                    <Text style={styles.locationText}>{location}</Text>
                    {coordinate && (
                      <Text style={styles.coordsText}>
                        Lat: {coordinate.latitude?.toFixed(4)}, Lng: {coordinate.longitude?.toFixed(4)}
                      </Text>
                    )}
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => setMapPickerVisible(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="map-pin" size={16} color="#FFFFFF" />
                  <Text style={styles.mapButtonText}>
                    {location ? 'Alterar no mapa interativo' : 'Abrir mapa interativo'}
                  </Text>
                </TouchableOpacity>

                {/* Input manual opcional de complemento */}
                <TextInput
                  style={[styles.input, { marginTop: 8, marginBottom: 0 }]}
                  placeholder="Ou digite o local manualmente (ex: Perto da Padaria Central)"
                  placeholderTextColor="#9CA3AF"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              {/* Foto da Informação */}
              <Text style={styles.inputLabel}>Foto do pet no local (opcional)</Text>
              {photoUrl ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setPhotoUrl('')}
                  >
                    <MaterialIcons name="delete" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={handlePickImage} style={styles.uploadBox} activeOpacity={0.7}>
                  <Feather name="camera" size={22} color="#2563EB" />
                  <Text style={styles.uploadText}>
                    {uploading ? 'Carregando foto...' : 'Adicionar foto da informação'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Seção de Contatos Opcionais */}
              <TouchableOpacity
                onPress={() => setShowContacts(!showContacts)}
                style={styles.toggleContactsRow}
                activeOpacity={0.7}
              >
                <Feather name={showContacts ? 'chevron-up' : 'chevron-down'} size={18} color="#4B5563" />
                <Text style={styles.toggleContactsText}>
                  {showContacts ? 'Ocultar contatos para retorno' : 'Deixar contatos para o tutor falar comigo'}
                </Text>
              </TouchableOpacity>

              {showContacts && (
                <View style={styles.contactsBox}>
                  <View style={styles.contactField}>
                    <FontAwesome name="whatsapp" size={16} color="#25D366" style={{ width: 22 }} />
                    <TextInput
                      style={styles.contactInput}
                      placeholder="WhatsApp (apenas números com DDD)"
                      placeholderTextColor="#9CA3AF"
                      value={whatsapp}
                      onChangeText={text => setWhatsapp(text.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      maxLength={15}
                    />
                  </View>

                  <View style={styles.contactField}>
                    <FontAwesome name="instagram" size={16} color="#C13584" style={{ width: 22 }} />
                    <TextInput
                      style={styles.contactInput}
                      placeholder="Instagram (ex: @seunome)"
                      placeholderTextColor="#9CA3AF"
                      value={instagram}
                      onChangeText={setInstagram}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.contactField}>
                    <FontAwesome name="facebook-square" size={16} color="#1877F3" style={{ width: 22 }} />
                    <TextInput
                      style={styles.contactInput}
                      placeholder="Facebook (opcional)"
                      placeholderTextColor="#9CA3AF"
                      value={facebook}
                      onChangeText={setFacebook}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Ações */}
            <View style={styles.actions}>
              <Button title="Cancelar" onPress={handleClose} variant="secondary" style={styles.button} />
              <Button
                title={loading ? 'Enviando...' : 'Enviar Informação'}
                onPress={handleSend}
                disabled={loading || !description.trim()}
                style={styles.button}
              />
            </View>
            {loading && <ActivityIndicator style={{ marginTop: 8 }} color="#2563EB" />}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  </TouchableWithoutFeedback>
</Modal>

      {/* Seletor de Mapa Interativo Integrado */}
      <MapLocationPicker
        visible={mapPickerVisible}
        initialLocation={coordinate}
        mode="pin"
        showRadius={false}
        onClose={() => setMapPickerVisible(false)}
        onConfirm={handleConfirmLocation}
        onSelectLocation={handleConfirmLocation}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  locationCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  locationCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  locationPreview: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    lineHeight: 18,
  },
  coordsText: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 8,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
  },
  uploadText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    padding: 4,
  },
  toggleContactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 4,
    paddingVertical: 4,
  },
  toggleContactsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  contactsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginTop: 4,
  },
  contactField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  contactInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 13,
    color: '#0F172A',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  button: {
    flex: 1,
  },
});

export default SightingModal;
