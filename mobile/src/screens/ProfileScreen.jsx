import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';
// import { useNavigation } from '@react-navigation/native';

const statIcons = {
  Publicados: 'package',
  Devolvidos: 'check-circle',
  Ativos: 'clock',
};

const menuItems = [
  { label: 'Meus Anúncios', icon: 'package', route: 'MeusAnuncios' },
  { label: 'Configurações', icon: 'settings', route: 'Config' },
  { label: 'Ajuda e Suporte', icon: 'help-circle', route: 'AjudaSuporte' },
];

const ProfileScreen = ({ navigation }) => {
  const { userProfile, user, signOut, refreshProfile } = useAuth();
  const [userItems, setUserItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      if (user) {
        await refreshProfile();
        const items = await itemsService.getUserItems(user.id);
        setUserItems(items);
      }
      setLoading(false);
    })();
  }, []);

  const stats = [
    { label: 'Publicados', value: userItems.length, icon: 'package' },
    { label: 'Devolvidos', value: userItems.filter(i => i.resolved).length, icon: 'check-circle' },
    { label: 'Ativos', value: userItems.filter(i => !i.resolved).length, icon: 'clock' },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userProfile?.name?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{userProfile?.name || 'Usuário'}</Text>
          <Text style={styles.email}>{userProfile?.email}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          {stats.map((stat, idx) => (
            <View key={stat.label} style={[styles.statCol, idx !== 0 && styles.statColDivider]}> 
              <View style={styles.statIconCircle}>
                <Feather name={stat.icon} size={20} color="#4F46E5" />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.route)}
          >
            <View style={styles.menuIconCircle}>
              <Feather name={item.icon} size={20} color="#1F2937" />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Feather name="chevron-right" size={20} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.8}>
        <Feather name="log-out" size={20} color="#EF4444" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.version}>Achados & Perdidos v1.0.0</Text>
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
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: 40,
    paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  editBtn: {
    marginLeft: 12,
    backgroundColor: '#6366F1',
    borderRadius: 20,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    borderWidth: 4,
    borderColor: '#E0E7FF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 2,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: -32,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statColDivider: {
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  menuSection: {
    marginTop: 32,
    marginHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 32,
  },
});

export default ProfileScreen;
