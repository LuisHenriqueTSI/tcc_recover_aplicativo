import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import * as itemsService from '../services/items';

const secondaryLinks = [
  { label: 'Configurações', description: 'Preferências e segurança', icon: 'settings', route: 'Config' },
  { label: 'Ajuda e suporte', description: 'Perguntas e contato', icon: 'help-circle', route: 'AjudaSuporte' },
];

const ProfileScreen = ({ navigation }) => {
  const { userProfile, user, signOut, refreshProfile } = useAuth();
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
    return <View style={styles.loading}><ActivityIndicator size="large" color="#4F46E5" /><Text style={styles.loadingText}>Abrindo seu perfil...</Text></View>;
  }

  const initial = userProfile?.name?.[0]?.toUpperCase() || 'U';
  const firstName = userProfile?.name?.split(' ')[0] || 'Tutor';
  const location = [userProfile?.city, userProfile?.state].filter(Boolean).join(', ');
  const publishedCount = userItems.length;
  const returnedCount = userItems.filter(item => item.resolved).length;
  const activeCount = userItems.filter(item => !item.resolved).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.cover}>
        <View style={styles.coverPattern}><View style={styles.patternCircleOne} /><View style={styles.patternCircleTwo} /></View>
        <View style={styles.coverTop}><View /><TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={styles.coverEdit} accessibilityLabel="Editar perfil"><Feather name="edit-2" size={16} color="#4F46E5" /><Text style={styles.coverEditText}>Editar</Text></TouchableOpacity></View>
        <View style={styles.profileRow}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={uploading} activeOpacity={0.85} style={styles.avatarButton}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{initial}</Text></View>}
            <View style={styles.camera}><Feather name={uploading ? 'loader' : 'camera'} size={13} color="#fff" /></View>
          </TouchableOpacity>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{userProfile?.name || 'Usuário'}</Text>
            <Text style={styles.email}>{userProfile?.email || user?.email}</Text>
            {location ? <View style={styles.location}><Feather name="map-pin" size={13} color="#4F46E5" /><Text style={styles.locationText}>{location}</Text></View> : <Text style={styles.locationMissing}>Adicione sua localização</Text>}
          </View>
        </View>
      </View>

      <View style={styles.welcomeLine}><View><Text style={styles.welcomeTitle}>Olá, {firstName}</Text><Text style={styles.welcomeText}>Aqui você acompanha pets perdidos e encontrados.</Text></View></View>

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.statValue}>{publishedCount}</Text><Text style={styles.statLabel}>publicações</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.stat}><Text style={[styles.statValue, styles.indigoValue]}>{activeCount}</Text><Text style={styles.statLabel}>ativas</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.stat}><Text style={[styles.statValue, styles.indigoValue]}>{returnedCount}</Text><Text style={styles.statLabel}>devolvidos</Text></View>
      </View>

      <TouchableOpacity style={styles.publicationsButton} onPress={() => navigation.navigate('MeusAnuncios')} activeOpacity={0.82}>
        <View style={styles.publicationsIcon}><Feather name="bookmark" size={20} color="#fff" /></View>
        <View style={styles.publicationsCopy}><Text style={styles.publicationsTitle}>Minhas publicações</Text><Text style={styles.publicationsText}>Veja seus pets e acompanhe os anúncios</Text></View>
        <Feather name="arrow-up-right" size={21} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Mais opções</Text>
      <View style={styles.links}>
        {secondaryLinks.map((item, index) => <React.Fragment key={item.route}><TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate(item.route)} activeOpacity={0.75}><View style={styles.linkIcon}><Feather name={item.icon} size={19} color="#4F46E5" /></View><View style={styles.linkCopy}><Text style={styles.linkTitle}>{item.label}</Text><Text style={styles.linkDescription}>{item.description}</Text></View><Feather name="chevron-right" size={19} color="#9CA3AF" /></TouchableOpacity>{index === 0 ? <View style={styles.linkDivider} /> : null}</React.Fragment>)}
      </View>

      <TouchableOpacity style={styles.logout} onPress={signOut} activeOpacity={0.8}><Feather name="log-out" size={17} color="#B91C1C" /><Text style={styles.logoutText}>Sair da conta</Text></TouchableOpacity>
      <Text style={styles.footer}>Recover · cuidado que aproxima</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 42 },
  loading: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6B7280', fontSize: 13, marginTop: 10 },
  cover: { backgroundColor: '#EEF2FF', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: '#C7D2FE', overflow: 'hidden' },
  coverPattern: { position: 'absolute', right: 22, top: 34, flexDirection: 'row', alignItems: 'center', gap: 9, opacity: 0.8 },
  patternCircleOne: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C7D2FE' },
  patternCircleTwo: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E0E7FF' },
  coverTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  coverLabel: { color: '#4F46E5', fontSize: 11, letterSpacing: 1.4, fontWeight: '800' },
  coverEdit: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  coverEditText: { color: '#4F46E5', fontSize: 12, fontWeight: '800' },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  avatarButton: { position: 'relative', marginRight: 15 },
  avatarImage: { width: 82, height: 82, borderRadius: 28, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: { width: 82, height: 82, borderRadius: 28, backgroundColor: '#4F46E5', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 32, fontWeight: '800' },
  camera: { position: 'absolute', bottom: -3, right: -4, width: 27, height: 27, borderRadius: 10, backgroundColor: '#4F46E5', borderWidth: 2, borderColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, minWidth: 0 },
  name: { color: '#1F2937', fontSize: 21, fontWeight: '800' },
  email: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  locationText: { color: '#4F46E5', fontSize: 12, fontWeight: '700' },
  locationMissing: { color: '#6B7280', fontSize: 12, marginTop: 8 },
  welcomeLine: { marginHorizontal: 20, marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcomeTitle: { color: '#1F2937', fontSize: 17, fontWeight: '800' },
  welcomeText: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  stats: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, marginHorizontal: 20, marginTop: 17, paddingVertical: 14, flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB' },
  statValue: { color: '#1F2937', fontSize: 23, fontWeight: '800' },
  indigoValue: { color: '#4F46E5' },
  statLabel: { color: '#6B7280', fontSize: 11, marginTop: 3 },
  publicationsButton: { backgroundColor: '#4F46E5', borderRadius: 17, marginHorizontal: 20, marginTop: 17, padding: 14, flexDirection: 'row', alignItems: 'center' },
  publicationsIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#4338CA', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  publicationsCopy: { flex: 1 },
  publicationsTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  publicationsText: { color: '#E0E7FF', fontSize: 11, marginTop: 4 },
  sectionTitle: { color: '#374151', fontSize: 16, fontWeight: '800', marginHorizontal: 20, marginTop: 27, marginBottom: 10 },
  links: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, marginHorizontal: 20, paddingHorizontal: 14 },
  linkRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center' },
  linkIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  linkCopy: { flex: 1 },
  linkTitle: { color: '#1F2937', fontSize: 14, fontWeight: '800' },
  linkDescription: { color: '#6B7280', fontSize: 11, marginTop: 3 },
  linkDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 50 },
  logout: { height: 48, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', borderRadius: 13, marginHorizontal: 20, marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: '#B91C1C', fontSize: 13, fontWeight: '800' },
  footer: { color: '#9CA3AF', textAlign: 'center', fontSize: 11, marginTop: 15 },
});

export default ProfileScreen;
