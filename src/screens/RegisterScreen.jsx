import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import MapLocationPicker from '../components/MapLocationPicker';
import { states } from '../lib/br-locations';

const regionToUf = {
  Acre: 'AC', Alagoas: 'AL', Amapá: 'AP', Amazonas: 'AM', Bahia: 'BA', Ceará: 'CE',
  'Distrito Federal': 'DF', 'Espírito Santo': 'ES', Goiás: 'GO', Maranhão: 'MA',
  'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG', Pará: 'PA',
  Paraíba: 'PB', Paraná: 'PR', Pernambuco: 'PE', Piauí: 'PI',
  'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS',
  Rondônia: 'RO', Roraima: 'RR', 'Santa Catarina': 'SC', 'São Paulo': 'SP',
  Sergipe: 'SE', Tocantins: 'TO',
};

const normalizeRegionName = (value) => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const normalizedRegionToUf = Object.fromEntries(Object.entries(regionToUf).map(([name, uf]) => [normalizeRegionName(name), uf]));

const formatBrazilianPhone = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);

  if (!digits) return '';

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const RegisterScreen = ({ navigation }) => {
  const { signUp, confirmSignUp, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  // Localização via mapa
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedAddressText, setSelectedAddressText] = useState('');
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingSignupData, setPendingSignupData] = useState(null);
  const isBusy = loading || isSubmitting;

  const handleMapSelectLocation = (locationData) => {
    if (!locationData) return;
    const resolvedState = locationData.state || '';
    const resolvedCity = locationData.city || '';
    const resolvedAddress = locationData.address || locationData.fullAddress || '';

    setSelectedState(resolvedState);
    setSelectedCity(resolvedCity);
    setSelectedAddressText(resolvedAddress);
    if (locationData.coordinate) {
      setSelectedCoordinate(locationData.coordinate);
    }
    setErrors(prev => ({ ...prev, location: null, city: null }));
    setMapModalVisible(false);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }
    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }
    if (!whatsapp.trim()) {
      newErrors.whatsapp = 'WhatsApp é obrigatório';
    } else if (!/^\d{10,15}$/.test(whatsapp.replace(/\D/g, ''))) {
      newErrors.whatsapp = 'WhatsApp inválido';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Senhas não conferem';
    }
    if (!selectedState || !selectedCity) {
      newErrors.city = 'Escolha sua localização no mapa';
      newErrors.location = 'Escolha sua localização no mapa';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (pendingVerification) {
      if (!verificationCode.trim()) {
        Alert.alert('Código necessário', 'Informe o código enviado para o WhatsApp.');
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        await confirmSignUp({
          email,
          password,
          name,
          city: selectedCity,
          state: selectedState,
          whatsapp,
          verificationCode,
        });
        Alert.alert('Conta criada', 'Sua conta foi criada com sucesso. Faça login para continuar.');
        setPendingVerification(false);
        setVerificationCode('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setWhatsapp('');
        setName('');
        setSelectedState('');
        setSelectedCity('');
        setSelectedAddressText('');
        setSelectedCoordinate(null);
      } catch (error) {
        Alert.alert('Erro de Cadastro', error?.message || 'Falha ao confirmar o código.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!validateForm()) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await signUp(email, password, name, selectedCity, selectedState, whatsapp);
      if (result?.pendingVerification) {
        setPendingVerification(true);
        setPendingSignupData(result);
        if (result?.devCode) {
          Alert.alert(
            'Código de Confirmação',
            `Código de verificação para testes: ${result.devCode}\n\n(Aviso Twilio Sandbox: para o WhatsApp ser entregue em outros números, eles precisam entrar no sandbox da Twilio).`
          );
        } else {
          Alert.alert('Código enviado', `Enviamos um código para o WhatsApp ${whatsapp}. Informe-o abaixo para concluir o cadastro.`);
        }
      }
    } catch (error) {
      Alert.alert('Erro de Cadastro', error?.message || 'Falha ao criar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.bgFull}>
      <ScrollView contentContainerStyle={styles.centeredScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.circularLogoContainer}>
          <Image source={require('../assets/logo_wefind.png')} style={styles.circularLogo} resizeMode="contain" />
        </View>
        <View style={{ alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>Criar sua conta</Text>
          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>Junte-se à nossa comunidade</Text>
        </View>
        <View style={styles.formBox}>
          <Input label="Nome Completo" placeholder="Seu Nome" value={name} onChangeText={setName} error={errors.name} style={styles.input} inputStyle={styles.inputField} />

          <View style={styles.locationSection}>
            <Text style={styles.label}>Sua Localização *</Text>
            <TouchableOpacity style={styles.mapPickerButton} onPress={() => setMapModalVisible(true)} activeOpacity={0.8}>
              <MaterialIcons name="map" size={20} color="#2563EB" />
              <Text style={styles.mapPickerButtonText}>
                {selectedCity ? '🗺️ Alterar no mapa' : '🗺️ Escolher localização no mapa'}
              </Text>
            </TouchableOpacity>

            {selectedCity ? (
              <View style={styles.selectedLocationCard}>
                <Text style={styles.selectedLocationText}>📍 {selectedCity}, {selectedState}</Text>
                {selectedAddressText ? <Text style={styles.selectedAddressSubtext} numberOfLines={2}>{selectedAddressText}</Text> : null}
              </View>
            ) : null}

            {errors.city ? <Text style={styles.error}>{errors.city}</Text> : null}
            <Text style={styles.locationHelpText}>Selecione o ponto no mapa para definir automaticamente sua cidade e estado.</Text>
          </View>

          <Input label="E-mail" placeholder="seu@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" error={errors.email} style={styles.input} inputStyle={styles.inputField} />
          <Input label="WhatsApp (com DDD)" placeholder="(11) 99999-9999" value={formatBrazilianPhone(whatsapp)} onChangeText={text => setWhatsapp(text.replace(/\D/g, ''))} keyboardType="phone-pad" error={errors.phone} style={styles.input} inputStyle={styles.inputField} />
          <Input label="Senha" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry={true} error={errors.password} style={styles.input} inputStyle={styles.inputField} />
          <Input label="Confirmar Senha" placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={true} error={errors.confirmPassword} style={styles.input} inputStyle={styles.inputField} />
          
          {pendingVerification ? (
            <Input label="Código de verificação" placeholder="123456" value={verificationCode} onChangeText={setVerificationCode} keyboardType="number-pad" style={styles.input} inputStyle={styles.inputField} />
          ) : null}

          <Button
            title={isSubmitting ? 'Processando...' : pendingVerification ? 'Confirmar código' : 'Cadastrar'}
            onPress={handleRegister}
            disabled={isSubmitting}
            loading={isSubmitting}
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
          />
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Já tem conta? </Text>
          <Text style={styles.createAccountText} onPress={() => navigation.navigate('Login')}>Fazer login</Text>
        </View>
      </ScrollView>

      <MapLocationPicker
        visible={mapModalVisible}
        mode="profile"
        onSelectLocation={handleMapSelectLocation}
        onClose={() => setMapModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  locationSection: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 6 },
  mapPickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#DBEAFE', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, gap: 8, marginBottom: 6 },
  mapPickerButtonText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
  selectedLocationCard: { backgroundColor: '#E5F6ED', borderWidth: 1, borderColor: '#2E9B63', borderRadius: 8, padding: 8, marginTop: 2, marginBottom: 4 },
  selectedLocationText: { color: '#217A4C', fontSize: 14, fontWeight: '700' },
  selectedAddressSubtext: { color: '#2E9B63', fontSize: 12, marginTop: 2, opacity: 0.9 },
  locationHelpText: { color: '#64748B', fontSize: 12, lineHeight: 16, marginTop: 2 },
  error: { color: '#D64545', fontSize: 13, marginTop: 2 },
  bgFull: { flex: 1, backgroundColor: '#F8FAFB' },
  centeredScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', minHeight: '100%', paddingVertical: 4, backgroundColor: '#F8FAFB' },
  circularLogoContainer: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFFFFF', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3.5, borderColor: '#EFF6FF', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 4, marginBottom: 4 },
  circularLogo: { width: '100%', height: '100%' },
  formBox: { width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 10, marginTop: 0, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, alignSelf: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  input: { marginBottom: 8 },
  inputField: { backgroundColor: '#F8FAFC', borderRadius: 10, borderColor: '#E2E8F0', borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  loginButton: { marginTop: 8, backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 10, marginBottom: 2 },
  loginButtonText: { fontWeight: 'bold', fontSize: 17, letterSpacing: 0.5, color: '#FFFFFF' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  footerText: { color: '#64748B', fontSize: 15 },
  createAccountText: { color: '#2563EB', fontWeight: 'bold', fontSize: 15, textDecorationLine: 'underline' },
});

export default RegisterScreen;
