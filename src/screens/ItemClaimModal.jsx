import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as claimsService from '../services/itemClaims';
import COLORS from '../constants/theme';

const ItemClaimModal = ({ visible, onClose, item, userId, onSuccess }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!item?.id || !userId) {
      Alert.alert('Erro', 'Não foi possível concluir a reivindicação.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Erro', 'Escreva uma mensagem para reivindicar o item.');
      return;
    }

    setLoading(true);
    try {
      await claimsService.createItemClaim({
        itemId: item.id,
        claimantId: userId,
        message: message.trim(),
      });
      setMessage('');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível enviar a reivindicação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Reivindicar item</Text>
          <Text style={styles.subtitle}>Conte por que este item é seu.</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Descreva sua situação..."
            style={styles.input}
            editable={!loading}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.submitText}>{loading ? 'Enviando...' : 'Enviar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ItemClaimModal;
