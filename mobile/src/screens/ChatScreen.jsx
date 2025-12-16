

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getMessages, sendMessage, markMessagesAsRead, uploadMessagePhoto } from '../services/messages';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';

const ChatScreen = ({ route }) => {
  const { user } = useAuth();
  const { conversation } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');

  const [sending, setSending] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const flatListRef = useRef(null);

  const otherId = conversation?.otherId;
  const itemId = conversation?.itemId;

  const loadMessages = async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    if (!isPolling) setError('');
    try {
      if (!user?.id || !otherId) throw new Error('Usuário inválido');
      const msgs = await getMessages(user.id, otherId);
      // Só atualiza se mudou
      if (messages.length !== msgs.length || (msgs.length && messages.length && messages[messages.length-1]?.id !== msgs[msgs.length-1]?.id)) {
        setMessages(msgs);
      }
      // Marcar como lidas
      await markMessagesAsRead(user.id, otherId);
    } catch (err) {
      if (!isPolling) setError(err.message || 'Erro ao carregar mensagens');
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => loadMessages(true), 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [otherId, messages]);


  const handleSend = async () => {
    if (!input.trim() && !selectedPhoto) return;
    setSending(true);
    let photoUrl = null;
    try {
      if (selectedPhoto) {
        photoUrl = await uploadMessagePhoto(Date.now(), selectedPhoto.uri);
      }
      await sendMessage({
        sender_id: user.id,
        receiver_id: otherId,
        item_id: itemId,
        content: input,
        photo_url: photoUrl,
      });
      setInput('');
      setSelectedPhoto(null);
      setPhotoPreview(null);
      await loadMessages();
    } catch (err) {
      setError(err.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permissão para acessar fotos foi negada.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0]);
        setPhotoPreview(result.assets[0].uri);
      }
    } catch (err) {
      alert('Erro ao abrir galeria: ' + (err.message || err));
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };


  const renderItem = ({ item }) => {
    const isMine = item.sender_id === user.id;
    return (
      <View style={[styles.messageRow, isMine ? styles.myMessage : styles.otherMessage]}>
        <Card style={styles.messageCard}>
          {item.photo_url && (
            <Image source={{ uri: item.photo_url }} style={styles.messageImage} resizeMode="cover" />
          )}
          {item.content ? <Text style={styles.messageText}>{item.content}</Text> : null}
          <Text style={styles.messageMeta}>{isMine ? 'Você' : conversation.otherName} • {new Date(item.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </Card>
      </View>
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007AFF" />;
  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 12 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
      />
      {photoPreview && (
        <View style={styles.previewRow}>
          <Image source={{ uri: photoPreview }} style={styles.previewImage} />
          <TouchableOpacity onPress={handleRemovePhoto} style={styles.removePhotoButton}>
            <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Remover</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputRow}>
        <TouchableOpacity onPress={handlePickPhoto} style={styles.photoButton}>
          <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>Foto</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Digite sua mensagem..."
          editable={!sending}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          returnKeyType="send"
        />
        <Button title="Enviar" onPress={handleSend} loading={sending} style={styles.sendButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', paddingBottom: 48 },
  messageRow: { flexDirection: 'row', marginVertical: 2 },
  myMessage: { justifyContent: 'flex-end' },
  otherMessage: { justifyContent: 'flex-start' },
  messageCard: { maxWidth: '80%', padding: 10 },
  messageText: { fontSize: 15, color: '#1F2937', marginBottom: 2 },
  messageImage: { width: 180, height: 180, borderRadius: 8, marginBottom: 6, backgroundColor: '#E5E7EB' },
    photoButton: { marginRight: 6, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#E5E7EB', borderRadius: 8 },
    previewRow: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB' },
    previewImage: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
    removePhotoButton: { padding: 8 },
  messageMeta: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, fontSize: 16, backgroundColor: '#F9FAFB', marginRight: 8 },
  sendButton: { paddingVertical: 10, paddingHorizontal: 16 },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
});

export default ChatScreen;
