import React from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MapLocationPicker = ({ visible, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.title}>Mapa disponível no aplicativo mobile</Text>
        <Text style={styles.description}>
          A seleção pelo mapa funciona no Android e no iPhone. No navegador, use os seletores de estado, cidade e bairro.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            Alert.alert('Mapa mobile', 'Abra o aplicativo no Android ou iPhone para escolher a localização no mapa.');
            onClose();
          }}
        >
          <Text style={styles.buttonText}>Entendi</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', padding: 20 },
  container: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20 },
  title: { color: '#111827', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  description: { color: '#4B5563', lineHeight: 20, marginBottom: 18 },
  button: { backgroundColor: '#4F46E5', borderRadius: 8, padding: 13, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});

export default MapLocationPicker;
