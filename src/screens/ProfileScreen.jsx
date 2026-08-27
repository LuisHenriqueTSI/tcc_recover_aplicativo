import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as itemsService from '../services/items';

const ProfileScreen = ({ navigation }) => {
  const { userProfile, user, signOut, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [localSavedLocation, setLocalSavedLocation] = useState(null);

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const stored = await AsyncStorage.getItem('@wefind/saved_location');
        if (stored) setLocalSavedLocation(JSON.parse(stored));
      } catch (e) {}
      if (user) {
        await refreshProfile();
        const items = await itemsService.getUserItems(user.id);
        setUserItems(items || []);
      }
      setLoading(false);
    };
    loadProfileData();
  }, [user, refreshProfile]);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('@wefind/saved_location').then((data) => {
        if (data) {
          try {
            setLocalSavedLocation(JSON.parse(data));
          } catch (e) {}
        }
      });
      if (user) {
        refreshProfile();
        itemsService.getUserItems(user.id).then((items) => setUserItems(items || []));
      }
    }, [user, refreshProfile])
  );

  useEffect(() => {
    setAvatarUrl(userProfile?.avatar_url || userProfile?.avatarUrl || null);
  }, [userProfile]);

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para escolher uma foto de perfil.');
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
      setUploading(true);
      try {
        const { uploadAvatar, updateProfile } = await import('../services/user');
        const url = await uploadAvatar(user.id, pickerResult.assets[0].uri);
        const ext = url.split('.').pop().split('?')[0];
        await updateProfile(user.id, { avatar_path: `${user.id}/avatar.${ext}` });
        setAvatarUrl(url);
        await refreshProfile();
      } catch (error) {
        Alert.alert('Não foi possível atualizar', 'Tente escolher outra foto.');
      } finally {
        setUploading(false);
      }
    }
  };

  const formatDisplayPhone = (value) => {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('55')) digits = digits.slice(2);
    if (!digits) return null;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) 9${digits.slice(2, 6)}-${digits.slice(6)}`;
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return digits;
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const initial = userProfile?.name?.[0]?.toUpperCase() || 'U';
  const phoneNumber = userProfile?.whatsapp || userProfile?.phone || user?.phone || null;
  const formattedPhone = phoneNumber ? formatDisplayPhone(phoneNumber) : null;
  
  const effectiveCity = userProfile?.city || localSavedLocation?.city;
  const effectiveState = userProfile?.state || localSavedLocation?.state;
  const effectiveNeighborhood = userProfile?.neighborhood || localSavedLocation?.neighborhood || localSavedLocation?.district;

  const locationText = (effectiveCity && effectiveState)
    ? `${effectiveCity} - ${effectiveState}`
    : (effectiveCity || effectiveState || null);

  const activeItemsCount = userItems.filter(i => i.status !== 'resolved').length;
  const resolvedItemsCount = userItems.filter(i => i.status === 'resolved').length;

  const communityLinks = [
    {
      label: 'Mural de Reencontros',
      description: 'Animais recuperados e relatos de tutores',
      icon: 'favorite',
      iconColor: '#EC4899',
      bgColor: '#FDF2F8',
      route: 'MuralReencontros',
    },
    {
      label: 'Sobre o WeFIND',
      description: 'Conheça a plataforma e como funciona',
      icon: 'info',
      iconColor: '#3B82F6',
      bgColor: '#EFF6FF',
      route: 'Sobre',
    },
  ];

  const settingsLinks = [
    {
      label: 'Configurações',
      description: 'Tema escuro, notificações e segurança',
      icon: 'settings',
      iconColor: '#8B5CF6',
      bgColor: '#F5F3FF',
      route: 'Config',
    },
    {
      label: 'Ajuda e suporte',
      description: 'Dúvidas frequentes e canais de contato',
      icon: 'help',
      iconColor: '#10B981',
      bgColor: '#ECFDF5',
      route: 'AjudaSuporte',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO IDENTITY CARD */}
      <View style={[styles.identityCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.identityRow}>
          <TouchableOpacity
            onPress={handlePickAvatar}
            disabled={uploading}
            activeOpacity={0.85}
            style={styles.avatarWrapper}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="camera" size={13} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.identityDetails}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {userProfile?.name || 'Usuário WeFIND'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
              {user?.email || 'Conta cadastrada'}
            </Text>

            {(formattedPhone || locationText) ? (
              <View style={styles.metaRow}>
                {locationText ? (
                  <View style={[styles.metaChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Feather name="map-pin" size={11} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.metaText, { color: colors.text }]} numberOfLines={1}>
                      {locationText}
                    </Text>
                  </View>
                ) : null}
                {formattedPhone ? (
                  <View style={[styles.metaChip, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <Feather name="phone" size={11} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text style={[styles.metaText, { color: colors.text }]} numberOfLines={1}>
                      {formattedPhone}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Botão de Edição de Perfil */}
        <TouchableOpacity
          style={[styles.editProfileButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC', borderColor: colors.border }]}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.75}
        >
          <Feather name="edit-2" size={14} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.editProfileButtonText, { color: colors.text }]}>Editar perfil e contatos</Text>
          <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </View>

      {/* 2. STATS QUICK CARDS */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => navigation.navigate('MeusAnuncios')}
          activeOpacity={0.8}
        >
          <View style={[styles.statIconBox, { backgroundColor: colors.primaryLight }]}>
            <MaterialIcons name="pets" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.statNumber, { color: colors.text }]}>{userItems.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Publicações</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => navigation.navigate('MeusAnuncios')}
          activeOpacity={0.8}
        >
          <View style={[styles.statIconBox, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
            <MaterialIcons name="check-circle" size={18} color="#16A34A" />
          </View>
          <Text style={[styles.statNumber, { color: isDark ? '#4ADE80' : '#15803D' }]}>{activeItemsCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ativas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => navigation.navigate('MuralReencontros')}
          activeOpacity={0.8}
        >
          <View style={[styles.statIconBox, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.2)' : '#FCE7F3' }]}>
            <MaterialIcons name="favorite" size={18} color="#DB2777" />
          </View>
          <Text style={[styles.statNumber, { color: isDark ? '#F472B6' : '#BE185D' }]}>{resolvedItemsCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reencontros</Text>
        </TouchableOpacity>
      </View>

      {/* 3. ACESSO DIRETO: MINHAS PUBLICAÇÕES */}
      <TouchableOpacity
        style={[styles.postsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => navigation.navigate('MeusAnuncios')}
        activeOpacity={0.85}
      >
        <View style={[styles.postsIconBox, { backgroundColor: colors.primaryLight }]}>
          <MaterialIcons name="dashboard" size={22} color={colors.primary} />
        </View>
        <View style={styles.postsTextBox}>
          <Text style={[styles.postsTitle, { color: colors.text }]}>Gerenciar Meus Anúncios</Text>
          <Text style={[styles.postsSubtitle, { color: colors.textSecondary }]}>
            Acompanhar status, renovar e editar seus pets
          </Text>
        </View>
        <View style={[styles.postsBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.postsBadgeText}>
            {userItems.length}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      {/* 4. GRUPO: COMUNIDADE */}
      <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>COMUNIDADE</Text>
      <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {communityLinks.map((item, index) => (
          <React.Fragment key={item.route}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : item.bgColor }]}>
                <MaterialIcons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {index < communityLinks.length - 1 ? (
              <View style={[styles.menuDivider, { backgroundColor: colors.divider }]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      {/* 5. GRUPO: CONTA & PREFERÊNCIAS */}
      <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>CONTA & PREFERÊNCIAS</Text>
      <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {settingsLinks.map((item, index) => (
          <React.Fragment key={item.route}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : item.bgColor }]}>
                <MaterialIcons name={item.icon} size={20} color={item.iconColor} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {index < settingsLinks.length - 1 ? (
              <View style={[styles.menuDivider, { backgroundColor: colors.divider }]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      {/* 6. BOTÃO DE LOGOUT */}
      <TouchableOpacity
        style={[
          styles.logoutButton,
          {
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
            borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2',
          },
        ]}
        onPress={signOut}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={16} color="#DC2626" style={{ marginRight: 8 }} />
        <Text style={styles.logoutButtonText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  editProfileButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  postsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  postsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  postsTextBox: {
    flex: 1,
  },
  postsTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  postsSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  postsBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
  },
  postsBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  groupTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextBox: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  menuDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    marginLeft: 64,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default ProfileScreen;
