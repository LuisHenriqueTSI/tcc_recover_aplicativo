

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Keyboard, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getMessages, sendMessage, markMessagesAsRead, uploadMessagePhoto } from '../services/messages';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import Button from '../components/Button';

import { useRoute } from '@react-navigation/native';

const ChatScreen = (props) => {
  const route = useRoute();
  const conversation = route.params?.conversation;
  const highlightMessageId = route.params?.highlightMessageId;
  console.log('[ChatScreen] MONTADO', Date.now(), conversation, 'highlight:', highlightMessageId);
  const { user } = useAuth();
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

  // Carrega mensagens apenas no início (primeiro render)
  // Carregamento inicial e canal real-time só uma vez por conversa
  const loadedRef = useRef(false);
  useEffect(() => {
    let isMounted = true;
    console.log('[ChatScreen] useEffect carregamento inicial', {userId: user?.id, otherId, itemId, loaded: loadedRef.current, time: Date.now()});
    if (!user?.id || !otherId || loadedRef.current) return;
    loadedRef.current = true;
    const fetchInitialMessages = async () => {
      setLoading(true);
      setError('');
      try {
        console.log('[ChatScreen] fetchInitialMessages INICIO', Date.now());
        const msgs = await getMessages(user.id, otherId);
        if (isMounted) setMessages(msgs);
        await markMessagesAsRead(user.id, otherId);
        console.log('[ChatScreen] fetchInitialMessages FIM', Date.now());
      } catch (err) {
        if (isMounted) setError(err.message || 'Erro ao carregar mensagens');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInitialMessages();
    return () => { isMounted = false; };
    // eslint-disable-next-line
  }, [user?.id, otherId, itemId]);


  // Real-time subscription: nunca ativa loading
  useEffect(() => {
    let channel;
    if (user?.id && otherId && !channel) {
      channel = supabase.channel('chat-messages-' + user.id + '-' + otherId)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `item_id=eq.${itemId}`,
          },
          (payload) => {
            const msg = payload.new;
            if (
              (msg.sender_id === user.id && msg.receiver_id === otherId) ||
              (msg.sender_id === otherId && msg.receiver_id === user.id)
            ) {
              setMessages((prev) => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
              });
              if (msg.receiver_id === user.id) markMessagesAsRead(user.id, otherId);
            }
          }
        )
        .subscribe();
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line
  }, [user?.id, otherId, itemId]);


  const handleSend = async () => {
    if (!input.trim() && !selectedPhoto) return;
    setSending(true);
    let photoUrl = null;
    try {
      if (selectedPhoto) {
        photoUrl = await uploadMessagePhoto(Date.now(), selectedPhoto.uri);
      }
      const sentMsg = await sendMessage({
        sender_id: user.id,
        receiver_id: otherId,
        item_id: itemId,
        content: input,
        photo_url: photoUrl,
      });
      setInput('');
      setSelectedPhoto(null);
      setPhotoPreview(null);
      // Adiciona mensagem localmente para resposta instantânea
      if (sentMsg && sentMsg.id) {
        setMessages((prev) => {
          if (prev.some(m => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
        });
      }
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
    const isHighlighted = highlightMessageId && item.id === highlightMessageId;
    return (
      <View style={[styles.messageRow, isMine ? styles.myMessage : styles.otherMessage]}>
        <Card style={[styles.messageCard, isHighlighted && { backgroundColor: '#FFF9C4', borderWidth: 1, borderColor: '#FACC15' }] }>
          {item.photo_url && (
            <Image source={{ uri: item.photo_url }} style={styles.messageImage} resizeMode="cover" />
          )}
          {item.content ? <Text style={styles.messageText}>{item.content}</Text> : null}
          <Text style={styles.messageMeta}>{isMine ? 'Você' : conversation.otherName} • {new Date(item.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </Card>
      </View>
    );
  };



  // Não mostrar loading global. Apenas erro, se houver.
  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          extraData={messages}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 200 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
        />
        {photoPreview && (
          <View style={styles.previewRow}>
            <Image source={{ uri: photoPreview }} style={styles.previewImage} />
            <TouchableOpacity onPress={handleRemovePhoto} style={styles.removePhotoButton}>
              <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Remover</Text>
            </TouchableOpacity>
          </View>
        )}
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: '#fff' }}>
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
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB', marginBottom: 32 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, fontSize: 16, backgroundColor: '#F9FAFB', marginRight: 8 },
  sendButton: { paddingVertical: 10, paddingHorizontal: 16 },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
});

export default ChatScreen;
