import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as itemsService from '../services/items';

const secondaryLinks = [
  { label: 'Finais Felizes & Impacto', description: 'Animais recuperados e relatos', icon: 'heart', route: 'Sobre' },
  { label: 'Sobre o WeFIND', description: 'Conheça o aplicativo e nossa missão', icon: 'info', route: 'Sobre', params: { forceFullView: true } },
  { label: 'Configurações', description: 'Aparência, preferências e segurança', icon: 'settings', route: 'Config' },
  { label: 'Ajuda e suporte', description: 'Perguntas e contato', icon: 'help-circle', route: 'AjudaSuporte' },
];

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
      quality: 0.7,
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

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Abrindo seu perfil...</Text>
      </View>
    );
  }

  const formatDisplayPhone = (value) => {
    let digits = String(value || '').replace(/\D/g, '');

    if (digits.startsWith('55')) {
      digits = digits.slice(2);
    }

    if (!digits) return null;
    if (digits.length === 10) {
      return `+55 (${digits.slice(0, 2)}) 9${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11) {
      return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return `+55 ${digits}`;
  };

  const initial = userProfile?.name?.[0]?.toUpperCase() || 'U';
  const phoneNumber = userProfile?.whatsapp || userProfile?.phone || user?.phone || userProfile?.whatsapp_number || null;
  const formattedPhone = phoneNumber ? formatDisplayPhone(phoneNumber) : null;
  const publishedCount = userItems.length;
  const returnedCount = userItems.filter(item => item.resolved).length;
  const activeCount = userItems.filter(item => !item.resolved).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.profileHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handlePickAvatar} disabled={uploading} activeOpacity={0.85} style={styles.avatarButton}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={[styles.avatarImage, { borderColor: colors.surface }]} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={[styles.camera, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
            <Feather name={uploading ? 'loader' : 'camera'} size={13} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]}>{userProfile?.name || 'Usuário'}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            style={[styles.avatarEditButton, { backgroundColor: colors.primaryLight, borderColor: colors.cardBorder }]}
            accessibilityLabel="Editar perfil"
          >
            <Feather name="edit-2" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {formattedPhone ? (
          <Text style={[styles.phone, { color: colors.textSecondary }]}>{formattedPhone}</Text>
        ) : (
          <Text style={[styles.phonePlaceholder, { color: colors.textMuted }]}>Adicionar telefone</Text>
        )}
      </View>

      <View style={[styles.stats, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{publishedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>publicações</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{activeCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ativas</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.success }]}>{returnedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>devolvidos</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.publicationsButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('MeusAnuncios')}
        activeOpacity={0.82}
      >
        <View style={[styles.publicationsIcon, { backgroundColor: colors.primaryDark }]}>
          <Feather name="bookmark" size={20} color="#fff" />
        </View>
        <View style={styles.publicationsCopy}>
          <Text style={styles.publicationsTitle}>Minhas publicações</Text>
          <Text style={styles.publicationsText}>Veja seus pets e acompanhe os anúncios</Text>
        </View>
        <Feather name="arrow-up-right" size={21} color="#fff" />
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Mais opções</Text>
      <View style={[styles.links, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        {secondaryLinks.map((item, index) => (
          <React.Fragment key={item.label || item.route}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate(item.route, item.params)}
              activeOpacity={0.75}
            >
              <View style={[styles.linkIcon, { backgroundColor: colors.primaryLight }]}>
                <Feather name={item.icon} size={19} color={colors.primary} />
              </View>
              <View style={styles.linkCopy}>
                <Text style={[styles.linkTitle, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.linkDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
              <Feather name="chevron-right" size={19} color={colors.textMuted} />
            </TouchableOpacity>
            {index < secondaryLinks.length - 1 ? (
              <View style={[styles.linkDivider, { backgroundColor: colors.divider }]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.logout,
          {
            backgroundColor: isDark ? '#2D1515' : '#FEF2F2',
            borderColor: isDark ? '#7F1D1D' : '#FECACA',
          },
        ]}
        onPress={signOut}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={17} color="#DC2626" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  content: { paddingBottom: 42 },
  loading: { flex: 1, backgroundColor: '#F8FAFB', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#64748B', fontSize: 13, marginTop: 10 },
  profileHeader: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  avatarButton: { position: 'relative', marginBottom: 12 },
  avatarEditButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginLeft: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  avatarImage: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 38, fontWeight: '800' },
  camera: { position: 'absolute', bottom: 6, right: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  name: { color: '#0F172A', fontSize: 22, fontWeight: '800' },
  phone: { color: '#64748B', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  phonePlaceholder: { color: '#94A3B8', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  stats: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, marginHorizontal: 20, marginTop: 17, paddingVertical: 14, flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E2E8F0' },
  statValue: { color: '#0F172A', fontSize: 23, fontWeight: '800' },
  indigoValue: { color: '#2563EB' },
  statLabel: { color: '#64748B', fontSize: 11, marginTop: 3 },
  publicationsButton: { backgroundColor: '#2563EB', borderRadius: 17, marginHorizontal: 20, marginTop: 17, padding: 14, flexDirection: 'row', alignItems: 'center' },
  publicationsIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  publicationsCopy: { flex: 1 },
  publicationsTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  publicationsText: { color: '#DBEAFE', fontSize: 11, marginTop: 4 },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800', marginHorizontal: 20, marginTop: 27, marginBottom: 10 },
  links: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, marginHorizontal: 20, paddingHorizontal: 14 },
  linkRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center' },
  linkIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  linkCopy: { flex: 1 },
  linkTitle: { color: '#0F172A', fontSize: 14, fontWeight: '800' },
  linkDescription: { color: '#64748B', fontSize: 11, marginTop: 3 },
  linkDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 50 },
  logout: { height: 48, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', borderRadius: 13, marginHorizontal: 20, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: '#DC2626', fontSize: 13, fontWeight: '800' },
});

export default ProfileScreen;
