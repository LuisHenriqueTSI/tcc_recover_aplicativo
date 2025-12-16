import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { getConversations } from '../services/messages';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';

const InboxScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const convs = await getConversations(user.id);
      setConversations(convs);
    } catch (err) {
      setError(err.message || 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
    // Opcional: polling a cada 10s
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ChatScreen', { conversation: item })}
      style={styles.item}
    >
      <Card>
        <Text style={styles.name}>{item.otherName || 'Usuário'}</Text>
        {item.itemTitle && <Text style={styles.itemTitle}>{item.itemTitle}</Text>}
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </Card>
    </TouchableOpacity>
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007AFF" />;
  if (error) return <Text style={styles.error}>{error}</Text>;

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma conversa encontrada.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  item: { margin: 8 },
  name: { fontWeight: 'bold', fontSize: 16, color: '#1F2937' },
  itemTitle: { color: '#6B7280', fontSize: 13 },
  lastMessage: { color: '#374151', fontSize: 14, marginTop: 2 },
  error: { color: 'red', textAlign: 'center', marginTop: 20 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 40 },
});

export default InboxScreen;
