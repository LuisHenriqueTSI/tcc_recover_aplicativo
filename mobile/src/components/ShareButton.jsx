import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Share, Platform, Modal, Text, Pressable } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';

const ShareButton = ({ item, imageUrl }) => {
  const [modalVisible, setModalVisible] = useState(false);
  if (!item) return null;

  const getShareMessage = () => {
    const status = item.status === 'found' ? '✅ ENCONTRADO' : '🔍 PERDIDO';
    return `${status}: ${item.title}\n\n${item.description || 'Sem descrição'}\n\n📍 Local: ${item.location || 'Não especificado'}\n📅 Data: ${item.date ? new Date(item.date).toLocaleDateString('pt-BR') : 'Não informada'}`;
  };

  const handleShare = async (platform) => {
    const message = getShareMessage();
    const url = imageUrl || undefined;
    let shareOptions = { message };
    if (url) shareOptions.url = url;

    // WhatsApp, Facebook, Telegram: usar link customizado
    let shareUrl = '';
    const encodedMsg = encodeURIComponent(message);
    if (platform === 'whatsapp') {
      shareUrl = `https://wa.me/?text=${encodedMsg}`;
    } else if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url || '')}&quote=${encodedMsg}`;
    } else if (platform === 'telegram') {
      shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url || '')}&text=${encodedMsg}`;
    } else if (platform === 'instagram') {
      // Instagram não permite compartilhamento direto de texto/imagem via web, abrir app
      if (Platform.OS === 'ios') {
        shareUrl = 'instagram://app';
      } else {
        shareUrl = 'https://www.instagram.com/';
      }
    }

    setModalVisible(false);
    if (shareUrl) {
      try {
        await Share.share({ message: message + '\n' + (url || ''), url: url });
      } catch (e) {
        // fallback: abrir link
        if (shareUrl) {
          Linking.openURL(shareUrl);
        }
      }
    } else {
      try {
        await Share.share(shareOptions);
      } catch (e) {
        // erro
      }
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.shareMainBtn}>
        <MaterialIcons name="share" size={24} color="#fff" style={{ textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }} />
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Compartilhar em:</Text>
            <View style={styles.row}>
              <TouchableOpacity onPress={() => handleShare('whatsapp')} style={styles.iconBtn}>
                <FontAwesome name="whatsapp" size={22} color="#25D366" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleShare('facebook')} style={styles.iconBtn}>
                <FontAwesome name="facebook" size={22} color="#1877F3" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleShare('telegram')} style={styles.iconBtn}>
                <FontAwesome name="telegram" size={22} color="#229ED9" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleShare('instagram')} style={styles.iconBtn}>
                <FontAwesome name="instagram" size={22} color="#C13584" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  iconBtn: {
    marginHorizontal: 4,
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 260,
    elevation: 8,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#4F46E5',
    marginBottom: 12,
  },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
});

export default ShareButton;
