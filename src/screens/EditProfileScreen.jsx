import React, { useState, useEffect } from 'react';
import {
  Image,
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as userService from '../services/user';
import * as supabaseAuth from '../services/supabaseAuth';
import { sendPasswordReset } from '../services/supabaseAuth';
import Button from '../components/Button';
import Input from '../components/Input';
import MapLocationPicker from '../components/MapLocationPicker';
import { states } from '../lib/br-locations';

const normalizeRegionName = (value = '') =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizedRegionToUf = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

const formatBrazilianPhone = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const EditProfileScreen = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [profileState, setProfileState] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileCoords, setProfileCoords] = useState(null);
  const [mapVisible, setMapVisible] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setInstagram(userProfile.instagram || '');
      setFacebook(userProfile.facebook || '');
      setWhatsapp(userProfile.whatsapp || '');
      setProfileState(userProfile.state || '');
      setProfileCity(userProfile.city || '');
      if (userProfile.latitude && userProfile.longitude) {
        setProfileCoords({
          latitude: Number(userProfile.latitude),
          longitude: Number(userProfile.longitude),
        });
      }
      setAvatarUrl(userProfile.avatar_url || null);
    }
  }, [userProfile]);

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para escolher uma foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setAvatar(selectedUri);
      // Faz o upload imediatamente
      if (user) {
        setUploadingAvatar(true);
        try {
          const url = await userService.uploadAvatar(user.id, selectedUri);
          const ext = url.split('.').pop().split('?')[0];
          await userService.updateProfile(user.id, { avatar_path: `${user.id}/avatar.${ext}` });
          setAvatarUrl(url);
          setAvatar(null);
          await refreshProfile();
        } catch (e) {
          Alert.alert('Erro ao enviar foto', e.message || 'Tente outra imagem.');
        } finally {
          setUploadingAvatar(false);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Por favor, informe seu nome.');
      return;
    }

    if (!profileState || !profileCity) {
      setErrorMsg('Defina sua localização no mapa antes de salvar.');
      return;
    }

    try {
      setSaving(true);
      await userService.updateProfile(user.id, {
        name: name.trim(),
        instagram: instagram.trim(),
        facebook: facebook.trim(),
        whatsapp: whatsapp.replace(/\D/g, ''),
        state: profileState,
        city: profileCity,
        latitude: profileCoords?.latitude ?? null,
        longitude: profileCoords?.longitude ?? null,
      });

      // Atualiza também no AsyncStorage para sincronia com a HomeScreen
      try {
        await AsyncStorage.setItem(
          '@wefind/saved_location',
          JSON.stringify({
            city: profileCity,
            state: profileState,
            coords: profileCoords || null,
          })
        );
      } catch (e) {
        console.warn('[EditProfileScreen] Falha ao sincronizar AsyncStorage:', e.message);
      }

      await refreshProfile();
      Alert.alert('Perfil Atualizado', 'Suas informações foram salvas com sucesso!');
      navigation.goBack();
    } catch (error) {
      setErrorMsg(error.message || 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    Alert.alert(
      'Redefinir senha',
      'Você receberá um e-mail com o link seguro para redefinir sua senha. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar e-mail',
          onPress: async () => {
            try {
              const error = await sendPasswordReset(user?.email);
              if (!error) {
                Alert.alert('E-mail enviado!', 'Verifique sua caixa de entrada e spam para criar a nova senha.');
              } else {
                Alert.alert('Erro', error.message || 'Não foi possível enviar o e-mail.');
              }
            } catch (e) {
              Alert.alert('Erro', e.message || 'Erro ao solicitar redefinição.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Excluir Conta',
      'Tem certeza de que deseja excluir permanentemente sua conta? Esta ação não pode ser desfeita e todas as suas publicações serão removidas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir definitivamente',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseAuth.deleteUser();
              Alert.alert('Conta excluída', 'Sua conta foi encerrada com sucesso.');
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } catch (e) {
              Alert.alert('Erro', e.message || 'Erro ao excluir conta.');
            }
          },
        },
      ]
    );
  };

  const hasLocation = Boolean(profileCity && profileState);
  const locationDisplayText = hasLocation ? `${profileCity}, ${profileState}` : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Cabeçalho do Perfil com Avatar */}
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <TouchableOpacity
          onPress={handlePickAvatar}
          disabled={uploadingAvatar || saving}
          activeOpacity={0.85}
          style={styles.avatarButton}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitial}>{name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            </View>
          )}
          <View style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="camera" size={13} color="#FFFFFF" />
            )}
          </View>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{name || 'Seu Nome'}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Toque na foto para alterar sua imagem de perfil
        </Text>
      </View>

      {/* Seção 1: Dados Pessoais */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados Pessoais</Text>

        <Input
          label="Nome completo"
          placeholder="Ex: Ana Silva"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <Input
          label="E-mail (vinculado à conta)"
          placeholder={user?.email || userProfile?.email}
          value={user?.email || userProfile?.email}
          editable={false}
          style={styles.input}
        />
      </View>

      {/* Seção 2: Localização (Via Mapa Interativo) */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Localização Padrão</Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Defina sua cidade e estado no mapa para personalizar seu radar de busca e avisos próximos.
        </Text>

        {hasLocation ? (
          <View style={[styles.locationDisplayBox, { backgroundColor: isDark ? colors.innerCard : '#F0F9FF', borderColor: isDark ? colors.cardBorder : '#BFDBFE' }]}>
            <View style={styles.locationPinCircle}>
              <MaterialIcons name="place" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>Localização Selecionada:</Text>
              <Text style={[styles.locationValue, { color: colors.primary }]}>{locationDisplayText}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.noLocationBox, { backgroundColor: isDark ? colors.innerCard : '#F8FAFC', borderColor: colors.border }]}>
            <MaterialIcons name="location-off" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={[styles.noLocationText, { color: colors.textMuted }]}>Nenhuma localização selecionada</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.mapLauncherBtn, { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : '#EFF6FF' }]}
          onPress={() => setMapVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="map" size={19} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.mapLauncherBtnText, { color: colors.primary }]}>
            {hasLocation ? 'Alterar localização no mapa' : 'Escolher no mapa'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Seção 3: Contatos e Redes Sociais */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contatos</Text>

        <Input
          label="WhatsApp (com DDD)"
          placeholder="(11) 99999-9999"
          value={formatBrazilianPhone(whatsapp)}
          onChangeText={(text) => setWhatsapp(text.replace(/\D/g, ''))}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Input
          label="Instagram (opcional)"
          placeholder="@seu_perfil"
          value={instagram}
          onChangeText={setInstagram}
          style={styles.input}
        />

        <Input
          label="Facebook (opcional)"
          placeholder="seu_usuario"
          value={facebook}
          onChangeText={setFacebook}
          style={styles.input}
        />
      </View>

      {/* Seção 4: Segurança */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Segurança</Text>
        <TouchableOpacity
          style={[styles.securityButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9', borderColor: colors.border }]}
          onPress={handleChangePassword}
          activeOpacity={0.75}
        >
          <Feather name="lock" size={16} color={colors.primary} style={{ marginRight: 10 }} />
          <Text style={[styles.securityButtonText, { color: colors.text }]}>Redefinir senha de acesso</Text>
          <Feather name="chevron-right" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </View>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Botões de Ação Inferiores */}
      <View style={styles.footerRow}>
        <Button
          title="Cancelar"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.footerBtn}
        />
        <Button
          title={saving ? 'Salvando...' : 'Salvar Alterações'}
          variant="primary"
          onPress={handleSave}
          disabled={saving}
          loading={saving}
          style={[styles.footerBtn, { flex: 1.5 }]}
        />
      </View>

      {/* Bloco de Excluir Conta */}
      <View style={[styles.deleteCard, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
        <Text style={styles.deleteTitle}>Zona de Perigo</Text>
        <Text style={[styles.deleteText, { color: colors.textSecondary }]}>
          Se desejar encerrar sua conta e remover todos os seus dados definitivamente.
        </Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={15} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.deleteBtnText}>Excluir minha conta</Text>
        </TouchableOpacity>
      </View>

      {/* Componente Modal de Mapa (o mesmo utilizado na Home e no Cadastro) */}
      <MapLocationPicker
        visible={mapVisible}
        mode="profile"
        onClose={() => setMapVisible(false)}
        onConfirm={({ address, addressDetails, coordinate }) => {
          const region = String(addressDetails?.state || address?.region || '').trim();
          const stateValue = states.includes(region.toUpperCase())
            ? region.toUpperCase()
            : (normalizedRegionToUf[normalizeRegionName(region)] || region);
          const cityValue =
            addressDetails?.city || address?.city || address?.subregion || address?.district || '';

          setProfileState(stateValue);
          setProfileCity(cityValue);
          if (coordinate && coordinate.latitude && coordinate.longitude) {
            setProfileCoords(coordinate);
          }
          setMapVisible(false);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  avatarButton: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12.5,
    marginTop: 3,
    textAlign: 'center',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  locationDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  locationPinCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 14.5,
    fontWeight: '800',
    marginTop: 1,
  },
  noLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  noLocationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  mapLauncherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  mapLauncherBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  footerBtn: {
    flex: 1,
  },
  deleteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  deleteTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 4,
  },
  deleteText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default EditProfileScreen;
