import React, { useEffect, useState, useCallback } from 'react';
import { getMessages } from '../services/messages';
import { useNavigation } from '@react-navigation/native';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput } from 'react-native';
import { getConversations } from '../services/messages';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';
import { Feather } from '@expo/vector-icons';
// import ChatScreen from './ChatScreen';

const InboxScreen = () => {
  console.log('[InboxScreen] MONTADO', Date.now());
  const navigation = useNavigation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchResults, setSearchResults] = useState([]); // [{conversation, message}]
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  // const [selectedConversation, setSelectedConversation] = useState(null);

  const loadConversations = useCallback(async () => {
    console.log('[InboxScreen] loadConversations chamado', Date.now());
    setLoading(true);
    setError('');
    try {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const convs = await getConversations(user.id);
      setConversations(convs);
      setFiltered(convs);
    } catch (err) {
      setError(err.message || 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('[InboxScreen] useEffect inicial', Date.now());
    loadConversations();
  }, [loadConversations]);

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
  }, [search, conversations, user.id]);

  const renderItem = ({ item, index }) => {
    const avatar = (item.otherName || 'U').charAt(0).toUpperCase();
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
    return (
      <TouchableOpacity
        key={item.otherId + '_' + (item.itemId || '')}
        onPress={() => navigation.navigate('ChatScreen', { conversation: item })}
        style={styles.convBtn}
        activeOpacity={0.85}
      >
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{avatar}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.name} numberOfLines={1}>{item.otherName || 'Usuário'}</Text>
            <Text style={styles.time}>{time}</Text>
          </View>
          {item.itemTitle ? <Text style={styles.itemTitle} numberOfLines={1}>{item.itemTitle}</Text> : null}
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
        </View>
        {item.unread ? (
          <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{item.unread}</Text></View>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#4F46E5" />;
  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensagens</Text>
        <View style={styles.searchWrapper}>
          <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversas ou mensagens..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              style={{ position: 'absolute', right: 8, top: 8, zIndex: 3, padding: 4 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {search.trim() ? (
        searching ? (
          <ActivityIndicator style={{ flex: 1, marginTop: 32 }} size="large" color="#4F46E5" />
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={item => `${item.conversation.otherId}_${item.conversation.itemId}_${item.message.id}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('ChatScreen', { conversation: item.conversation, highlightMessageId: item.message.id })}
                style={[styles.convBtn, { flexDirection: 'column', alignItems: 'flex-start' }]}
                activeOpacity={0.85}
              >
                <Text style={{ fontWeight: 'bold', color: '#4F46E5', marginBottom: 2 }}>{item.conversation.otherName} {item.conversation.itemTitle ? `• ${item.conversation.itemTitle}` : ''}</Text>
                <Text style={{ color: '#1F2937', fontSize: 15, backgroundColor: '#FFF9C4', borderRadius: 6, padding: 4 }}>{item.message.content}</Text>
                <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>{new Date(item.message.sent_at).toLocaleString()}</Text>
              </TouchableOpacity>
            )}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Feather name="search" size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma mensagem encontrada</Text>
            <Text style={styles.emptyMsg}>Nenhuma mensagem ou conversa contém o termo pesquisado.</Text>
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
          <View style={styles.emptyIconCircle}>
            <Feather name="message-circle" size={40} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
          <Text style={styles.emptyMsg}>Quando você entrar em contato sobre um item, suas conversas aparecerão aqui.</Text>
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
    marginBottom: 0,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 2,
  },
  searchInput: {
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingLeft: 40,
    paddingRight: 12,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 0,
  },
  convBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    color: '#6366F1',
    fontSize: 13,
    marginBottom: 2,
  },
  lastMessage: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 0,
  },
  unreadBadge: {
    backgroundColor: '#4F46E5',
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
