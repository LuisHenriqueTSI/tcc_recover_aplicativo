import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

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

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingSignupData, setPendingSignupData] = useState(null);

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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const scrollRef = React.useRef(null);

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
          city: '',
          state: '',
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
        '',
        '',
        whatsapp.replace(/\D/g, '')
      );
      if (result?.pendingVerification) {
        setPendingVerification(true);
        setPendingSignupData(result);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd?.(true);
        }, 250);
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
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: pendingVerification ? 140 : 60 }
        ]}
        enableOnAndroid={true}
        enableResetScrollToCoords={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraScrollHeight={Platform.OS === 'ios' ? 80 : 120}
        extraHeight={Platform.OS === 'ios' ? 120 : 160}
        keyboardOpeningTime={0}
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
            returnKeyType="next"
          />

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
                onFocus={() => {
                  scrollRef.current?.scrollToEnd?.(true);
                }}
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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularLogoContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
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
    marginBottom: 14,
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
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    marginBottom: 12,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  verificationBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
    marginTop: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
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
    marginTop: 20,
    marginBottom: 14,
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
