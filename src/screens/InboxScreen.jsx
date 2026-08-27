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
import { Feather, MaterialIcons } from '@expo/vector-icons';

const InboxScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedConversationKey, setSelectedConversationKey] = useState(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const convs = await getConversations(user.id);
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

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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
      'Ocultar conversa',
      `Deseja ocultar a conversa com ${conversation.otherName || 'usuário'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ocultar',
          style: 'destructive',
          onPress: async () => {
            try {
              await hideConversation(user.id, conversation.otherId, conversation.itemId);
              setSelectedConversationKey(null);
              loadConversations();
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível ocultar a conversa.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
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
    const initial = item.otherName?.trim()[0]?.toUpperCase() || 'U';

    return (
      <View style={[
        styles.convBtn,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        isSelected && { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' },
      ]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChatScreen', { conversation: item })}
          onLongPress={() => setSelectedConversationKey(`${item.otherId}_${item.itemId || ''}`)}
          style={styles.convMainButton}
          activeOpacity={0.85}
        >
          {/* Avatar com foto ou inicial estilizada */}
          <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 19 }}>
                {initial}
              </Text>
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {item.otherName || 'Usuário'}
              </Text>
              <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
            </View>

            {/* Chip de Pet Relacionado */}
            {item.itemTitle ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                <View style={[styles.petChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <MaterialIcons name="pets" size={10} color={colors.primary} style={{ marginRight: 3 }} />
                  <Text style={[styles.petChipText, { color: colors.primary }]} numberOfLines={1}>
                    {item.itemTitle}
                  </Text>
                </View>
              </View>
            ) : null}

            {item.lastPhotoUrl ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="image" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                  Foto enviada
                </Text>
              </View>
            ) : (
              <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.lastMessage || 'Conversa iniciada'}
              </Text>
            )}
          </View>

          {item.unread ? (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeText}>{item.unread}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {isSelected && (
          <TouchableOpacity
            onPress={() => handleDeleteConversation(item)}
            style={[styles.deleteConversationButton, { backgroundColor: isDark ? '#1E293B' : '#FEE2E2' }]}
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
      {/* Barra de Busca de Conversas */}
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
            style={{ position: 'absolute', right: 10, top: 12, zIndex: 3, padding: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x-circle" size={18} color={colors.textMuted} />
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
                <Text style={{ fontWeight: '800', color: colors.primary, marginBottom: 4 }}>
                  {item.conversation.otherName} {item.conversation.itemTitle ? `• 🐾 ${item.conversation.itemTitle}` : ''}
                </Text>
                <Text style={{ color: isDark ? '#F8FAFC' : '#1F2937', fontSize: 14, backgroundColor: isDark ? '#334155' : '#FFF9C4', borderRadius: 8, padding: 6 }}>
                  {item.message.content}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                  {new Date(item.message.sent_at).toLocaleString()}
                </Text>
              </TouchableOpacity>
            )}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
              <Feather name="search" size={36} color={colors.textMuted} />
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
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialIcons name="chat-bubble-outline" size={38} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhuma conversa ainda</Text>
          <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>
            Quando você trocar mensagens sobre um animal com outros tutores, elas aparecerão aqui em tempo real.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: 14,
    zIndex: 2,
  },
  searchInput: {
    height: 48,
    borderRadius: 16,
    paddingLeft: 42,
    paddingRight: 36,
    fontSize: 15,
    borderWidth: 1,
  },
  convBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  convMainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: 12,
  },
  deleteConversationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
  name: {
    fontWeight: '800',
    fontSize: 15.5,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11.5,
    fontWeight: '600',
    flexShrink: 0,
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  petChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  lastMessage: {
    fontSize: 13,
    lineHeight: 17,
  },
  unreadBadge: {
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11.5,
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
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyMsg: {
    fontSize: 13.5,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 19,
  },
});

export default InboxScreen;
