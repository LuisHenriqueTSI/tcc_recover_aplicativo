

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Keyboard, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getMessages, sendMessage, markMessagesAsRead, uploadMessagePhoto } from '../services/messages';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';
import Button from '../components/Button';
import { Feather } from '@expo/vector-icons';

import { useRoute } from '@react-navigation/native';

const ChatScreen = (props) => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const conversation = route.params?.conversation;
  const highlightMessageId = route.params?.highlightMessageId;
  const draftMessage = route.params?.draftMessage;
  const initialMessage = conversation?.initialMessage || '';
  console.log('[ChatScreen] MONTADO', Date.now(), conversation, 'highlight:', highlightMessageId);
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState(draftMessage || initialMessage || '');

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
  const chatChannelRef = useRef(null);
  useEffect(() => {
    if (!user?.id || !otherId || !itemId) return;

    const cleanupChannel = () => {
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
      }
    };

    cleanupChannel();

    const channel = supabase.channel(`chat-messages-${user.id}-${otherId}-${itemId}`);
    chatChannelRef.current = channel;

    channel
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

    return () => {
      cleanupChannel();
    };
    // eslint-disable-next-line
  }, [user?.id, otherId, itemId]);


  const handleSend = async () => {
    if ((!input.trim() && !selectedPhoto) || sending) return;
    setSending(true);
    setError('');
    try {
      let photoUrl = null;
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
        <View style={[
          styles.messageCard,
          isMine
            ? { backgroundColor: colors.primary, borderColor: colors.primaryDark }
            : { backgroundColor: colors.card, borderColor: colors.cardBorder },
          isHighlighted && { backgroundColor: isDark ? '#854D0E' : '#FFF9C4', borderWidth: 1, borderColor: '#FACC15' }
        ]}>
          {item.photo_url && (
            <Image source={{ uri: item.photo_url }} style={styles.messageImage} resizeMode="cover" />
          )}
          {item.content ? (
            <Text style={[styles.messageText, { color: isMine ? '#FFFFFF' : colors.text }]}>
              {item.content}
            </Text>
          ) : null}
          <Text style={[styles.messageMeta, { color: isMine ? 'rgba(255, 255, 255, 0.75)' : colors.textMuted }]}>
            {isMine ? 'Você' : conversation.otherName} • {new Date(item.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };



  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Não mostrar loading global. Apenas erro, se houver.
  if (error) return <Text style={[styles.error, { backgroundColor: colors.background }]}>{error}</Text>;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.chatHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <View style={styles.chatAvatar}>
            <Image
              source={conversation?.avatarUrl ? { uri: conversation.avatarUrl } : require('../assets/logo_wefind.png')}
              style={styles.chatAvatarImage}
            />
          </View>
          <View style={styles.chatHeaderContent}>
            <Text style={[styles.chatHeaderName, { color: colors.headerText }]} numberOfLines={1}>{conversation?.otherName || 'Usuário'}</Text>
            {conversation?.itemTitle ? <Text style={[styles.chatHeaderPet, { color: colors.headerSubText }]} numberOfLines={1}>{conversation.itemTitle}</Text> : null}
          </View>
          <Feather name="message-circle" size={20} color={isDark ? colors.primary : '#BFDBFE'} />
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          extraData={messages}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
        />
        {photoPreview && (
          <View style={[styles.previewRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Image source={{ uri: photoPreview }} style={styles.previewImage} />
            <TouchableOpacity onPress={handleRemovePhoto} style={styles.removePhotoButton}>
              <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Remover</Text>
            </TouchableOpacity>
          </View>
        )}
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: keyboardVisible ? 8 : Math.max(8, insets.bottom),
            },
          ]}
        >
          <TouchableOpacity onPress={handlePickPhoto} style={[styles.photoButton, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Foto</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={colors.textMuted}
            editable={!sending}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <Button title="Enviar" onPress={handleSend} loading={sending} style={styles.sendButton} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1E3A8A', borderBottomWidth: 1, borderBottomColor: '#1D4ED8' },
  chatAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EFF6FF', overflow: 'hidden', marginRight: 10 },
  chatAvatarImage: { width: 42, height: 42, borderRadius: 21, resizeMode: 'cover' },
  chatHeaderContent: { flex: 1, minWidth: 0 },
  chatHeaderName: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  chatHeaderPet: { color: '#BFDBFE', fontSize: 12, marginTop: 3 },
  messageRow: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 4 },
  myMessage: { justifyContent: 'flex-end' },
  otherMessage: { justifyContent: 'flex-start' },
  messageCard: { maxWidth: '80%', padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  messageText: { fontSize: 15, color: '#1F2937', marginBottom: 2 },
  messageImage: { width: 180, height: 180, borderRadius: 8, marginBottom: 6, backgroundColor: '#E5E7EB' },
  photoButton: { marginRight: 6, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#E5E7EB', borderRadius: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB' },
  previewImage: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  removePhotoButton: { padding: 8 },
  messageMeta: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, fontSize: 16, backgroundColor: '#F9FAFB', marginRight: 8 },
  sendButton: { paddingVertical: 10, paddingHorizontal: 16 },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
});

export default ChatScreen;
