import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getMessages } from '../services/messages';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, Alert } from 'react-native';
import { getConversations, hideConversation } from '../services/messages';
import { getItemById } from '../services/items';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card';
import { Feather } from '@expo/vector-icons';
// import ChatScreen from './ChatScreen';

const InboxScreen = () => {
  console.log('[InboxScreen] MONTADO', Date.now());
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchResults, setSearchResults] = useState([]); // [{conversation, message}]
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedConversationKey, setSelectedConversationKey] = useState(null);
  // const [selectedConversation, setSelectedConversation] = useState(null);

  const loadConversations = useCallback(async () => {
    console.log('[InboxScreen] loadConversations chamado', Date.now());
    setLoading(true);
    setError('');
    try {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const convs = await getConversations(user.id);
      // Buscar título do item se não estiver presente
      const convsWithTitles = await Promise.all(convs.map(async (conv) => {
        if (!conv.itemTitle && conv.itemId) {
          const item = await getItemById(conv.itemId);
          return { ...conv, itemTitle: item?.title || '' };
        }
        return conv;
      }));
      setConversations(convsWithTitles);
      setFiltered(convsWithTitles);
    } catch (err) {
      setError(err.message || 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [user]);


  // Carrega conversas ao montar
  useEffect(() => {
    console.log('[InboxScreen] useEffect inicial', Date.now());
    loadConversations();
  }, [loadConversations]);

  // Atualiza conversas ao focar na tela, sem loading visível
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  useEffect(() => {
    let cancelled = false;
    async function searchMessages() {
      if (!search.trim()) {
        setFiltered(conversations);
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const s = search.trim().toLowerCase();
      let results = [];
      for (const c of conversations) {
        try {
          const msgs = await getMessages(user.id, c.otherId, 200);
          msgs.forEach(m => {
            if ((m.content || '').toLowerCase().includes(s)) {
              results.push({ conversation: c, message: m });
            }
          });
        } catch (e) {}
      }
      if (!cancelled) {
        setSearchResults(results);
        setSearching(false);
      }
    }
    searchMessages();
    return () => { cancelled = true; };
  }, [search, conversations, user?.id]);

  const handleDeleteConversation = (conversation) => {
    Alert.alert(
      'Apagar conversa',
      `A conversa com ${conversation.otherName || 'este usuário'} será removida da sua caixa de mensagens.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await hideConversation(user.id, conversation.otherId);
              setConversations((current) => current.filter((item) => item.otherId !== conversation.otherId));
              setFiltered((current) => current.filter((item) => item.otherId !== conversation.otherId));
              setSelectedConversationKey(null);
            } catch (error) {
              Alert.alert('Erro', error.message || 'Não foi possível apagar a conversa.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    // Horário formatado
    let time = '';
    if (item.lastMessageAt) {
      const date = new Date(item.lastMessageAt);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (date > new Date(now - 86400000)) {
        time = 'Ontem';
      } else {
        time = date.toLocaleDateString();
      }
    }
    const isSelected = selectedConversationKey === `${item.otherId}_${item.itemId || ''}`;
    return (
      <View style={[
        styles.convBtn,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
      ]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChatScreen', { conversation: item })}
          onLongPress={() => setSelectedConversationKey(`${item.otherId}_${item.itemId || ''}`)}
          style={styles.convMainButton}
          activeOpacity={0.85}
        >
        <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
          <Image
            source={item.avatarUrl ? { uri: item.avatarUrl } : require('../assets/logo_wefind.png')}
            style={styles.avatarImage}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.otherName || 'Usuário'}</Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
          </View>
          {item.itemTitle ? <Text style={[styles.itemTitle, { color: colors.primary }]} numberOfLines={1}>{item.itemTitle}</Text> : null}
          {item.lastPhotoUrl ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="image" size={16} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>Imagem enviada</Text>
            </View>
          ) : (
            <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>{item.lastMessage}</Text>
          )}
        </View>
        {item.unread ? (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}><Text style={styles.unreadBadgeText}>{item.unread}</Text></View>
        ) : null}
        </TouchableOpacity>
        {isSelected && (
          <TouchableOpacity
            onPress={() => handleDeleteConversation(item)}
            style={[styles.deleteConversationButton, { backgroundColor: isDark ? '#1E293B' : '#F9FAFB' }]}
            accessibilityLabel={`Apagar conversa com ${item.otherName || 'usuário'}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={16} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} size="large" color={colors.primary} />;
  if (error) return <Text style={[styles.error, { backgroundColor: colors.background }]}>{error}</Text>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchWrapper}>
        <Feather name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Buscar conversas ou mensagens..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            style={{ position: 'absolute', right: 8, top: 8, zIndex: 3, padding: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {search.trim() ? (
        searching ? (
          <ActivityIndicator style={{ flex: 1, marginTop: 32 }} size="large" color={colors.primary} />
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={item => `${item.conversation.otherId}_${item.conversation.itemId}_${item.message.id}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('ChatScreen', { conversation: item.conversation, highlightMessageId: item.message.id })}
                style={[styles.convBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder, flexDirection: 'column', alignItems: 'flex-start' }]}
                activeOpacity={0.85}
              >
                <Text style={{ fontWeight: 'bold', color: colors.primary, marginBottom: 2 }}>{item.conversation.otherName} {item.conversation.itemTitle ? `• ${item.conversation.itemTitle}` : ''}</Text>
                <Text style={{ color: isDark ? '#F8FAFC' : '#1F2937', fontSize: 15, backgroundColor: isDark ? '#334155' : '#FFF9C4', borderRadius: 6, padding: 4 }}>{item.message.content}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{new Date(item.message.sent_at).toLocaleString()}</Text>
              </TouchableOpacity>
            )}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
              <Feather name="search" size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma mensagem encontrada</Text>
            <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>Nenhuma mensagem ou conversa contém o termo pesquisado.</Text>
          </View>
        )
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={item => `${item.otherId || ''}_${item.itemId || ''}`}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
            <Feather name="message-circle" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma conversa ainda</Text>
          <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>Quando você entrar em contato sobre um item, suas conversas aparecerão aqui.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  searchWrapper: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 2,
  },
  searchInput: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingLeft: 40,
    paddingRight: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  convBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  convBtnSelected: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  convMainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 10,
  },
  deleteConversationButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    resizeMode: 'cover',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
    flexShrink: 0,
  },
  itemTitle: {
    color: '#2563EB',
    fontSize: 13,
    marginBottom: 2,
  },
  lastMessage: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 0,
  },
  unreadBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyMsg: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 260,
  },
});

export default InboxScreen;
