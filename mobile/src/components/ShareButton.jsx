import React from 'react';
import { TouchableOpacity, StyleSheet, Share } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ShareButton = ({ item, imageUrl }) => {
  if (!item) return null;

  const getShareMessage = () => {
    const status = item.status === 'found' ? '✅ ENCONTRADO' : '🔍 PERDIDO';
    return `${status}: ${item.title}\n\n${item.description || 'Sem descrição'}\n\n📍 Local: ${item.location || 'Não especificado'}\n📅 Data: ${item.date ? new Date(item.date).toLocaleDateString('pt-BR') : 'Não informada'}`;
  };

  const handleShare = async () => {
    const message = getShareMessage();
    const url = imageUrl || undefined;
    let shareOptions = { message };
    if (url) shareOptions.url = url;
    try {
      await Share.share(shareOptions);
    } catch (e) {
      // erro
    }
  };

  return (
    <TouchableOpacity onPress={handleShare} style={styles.shareMainBtn}>
      <MaterialIcons name="share" size={24} color="#fff" style={{ textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shareMainBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(30,30,30,0.75)',
    borderRadius: 20,
    padding: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});

export default ShareButton;
