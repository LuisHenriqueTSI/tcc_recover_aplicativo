import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  Keyboard,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import COLORS from '../constants/theme';
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

export const calculatePasswordStrength = (pwd = '') => {
  const hasMinLength = pwd.length >= 8;
  const hasUpperCase = /[A-Z]/.test(pwd);
  const hasLowerCase = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);

  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (hasMinLength) score += 1;
  if (hasUpperCase && hasLowerCase) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial) score += 1;

  let label = 'Muito fraca';
  let color = '#EF4444';
  let level = 1;

  if (score <= 1) {
    label = 'Muito fraca';
    color = '#EF4444';
    level = 1;
  } else if (score === 2) {
    label = 'Fraca';
    color = '#F97316';
    level = 2;
  } else if (score === 3) {
    label = 'Boa';
    color = '#F59E0B';
    level = 3;
  } else if (score >= 4) {
    label = 'Forte e segura 🛡️';
    color = '#10B981';
    level = 4;
  }

  const isValid = hasMinLength && (hasUpperCase || hasLowerCase) && hasNumber;

  return {
    score,
    level,
    label,
    color,
    isValid,
    rules: {
      hasMinLength,
      hasLetters: hasUpperCase && hasLowerCase,
      hasNumber,
      hasSpecial,
    },
  };
};

