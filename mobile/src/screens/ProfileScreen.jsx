import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || userProfile?.avatarUrl || null);

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

  React.useEffect(() => {
    setAvatarUrl(userProfile?.avatar_url || userProfile?.avatarUrl || null);
  }, [userProfile]);

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permissão para acessar a galeria é necessária!');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]?.uri) {
      setUploading(true);
      try {
        const { uploadAvatar, updateProfile } = await import('../services/user');
        const url = await uploadAvatar(user.id, pickerResult.assets[0].uri);
        // Atualiza o campo avatar_path no perfil para garantir consistência com getUserById
        const ext = url.split('.').pop().split('?')[0];
        const avatarPath = `${user.id}/avatar.${ext}`;
        await updateProfile(user.id, { avatar_path: avatarPath });
        setAvatarUrl(url);
        await refreshProfile();
      } catch (e) {
        alert('Erro ao atualizar foto de perfil.');
      } finally {
        setUploading(false);
      }
    }
  };

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
      {/* Botão editar no topo direito */}
      <View style={{ position: 'relative' }}>
        {/* Avatar centralizado e email */}
        <View style={styles.profileTopContainer}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} style={styles.avatarTouchable}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{userProfile?.name?.[0]?.toUpperCase() || 'U'}</Text>
                </View>
              )}
              {uploading && <ActivityIndicator style={{ position: 'absolute', alignSelf: 'center', top: '40%' }} size="small" color="#6366F1" />}
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.name}>{userProfile?.name || 'Usuário'}</Text>
            <TouchableOpacity
              style={{ marginLeft: 8, backgroundColor: '#4F46E5', borderRadius: 16, padding: 6 }}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.email}>{userProfile?.email}</Text>
        </View>
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

      {/* App Version removido */}
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
  profileTopContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  avatarTouchable: {
    marginBottom: 12,
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#E0E7FF',
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
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
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
    marginTop: 12,
    marginHorizontal: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
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
    marginTop: 10,
    marginHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 8,
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
