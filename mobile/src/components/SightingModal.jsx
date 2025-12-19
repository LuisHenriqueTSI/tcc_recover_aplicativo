import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Button from './Button';

const SightingModal = ({ visible, onClose, onSubmit, loading }) => {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [cellphone, setCellphone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSend = () => {
    if (!description.trim()) return;
    onSubmit({
      description,
      location,
      contact_info: {
        cellphone,
        instagram,
        whatsapp,
      },
      photo_url: photoUrl,
    });
    setDescription('');
    setLocation('');
    setCellphone('');
    setInstagram('');
    setWhatsapp('');
    setPhotoUrl('');
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permissão para acessar fotos é necessária!');
      return;
    }
    setUploading(true);
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    setUploading(false);
    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      setPhotoUrl(pickerResult.assets[0].uri);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Novo Avistamento/Comentário</Text>
          <TextInput
            style={styles.input}
            placeholder="Comentário ou descrição"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Local (opcional)"
            value={location}
            onChangeText={setLocation}
          />
          <TextInput
            style={styles.input}
            placeholder="Celular (apenas números)"
            value={cellphone}
            onChangeText={text => setCellphone(text.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            maxLength={15}
          />
          <TextInput
            style={styles.input}
            placeholder="Instagram (opcional)"
            value={instagram}
            onChangeText={setInstagram}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="WhatsApp (opcional)"
            value={whatsapp}
            onChangeText={setWhatsapp}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={handlePickImage} style={{ marginBottom: 10, backgroundColor: '#E5E7EB', borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>{uploading ? 'Abrindo galeria...' : (photoUrl ? 'Trocar foto' : 'Adicionar foto')}</Text>
          </TouchableOpacity>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
          ) : null}
          <View style={styles.actions}>
            <Button title="Cancelar" onPress={onClose} variant="secondary" style={styles.button} />
            <Button
              title={loading ? 'Enviando...' : 'Enviar'}
              onPress={handleSend}
              disabled={loading || !description.trim()}
              style={styles.button}
            />
          </View>
          {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1F2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 14,
    color: '#374151',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  button: {
    flex: 1,
  },
  photoPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
});

export default SightingModal;
