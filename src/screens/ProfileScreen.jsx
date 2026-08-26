import React, { useEffect, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as itemsService from '../services/items';

const ProfileScreen = ({ navigation }) => {
  const { userProfile, user, signOut, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || userProfile?.avatarUrl || null);

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      if (user) {
        await refreshProfile();
        const items = await itemsService.getUserItems(user.id);
        setUserItems(items || []);
      }
      setLoading(false);
    };
    loadProfileData();
  }, [user, refreshProfile]);

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
  const locationText = [userProfile?.city, userProfile?.state].filter(Boolean).join(', ');

  const communityLinks = [
    {
      label: 'Mural de Reencontros',
      description: 'Animais recuperados e relatos da comunidade',
      icon: 'heart',
      route: 'MuralReencontros',
    },
    {
      label: 'Sobre o WeFIND',
      description: 'Conheça a plataforma e como funciona',
      icon: 'info',
      route: 'Sobre',
    },
  ];

  const settingsLinks = [
    {
      label: 'Configurações',
      description: 'Tema escuro, notificações e segurança',
      icon: 'settings',
      route: 'Config',
    },
    {
      label: 'Ajuda e suporte',
      description: 'Dúvidas frequentes e canais de contato',
      icon: 'help-circle',
      route: 'AjudaSuporte',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Card Principal de Identidade do Usuário */}
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
                <Feather name="camera" size={12} color="#FFFFFF" />
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
                  <View style={styles.metaItem}>
                    <Feather name="map-pin" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {locationText}
                    </Text>
                  </View>
                ) : null}
                {formattedPhone ? (
                  <View style={styles.metaItem}>
                    <Feather name="phone" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
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
          style={[styles.editProfileButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9', borderColor: colors.border }]}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.75}
        >
          <Feather name="user-check" size={15} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.editProfileButtonText, { color: colors.text }]}>Editar perfil e contatos</Text>
          <Feather name="chevron-right" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </View>

      {/* Acesso Direto: Minhas Publicações */}
      <TouchableOpacity
        style={[styles.postsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => navigation.navigate('MeusAnuncios')}
        activeOpacity={0.85}
      >
        <View style={[styles.postsIconBox, { backgroundColor: colors.primaryLight }]}>
          <Feather name="file-text" size={20} color={colors.primary} />
        </View>
        <View style={styles.postsTextBox}>
          <Text style={[styles.postsTitle, { color: colors.text }]}>Minhas Publicações</Text>
          <Text style={[styles.postsSubtitle, { color: colors.textSecondary }]}>
            Gerenciar anúncios e acompanhar pets
          </Text>
        </View>
        <View style={[styles.postsBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.postsBadgeText, { color: colors.primary }]}>
            {userItems.length}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textMuted} style={{ marginLeft: 6 }} />
      </TouchableOpacity>

      {/* Grupo: Comunidade */}
      <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>COMUNIDADE</Text>
      <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {communityLinks.map((item, index) => (
          <React.Fragment key={item.route}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIconBox, { backgroundColor: colors.primaryLight }]}>
                <Feather name={item.icon} size={17} color={colors.primary} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {index < communityLinks.length - 1 ? (
              <View style={[styles.menuDivider, { backgroundColor: colors.divider }]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      {/* Grupo: Conta & Preferências */}
      <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>CONTA & PREFERÊNCIAS</Text>
      <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {settingsLinks.map((item, index) => (
          <React.Fragment key={item.route}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIconBox, { backgroundColor: colors.primaryLight }]}>
                <Feather name={item.icon} size={17} color={colors.primary} />
              </View>
              <View style={styles.menuTextBox}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {index < settingsLinks.length - 1 ? (
              <View style={[styles.menuDivider, { backgroundColor: colors.divider }]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      {/* Botão de Logout */}
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
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
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
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
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
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
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
    fontWeight: '600',
  },
  postsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  postsIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  postsTextBox: {
    flex: 1,
  },
  postsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  postsSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  postsBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 4,
  },
  postsBadgeText: {
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
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextBox: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuDescription: {
    fontSize: 11.5,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    marginLeft: 54,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ProfileScreen;
