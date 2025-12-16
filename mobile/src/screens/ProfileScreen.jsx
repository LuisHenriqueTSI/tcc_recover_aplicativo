import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import * as userService from '../services/user';
import * as itemsService from '../services/items';
import Button from '../components/Button';
import Card from '../components/Card';

const ProfileScreen = ({ navigation }) => {
  const { user, userProfile, signOut, refreshProfile } = useAuth();
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      if (user) {
        await refreshProfile();
        const items = await itemsService.getUserItems(user.id);
        setUserItems(items);
      }
    } catch (error) {
      console.log('Erro ao carregar dados do perfil:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.log('Erro ao fazer logout:', error.message);
    }
  };

  const activeItems = userItems.filter(item => !item.resolved);
  const historyItems = userItems.filter(item => item.resolved);

  const renderItemCard = ({ item }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemStatus}>
          {item.status === 'lost' ? '🔴' : '🟢'}
        </Text>
      </View>
      <Text style={styles.itemDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.itemActions}>
        <Button
          title="Editar"
          variant="secondary"
          onPress={() => navigation.navigate('RegisterItemTab', { item })}
          style={{ flex: 1 }}
        />
        <Button
          title="Detalhes"
          onPress={() => {}}
          style={{ flex: 1, marginLeft: 8 }}
        />
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {userProfile?.name?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{userProfile?.name}</Text>
          <Text style={styles.profileEmail}>{userProfile?.email}</Text>
          {userProfile?.phone && (
            <Text style={styles.profilePhone}>{userProfile.phone}</Text>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Pontos</Text>
          <Text style={styles.statValue}>{userProfile?.points || 0}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Nível</Text>
          <Text style={styles.statValue}>{userProfile?.level || 1}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Itens</Text>
          <Text style={styles.statValue}>{userItems.length}</Text>
        </Card>
      </View>

      {/* Bio */}
      {userProfile?.bio && (
        <Card>
          <Text style={styles.bioText}>{userProfile.bio}</Text>
        </Card>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={styles.tabText}>
            Itens Ativos ({activeItems.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={styles.tabText}>
            Histórico ({historyItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <FlatList
        data={activeTab === 'active' ? activeItems : historyItems}
        renderItem={renderItemCard}
        keyExtractor={item => item.id.toString()}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'active' ? 'Nenhum item ativo' : 'Nenhum item no histórico'}
            </Text>
          </View>
        }
      />

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Editar Perfil"
          onPress={() => navigation.navigate('EditProfile')}
          style={styles.button}
        />
        <Button
          title="Fazer Logout"
          variant="danger"
          onPress={handleLogout}
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  profileHeader: {
    flexDirection: 'row',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  profileEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  profilePhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginVertical: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  bioText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  itemCard: {
    marginHorizontal: 12,
    marginVertical: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  itemStatus: {
    fontSize: 16,
  },
  itemDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  itemActions: {
    flexDirection: 'row',
  },
  emptyContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  button: {
    marginBottom: 12,
  },
});

export default ProfileScreen;
