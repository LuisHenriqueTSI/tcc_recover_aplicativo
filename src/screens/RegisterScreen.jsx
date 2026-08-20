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
        <Image source={require('../assets/logo_recover.png')} style={styles.logoImg} resizeMode="contain" />
        <View style={{ alignItems: 'center', marginBottom: 8, marginTop: -8 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#4F46E5', marginBottom: 2 }}>Criar conta</Text>
          <Text style={{ fontSize: 15, color: '#6B7280', textAlign: 'center' }}>Junte-se à nossa comunidade</Text>
        </View>
        <View style={styles.formBox}>
          <Input
            label="Nome Completo"
            placeholder="Seu Nome"
            value={name}
            onChangeText={setName}
            error={errors.name}
            style={styles.input}
            inputStyle={styles.inputField}
          />

          {/* Seção de Localização com Mapa */}
          <View style={styles.locationSection}>
            <Text style={styles.label}>Sua Localização *</Text>
            
            <TouchableOpacity
              style={styles.mapPickerButton}
              onPress={() => setMapModalVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="map" size={20} color="#4F46E5" />
              <Text style={styles.mapPickerButtonText}>
                {selectedCity && selectedState ? '📍 Alterar localização no mapa' : '🗺️ Escolher localização no mapa'}
              </Text>
            </TouchableOpacity>

            {(selectedCity || selectedState) ? (
              <View style={styles.selectedLocationCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="place" size={18} color="#16A34A" />
                  <Text style={styles.selectedLocationText}>
                    {[selectedCity, selectedState].filter(Boolean).join(', ')}
                  </Text>
                </View>
                {selectedAddressText ? (
                  <Text style={styles.selectedAddressSubtext} numberOfLines={2}>
                    {selectedAddressText}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.locationHelpText}>
                Toque no botão para definir seu ponto no mapa e preencher sua cidade e estado.
              </Text>
            )}

            {errors.location ? <Text style={styles.error}>{errors.location}</Text> : null}
          </View>

          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={errors.email}
            style={styles.input}
            inputStyle={styles.inputField}
          />
          <Input
            label="WhatsApp"
            placeholder="(11) 99999-9999"
            value={formatBrazilianPhone(whatsapp)}
            onChangeText={text => setWhatsapp(text.replace(/\D/g, ''))}
            keyboardType="phone-pad"
            error={errors.whatsapp}
            style={styles.input}
            inputStyle={styles.inputField}
          />
          <Input
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            error={errors.password}
            style={styles.input}
            inputStyle={styles.inputField}
          />
          <Input
            label="Confirmar Senha"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={true}
            error={errors.confirmPassword}
            style={styles.input}
            inputStyle={styles.inputField}
          />
          {pendingVerification ? (
            <Input
              label="Código de verificação"
              placeholder="123456"
              value={verificationCode}
              onChangeText={text => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              style={styles.input}
              inputStyle={styles.inputField}
            />
          ) : null}
          <Button
            title={isBusy ? 'Processando...' : pendingVerification ? 'Confirmar código' : 'Cadastrar-se'}
            onPress={handleRegister}
            disabled={isBusy}
            loading={isBusy}
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
          />
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Já tem conta? </Text>
          <Text style={styles.createAccountText} onPress={() => navigation.navigate('Login')}>Fazer Login</Text>
        </View>
      </ScrollView>

      {/* Modal do Mapa para Selecionar Localização */}
      <MapLocationPicker
        visible={mapModalVisible}
        initialLocation={selectedCoordinate}
        mode="profile"
        onClose={() => setMapModalVisible(false)}
        onConfirm={({ coordinate, address, addressDetails, addressText }) => {
          setSelectedCoordinate(coordinate);
          const resolvedCity = addressDetails?.city || address?.city || address?.subregion || address?.district || '';
          const rawRegion = String(addressDetails?.state || address?.region || '').trim();
          const normRegion = normalizeRegionName(rawRegion);
          const resolvedState = states.includes(rawRegion.toUpperCase())
            ? rawRegion.toUpperCase()
            : (normalizedRegionToUf[normRegion] || rawRegion);

          setSelectedCity(resolvedCity);
          setSelectedState(resolvedState);
          setSelectedAddressText(addressText || addressDetails?.text || '');
          setErrors(prev => ({ ...prev, location: undefined, selectedCity: undefined, selectedState: undefined }));
          setMapModalVisible(false);
        }}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  label: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '600',
  },
  locationSection: {
    marginBottom: 10,
  },
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#6366F1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 6,
  },
  mapPickerButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedLocationCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  selectedLocationText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedAddressSubtext: {
    color: '#15803D',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.85,
  },
  locationHelpText: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  error: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 2,
  },
  bgFull: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centeredScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    paddingVertical: 4,
    backgroundColor: '#F9FAFB',
  },
  logoImg: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  formBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignSelf: 'center',
  },
  input: {
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 10,
    marginBottom: 2,
  },
  loginButtonText: {
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 15,
  },
  createAccountText: {
    color: '#4F46E5',
    fontWeight: 'bold',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;
