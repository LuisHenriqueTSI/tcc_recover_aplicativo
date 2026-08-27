import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { getMessages, sendMessage, markMessagesAsRead, uploadMessagePhoto } from '../services/messages';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

const ChatScreen = (props) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const conversation = route.params?.conversation;
  const highlightMessageId = route.params?.highlightMessageId;
  const draftMessage = route.params?.draftMessage;
  const initialMessage = conversation?.initialMessage || '';

  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState(draftMessage || initialMessage || '');

  const [petTitle, setPetTitle] = useState(conversation?.itemTitle || '');
  const [otherName, setOtherName] = useState(conversation?.otherName || '');
  const [avatarUrl, setAvatarUrl] = useState(conversation?.avatarUrl || null);

  const [sending, setSending] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const flatListRef = useRef(null);

  const otherId = conversation?.otherId;
  const itemId = conversation?.itemId;

  // Controlador de elevação animada do teclado (100% imune a bugs de Edge-to-Edge / Android)
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const onKeyboardShow = (e) => {
      setIsKeyboardOpen(true);
      const rawHeight = e?.endCoordinates?.height || 0;
      // No Android com Edge-to-Edge ou barra de navegação de 3 botões, compensamos a barra inferior
      const extraOffset = Platform.OS === 'android' ? Math.max(insets.bottom, 32) : 0;
      const targetHeight = rawHeight + extraOffset;

      Animated.timing(keyboardHeightAnim, {
        toValue: targetHeight,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 100,
        useNativeDriver: false,
      }).start();

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    };

    const onKeyboardHide = (e) => {
      setIsKeyboardOpen(false);
      Animated.timing(keyboardHeightAnim, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e?.duration || 200) : 100,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onKeyboardShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onKeyboardHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  // Busca dados faltantes do pet ou do usuário (ex: quando aberto via notificação ou link)
  useEffect(() => {
    let isMounted = true;
    const fetchMissingDetails = async () => {
      if (!petTitle && itemId) {
        try {
          const { data: itemData } = await supabase
            .from('items')
            .select('id, title, species')
            .eq('id', itemId)
            .maybeSingle();
          if (itemData && isMounted) {
            setPetTitle(itemData.title || itemData.species || 'Animal');
          }
        } catch (e) {
          console.log('[ChatScreen] Erro ao buscar título do pet:', e.message);
        }
      }

      if ((!otherName || otherName === 'Usuário' || otherName === 'Tutor') && otherId) {
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', otherId)
            .maybeSingle();
          if (profileData && isMounted) {
            if (profileData.name) setOtherName(profileData.name);
            if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
          }
        } catch (e) {
          console.log('[ChatScreen] Erro ao buscar perfil do outro usuário:', e.message);
        }
      }
    };

    fetchMissingDetails();
    return () => { isMounted = false; };
  }, [itemId, otherId, petTitle, otherName]);

  // Carrega mensagens apenas no início (primeiro render)
  const loadedRef = useRef(false);
  useEffect(() => {
    let isMounted = true;
    if (!user?.id || !otherId || loadedRef.current) return;
    loadedRef.current = true;
    const fetchInitialMessages = async () => {
      setLoading(true);
      setError('');
      try {
        const msgs = await getMessages(user.id, otherId);
        if (isMounted) setMessages(msgs);
        await markMessagesAsRead(user.id, otherId);
      } catch (err) {
        if (isMounted) setError(err.message || 'Erro ao carregar mensagens');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInitialMessages();
    return () => { isMounted = false; };
  }, [user?.id, otherId, itemId]);

  // Real-time subscription
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

    return cleanupChannel;
  }, [user?.id, otherId, itemId]);

  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alert('Permissão necessária para acessar suas fotos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedPhoto(result.assets[0]);
        setPhotoPreview(result.assets[0].uri);
      }
    } catch (e) {
      console.error('[ChatScreen] Erro ao selecionar foto:', e);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedPhoto) || sending) return;
    setSending(true);
    try {
      let photoUrl = null;
      if (selectedPhoto) {
        photoUrl = await uploadMessagePhoto(Date.now(), selectedPhoto.uri);
      }
      const sentMsg = await sendMessage({
        sender_id: user.id,
        receiver_id: otherId,
        item_id: itemId,
        content: input.trim(),
        photo_url: photoUrl,
      });
      setMessages((prev) => {
        if (!sentMsg || !sentMsg.id) return prev;
        if (prev.some(m => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
      });
      setInput('');
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setError(err.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_id === user.id;
    const isHighlight = highlightMessageId && item.id === highlightMessageId;
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessage : styles.otherMessage]}>
        <View
          style={[
            styles.messageCard,
            isMe
              ? { backgroundColor: colors.primary, borderColor: colors.primary, borderBottomRightRadius: 4 }
              : { backgroundColor: colors.surface, borderColor: colors.border, borderBottomLeftRadius: 4 },
            isHighlight && { borderWidth: 2, borderColor: '#F59E0B' },
          ]}
        >
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={styles.messageImage} />
          ) : null}
          {item.content ? (
            <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : colors.text }]}>
              {item.content}
            </Text>
          ) : null}
          <Text
            style={[
              styles.messageMeta,
              { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textMuted, textAlign: isMe ? 'right' : 'left' },
            ]}
          >
            {item.sent_at
              ? new Date(item.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </Text>
        </View>
      </View>
    );
  };

  if (error) return <Text style={[styles.error, { backgroundColor: colors.background }]}>{error}</Text>;

  return (
    <Animated.View style={[styles.mainWrapper, { paddingBottom: keyboardHeightAnim, backgroundColor: colors.background }]}>
      {/* Header Personalizado: Voltar + Foto do Usuário + Nome */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.headerBg }}>
        <View style={[styles.chatHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainApp');
              }
            }}
            style={styles.headerBackBtn}
            accessibilityLabel="Voltar"
            activeOpacity={0.75}
          >
            <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.chatAvatar}>
            <Image
              source={avatarUrl ? { uri: avatarUrl } : require('../assets/logo_wefind.png')}
              style={styles.chatAvatarImage}
            />
          </View>

          <View style={styles.chatHeaderContent}>
            <Text style={[styles.chatHeaderName, { color: colors.headerText }]} numberOfLines={1}>
              {otherName || 'Usuário'}
            </Text>
            {petTitle ? (
              <Text style={[styles.chatHeaderPet, { color: colors.headerSubText }]} numberOfLines={1}>
                Pet: {petTitle}
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {/* Lista de Mensagens */}
      <FlatList
        ref={flatListRef}
        data={messages}
        extraData={messages}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      />

      {/* Preview de foto selecionada */}
      {photoPreview && (
        <View style={[styles.previewRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image source={{ uri: photoPreview }} style={styles.previewImage} />
          <TouchableOpacity onPress={handleRemovePhoto} style={styles.removePhotoButton}>
            <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Remover</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Barra de Digitação (Estilo Instagram Direct com Pill) */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: isKeyboardOpen ? 8 : Math.max(8, insets.bottom),
          },
        ]}
      >
        <View
          style={[
            styles.inputPill,
            {
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <TouchableOpacity
            onPress={handlePickPhoto}
            style={[styles.photoButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            accessibilityLabel="Anexar foto"
          >
            <Feather name="camera" size={17} color="#FFFFFF" />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              { color: colors.text },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Mensagem..."
            placeholderTextColor={colors.textMuted}
            editable={!sending}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            returnKeyType="send"
            multiline
          />

          {input.trim().length > 0 || photoPreview ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending}
              style={[styles.sendPillBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, height: 60, borderBottomWidth: 1 },
  headerBackBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', marginRight: 10 },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', overflow: 'hidden', marginRight: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  chatAvatarImage: { width: 40, height: 40, borderRadius: 20, resizeMode: 'cover' },
  chatHeaderContent: { flex: 1, minWidth: 0 },
  chatHeaderName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  chatHeaderPet: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  messageRow: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 4 },
  myMessage: { justifyContent: 'flex-end' },
  otherMessage: { justifyContent: 'flex-start' },
  messageCard: { maxWidth: '80%', padding: 12, borderRadius: 16, borderWidth: 1 },
  messageText: { fontSize: 15, marginBottom: 2, lineHeight: 20 },
  messageImage: { width: 180, height: 180, borderRadius: 12, marginBottom: 6, backgroundColor: '#E5E7EB' },
  previewRow: { flexDirection: 'row', alignItems: 'center', padding: 8, borderTopWidth: 1 },
  previewImage: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  removePhotoButton: { padding: 8 },
  messageMeta: { fontSize: 10.5, marginTop: 4 },
  inputContainer: { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1 },
  inputPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 26, paddingHorizontal: 8, paddingVertical: 4, minHeight: 48, borderWidth: 1 },
  photoButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  input: { flex: 1, fontSize: 15, paddingVertical: 6, paddingHorizontal: 6, maxHeight: 100 },
  sendPillBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
});

export default ChatScreen;
