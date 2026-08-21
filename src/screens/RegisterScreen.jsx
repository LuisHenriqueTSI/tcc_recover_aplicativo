import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import MapLocationPicker from '../components/MapLocationPicker';

const formatBrazilianPhone = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const RegisterScreen = ({ navigation }) => {
  const { signUp, confirmSignUp, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

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

  const scrollViewRef = useRef(null);

  const handleMapSelectLocation = (data) => {
    if (!data) return;
    const resolvedCity = data.city || data.address?.city || data.addressDetails?.city || '';
    const resolvedState = data.state || data.address?.region || data.addressDetails?.state || '';
    const resolvedAddress = data.addressText || data.address?.fullAddress || data.addressDetails?.text || '';

    setSelectedCity(resolvedCity);
    setSelectedState(resolvedState);
    setSelectedAddressText(resolvedAddress);
    if (data.coordinate) {
      setSelectedCoordinate(data.coordinate);
    }
    setErrors(prev => ({ ...prev, location: null, city: null }));
    setMapModalVisible(false);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!email.trim()) {
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
    Keyboard.dismiss();

    if (pendingVerification) {
      if (!verificationCode.trim()) {
        Alert.alert('Código necessário', 'Informe o código enviado para o WhatsApp.');
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        await confirmSignUp({
          email: email.trim(),
          password,
          name: name.trim(),
          city: selectedCity,
          state: selectedState,
          whatsapp: whatsapp.replace(/\D/g, ''),
          verificationCode: verificationCode.trim(),
        });
        Alert.alert('Conta criada com sucesso!', 'Seja bem-vindo ao WeFIND. Faça login para começar.');
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
        navigation.navigate('Login');
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
      const result = await signUp(
        email.trim(),
        password,
        name.trim(),
        selectedCity,
        selectedState,
        whatsapp.replace(/\D/g, '')
      );
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Circular */}
          <View style={styles.circularLogoContainer}>
            <Image
              source={require('../assets/logo_wefind.png')}
              style={styles.circularLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.headerBox}>
            <Text style={styles.headerTitle}>Criar sua conta</Text>
            <Text style={styles.headerSubtitle}>Junte-se à nossa comunidade</Text>
          </View>

          <View style={styles.formBox}>
            <Input
              label="Nome Completo"
              placeholder="Ex: João da Silva"
              value={name}
              onChangeText={setName}
              error={errors.name}
              style={styles.input}
              inputStyle={styles.inputField}
              autoCapitalize="words"
              returnKeyType="next"
            />

            {/* Seção de Localização */}
            <View style={styles.locationSection}>
              <Text style={styles.label}>Sua Localização *</Text>
              <TouchableOpacity
                style={styles.mapPickerButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setMapModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="map" size={20} color="#2563EB" />
                <Text style={styles.mapPickerButtonText}>
                  {selectedCity ? '🗺️ Alterar localização no mapa' : '🗺️ Escolher localização no mapa'}
                </Text>
              </TouchableOpacity>

              {selectedCity ? (
                <View style={styles.selectedLocationCard}>
                  <Text style={styles.selectedLocationText}>📍 {selectedCity}, {selectedState}</Text>
                  {selectedAddressText ? (
                    <Text style={styles.selectedAddressSubtext} numberOfLines={2}>
                      {selectedAddressText}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {errors.city ? <Text style={styles.error}>{errors.city}</Text> : null}
              <Text style={styles.locationHelpText}>
                Selecione o ponto no mapa para definir automaticamente sua cidade e estado.
              </Text>
            </View>

            <Input
              label="E-mail"
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              style={styles.input}
              inputStyle={styles.inputField}
              returnKeyType="next"
            />

            <Input
              label="WhatsApp (com DDD)"
              placeholder="(11) 99999-9999"
              value={formatBrazilianPhone(whatsapp)}
              onChangeText={text => setWhatsapp(text.replace(/\D/g, ''))}
              keyboardType="phone-pad"
              error={errors.whatsapp || errors.phone}
              style={styles.input}
              inputStyle={styles.inputField}
              returnKeyType="next"
            />

            <Input
              label="Senha"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              error={errors.password}
              style={styles.input}
              inputStyle={styles.inputField}
              returnKeyType="next"
            />

            <Input
              label="Confirmar Senha"
              placeholder="Repita sua senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={true}
              error={errors.confirmPassword}
              style={styles.input}
              inputStyle={styles.inputField}
              returnKeyType="done"
            />

            {pendingVerification ? (
              <View style={styles.verificationBox}>
                <Text style={styles.verificationTitle}>🔐 Verificação por WhatsApp</Text>
                <Text style={styles.verificationDesc}>
                  Digite o código de 6 dígitos que enviamos para o seu WhatsApp:
                </Text>
                <Input
                  label="Código de verificação"
                  placeholder="123456"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  style={styles.input}
                  inputStyle={styles.inputField}
                />
              </View>
            ) : null}

            <Button
              title={isSubmitting ? 'Processando...' : pendingVerification ? 'Confirmar código' : 'Cadastrar'}
              onPress={handleRegister}
              disabled={isSubmitting}
              loading={isSubmitting}
              style={styles.registerButton}
              textStyle={styles.registerButtonText}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={styles.createAccountText}>Fazer login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MapLocationPicker
        visible={mapModalVisible}
        mode="profile"
        onConfirm={handleMapSelectLocation}
        onSelectLocation={handleMapSelectLocation}
        onClose={() => setMapModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
    alignItems: 'center',
  },
  circularLogoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#EFF6FF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 8,
  },
  circularLogo: {
    width: '100%',
    height: '100%',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  formBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationSection: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 5,
  },
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 5,
  },
  mapPickerButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedLocationCard: {
    backgroundColor: '#E5F6ED',
    borderWidth: 1,
    borderColor: '#2E9B63',
    borderRadius: 8,
    padding: 9,
    marginTop: 3,
    marginBottom: 5,
  },
  selectedLocationText: {
    color: '#217A4C',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedAddressSubtext: {
    color: '#2E9B63',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
    opacity: 0.9,
  },
  locationHelpText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  error: {
    color: '#D64545',
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    marginBottom: 10,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  verificationBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C2410C',
    marginBottom: 4,
  },
  verificationDesc: {
    fontSize: 12,
    color: '#7C2D12',
    marginBottom: 6,
    lineHeight: 16,
  },
  registerButton: {
    marginTop: 6,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 2,
  },
  registerButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  createAccountText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;