const RegisterScreen = ({ navigation }) => {
  const { signUp, confirmSignUp, loading, user } = useAuth();
  const { colors, isDark } = useTheme();

  // Captura o botão físico de voltar do Android e redireciona para a tela inicial
  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: user ? 'MainApp' : 'PublicApp' }],
          });
        }
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
      return () => subscription.remove();
    }, [navigation, user])
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingSignupData, setPendingSignupData] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const scrollRef = useRef(null);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
    } else if (password.length < 8) {
      newErrors.password = 'A senha deve ter no mínimo 8 caracteres';
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'A senha deve conter pelo menos um número';
    } else if (!/[A-Za-z]/.test(password)) {
      newErrors.password = 'A senha deve conter pelo menos uma letra';
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
          whatsapp_notifications_enabled: whatsappConsent,
          verificationCode: verificationCode.trim(),
        });
        Alert.alert('Conta criada com sucesso! 🎉', 'Seja bem-vindo ao WeFIND. Faça login para começar.');
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
        whatsapp.replace(/\D/g, ''),
        whatsappConsent
      );
      if (result?.pendingVerification) {
        setPendingVerification(true);
        setPendingSignupData(result);
        setResendCooldown(30);
        setTimeout(() => {
          scrollRef.current?.scrollToEnd?.({ animated: true });
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

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isSubmitting) return;

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      const result = await signUp(
        email.trim(),
        password,
        name.trim(),
        '',
        '',
        whatsapp.replace(/\D/g, ''),
        whatsappConsent
      );
      setResendCooldown(45);
      if (result?.devCode) {
        Alert.alert(
          'Novo Código Gerado',
          `Novo código de verificação para testes: ${result.devCode}`
        );
      } else {
        Alert.alert('Código Reenviado', `Um novo código foi enviado para o WhatsApp ${formatBrazilianPhone(whatsapp)}.`);
      }
    } catch (error) {
      Alert.alert('Erro ao Reenviar', error?.message || 'Não foi possível reenviar o código agora.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelVerification = () => {
    setPendingVerification(false);
    setVerificationCode('');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
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


        {/* Top App Logo */}
        <View style={styles.brandHeroContainer}>
          <View style={[styles.logoSquircle, { backgroundColor: colors.card, borderColor: isDark ? colors.cardBorder : COLORS.primaryBorder }]}>
            <Image
              source={require('../assets/logo_wefind.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={styles.headerBox}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Criar nova conta</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Preencha seus dados para começar no WeFIND
          </Text>
        </View>

        <View style={[styles.formBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Input
            label="Nome Completo"
            placeholder="Ex: Maria dos Santos"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
            }}
            error={errors.name}
            editable={!pendingVerification}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: colors.text }]}
            returnKeyType="next"
          />

          <Input
            label="E-mail"
            placeholder="seu@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!pendingVerification}
            error={errors.email}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: colors.text }]}
            returnKeyType="next"
          />

          <Input
            label="WhatsApp (com DDD)"
            placeholder="(11) 99999-9999"
            value={formatBrazilianPhone(whatsapp)}
            onChangeText={(text) => {
              setWhatsapp(text.replace(/\D/g, ''));
              if (errors.whatsapp) setErrors((prev) => ({ ...prev, whatsapp: null }));
            }}
            keyboardType="phone-pad"
            editable={!pendingVerification}
            error={errors.whatsapp || errors.phone}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: colors.text }]}
            returnKeyType="next"
          />

          <Input
            label="Senha"
            placeholder="Mínimo 8 caracteres com letras e números"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
            }}
            secureTextEntry={true}
            editable={!pendingVerification}
            error={errors.password}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: colors.text }]}
            returnKeyType="next"
          />

          {/* INDICADOR DE FORÇA DA SENHA COMPACTO EM TEMPO REAL */}
          {password.length > 0 && !pendingVerification && (() => {
            const pwdStrength = calculatePasswordStrength(password);
            return (
              <View style={[styles.passwordStrengthBox, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#F8FAFC', borderColor: colors.cardBorder }]}>
                <View style={styles.strengthHeaderRow}>
                  <Text style={[styles.strengthLabelTitle, { color: colors.textSecondary }]}>
                    Força: <Text style={{ color: pwdStrength.color, fontWeight: '800' }}>{pwdStrength.label}</Text>
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.textMuted }}>
                    {pwdStrength.isValid ? 'Requisitos atendidos ✅' : 'mín. 8 chars, letras e números'}
                  </Text>
                </View>

                {/* Barra de 4 segmentos */}
                <View style={styles.strengthBarRow}>
                  {[1, 2, 3, 4].map((seg) => (
                    <View
                      key={seg}
                      style={[
                        styles.strengthBarSegment,
                        {
                          backgroundColor: seg <= pwdStrength.level ? pwdStrength.color : (isDark ? '#334155' : '#E2E8F0'),
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            );
          })()}

          <Input
            label="Confirmar Senha"
            placeholder="Repita sua senha"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
            }}
            secureTextEntry={true}
            editable={!pendingVerification}
            error={errors.confirmPassword}
            style={styles.input}
            inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0', color: colors.text }]}
            returnKeyType="done"
          />

          {/* Feedback de Confirmação de Senha em Tempo Real */}
          {confirmPassword.length > 0 && !pendingVerification && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -4, marginBottom: 8, paddingHorizontal: 2 }}>
              <MaterialIcons
                name={password === confirmPassword ? 'check-circle' : 'cancel'}
                size={13}
                color={password === confirmPassword ? '#10B981' : '#EF4444'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '700',
                  color: password === confirmPassword ? (isDark ? '#34D399' : '#059669') : '#EF4444',
                }}
              >
                {password === confirmPassword ? 'As senhas conferem!' : 'As senhas não conferem'}
              </Text>
            </View>
          )}

          {/* Checkbox de Consentimento de Notificações por WhatsApp */}
          {!pendingVerification && (
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setWhatsappConsent(prev => !prev)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }, whatsappConsent && [styles.checkboxChecked, { backgroundColor: colors.primary, borderColor: colors.primary }]]}>
                {whatsappConsent ? <MaterialIcons name="check" size={15} color="#FFFFFF" /> : null}
              </View>
              <Text style={[styles.consentText, { color: colors.textSecondary }]}>
                Desejo receber avisos em tempo real de animais encontrados no meu WhatsApp
              </Text>
            </TouchableOpacity>
          )}

          {pendingVerification ? (
            <View style={[styles.verificationBox, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFF7ED', borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDBA74' }]}>
              <View style={styles.verificationHeader}>
                <Text style={[styles.verificationTitle, { color: isDark ? '#FBBF24' : '#C2410C' }]}>🔐 Validação por WhatsApp</Text>
                <TouchableOpacity onPress={handleCancelVerification} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.editDataText, { color: colors.primary }]}>Editar dados</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.verificationDesc, { color: isDark ? '#FDE68A' : '#7C2D12' }]}>
                Enviamos um código de segurança de 6 dígitos para o WhatsApp <Text style={{ fontWeight: '800' }}>{formatBrazilianPhone(whatsapp)}</Text>:
              </Text>

              <Input
                placeholder="000000"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                style={{ marginVertical: 8 }}
                inputStyle={[styles.inputField, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderColor: isDark ? '#334155' : '#CBD5E1', color: colors.text, textAlign: 'center', fontSize: 22, letterSpacing: 8, fontWeight: '800' }]}
                returnKeyType="done"
              />

              <TouchableOpacity
                onPress={handleResendCode}
                disabled={resendCooldown > 0 || isSubmitting}
                style={styles.resendBtn}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendBtnText, { color: resendCooldown > 0 ? colors.textMuted : colors.primary }]}>
                  {resendCooldown > 0 ? `Reenviar código em ${resendCooldown}s` : 'Reenviar código por WhatsApp'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={isSubmitting}
            style={[styles.registerButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.registerButtonText}>
              {isSubmitting ? 'Processando...' : (pendingVerification ? 'Confirmar e Concluir' : 'Criar Minha Conta')}
            </Text>
            {!isSubmitting && <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />}
          </TouchableOpacity>
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Já possui uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.75}>
            <Text style={[styles.loginLinkText, { color: colors.primary }]}>Acessar conta</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHeroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 0,
  },
  logoSquircle: {
    width: 90,
    height: 90,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.35 }],
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  formBox: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
  },
  input: {
    marginBottom: 8,
  },
  inputField: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    height: 44,
  },
  passwordStrengthBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    marginBottom: 8,
    marginTop: -2,
  },
  strengthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  strengthLabelTitle: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  strengthBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  strengthBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderWidth: 0,
  },
  consentText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 15,
  },
  verificationBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginVertical: 8,
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  verificationTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  editDataText: {
    fontSize: 12,
    fontWeight: '700',
  },
  verificationDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  resendBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    paddingVertical: 11,
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  registerButtonText: {
    fontWeight: '800',
    fontSize: 14.5,
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loginLinkText: {
    fontWeight: '800',
    fontSize: 13,
  },
});

export default RegisterScreen;
