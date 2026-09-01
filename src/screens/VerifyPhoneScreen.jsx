import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Input from '../components/Input';
import { WeFindText } from '../components/WeFindBrand';

const formatBrazilianPhone = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const maskPhone = (digits = '') => {
  const formatted = formatBrazilianPhone(digits);
  return formatted.replace(/(\(\d{2}\) \d)(\d{4,5})(-)(\d{4})/, '$1****$3$4');
};

const VerifyPhoneScreen = ({ navigation, route }) => {
  const {
    email = '',
    password = '',
    name = '',
    whatsapp = '',
    whatsappConsent = true,
    devCode = null,
  } = route.params || {};

  const { confirmSignUp, signUp } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(45);
  const [errorMsg, setErrorMsg] = useState('');
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (devCode) {
      setErrorMsg(`[DEV] Codigo de teste: ${devCode}`);
    }
  }, [devCode]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleEditData = () => {
    navigation.navigate('Register', {
      prefill: { name, email, password, whatsapp, whatsappConsent },
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        handleEditData();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [name, email, password, whatsapp, whatsappConsent])
  );

  const handleConfirm = async () => {
    Keyboard.dismiss();
    setCodeError('');
    setErrorMsg('');

    if (!verificationCode.trim()) {
      setCodeError('Informe o codigo de 6 digitos');
      return;
    }
    if (verificationCode.trim().length < 6) {
      setCodeError('O codigo deve ter 6 digitos');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await confirmSignUp({
        email,
        password,
        name,
        city: '',
        state: '',
        whatsapp,
        whatsapp_notifications_enabled: whatsappConsent,
        verificationCode: verificationCode.trim(),
      });

      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Login',
            params: { successMessage: 'Conta criada com sucesso! Faca login para comecar.' },
          },
        ],
      });
    } catch (error) {
      setCodeError(error?.message || 'Codigo invalido ou expirado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    Keyboard.dismiss();
    setErrorMsg('');
    setCodeError('');
    setIsSubmitting(true);

    try {
      const result = await signUp(email, password, name, '', '', whatsapp, whatsappConsent);
      setResendCooldown(45);
      setVerificationCode('');
      if (result?.devCode) {
        setErrorMsg(`[DEV] Novo codigo de teste: ${result.devCode}`);
      } else {
        setErrorMsg(`Novo codigo enviado para ${formatBrazilianPhone(whatsapp)}`);
      }
    } catch (error) {
      setErrorMsg(error?.message || 'Nao foi possivel reenviar agora. Tente em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraScrollHeight={60}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleEditData}
            style={[styles.backBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="chevron-left" size={26} color={colors.text} />
          </TouchableOpacity>
          <WeFindText size={18} uppercase style={{ letterSpacing: -0.3 }} />
          <View style={{ width: 40 }} />
        </View>

        {/* Icone */}
        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
          <MaterialIcons name="chat" size={38} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Verificacao por WhatsApp</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enviamos um codigo de <Text style={{ fontWeight: '800' }}>6 digitos</Text> para
        </Text>

        <View style={[styles.phoneBadge, { backgroundColor: isDark ? '#0F172A' : '#F0FDF4', borderColor: isDark ? '#334155' : '#86EFAC' }]}>
          <MaterialIcons name="whatsapp" size={18} color="#25D366" />
          <Text style={[styles.phoneText, { color: isDark ? '#34D399' : '#166534' }]}>
            {maskPhone(whatsapp)}
          </Text>
        </View>

        {/* Card OTP */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Digite o codigo recebido:
          </Text>

          <Input
            placeholder="000000"
            value={verificationCode}
            onChangeText={(text) => {
              setVerificationCode(text.replace(/\D/g, '').slice(0, 6));
              if (codeError) setCodeError('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
            inputStyle={[
              styles.otpInput,
              {
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderColor: codeError ? '#EF4444' : (isDark ? '#334155' : '#CBD5E1'),
                color: colors.text,
              },
            ]}
          />

          {codeError ? (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{codeError}</Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View style={[styles.infoRow, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#F0FDF4' }]}>
              <MaterialIcons name="info-outline" size={14} color={isDark ? '#34D399' : '#15803D'} />
              <Text style={[styles.infoText, { color: isDark ? '#34D399' : '#15803D' }]}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Botao confirmar */}
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }, isSubmitting && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.confirmBtnText}>Verificando...</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="verified" size={20} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Confirmar Codigo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Reenviar */}
          <TouchableOpacity
            onPress={handleResend}
            disabled={resendCooldown > 0 || isSubmitting}
            style={styles.resendBtn}
            activeOpacity={0.7}
          >
            <Feather
              name="refresh-cw"
              size={14}
              color={resendCooldown > 0 ? colors.textMuted : colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.resendText, { color: resendCooldown > 0 ? colors.textMuted : colors.primary }]}>
              {resendCooldown > 0
                ? `Reenviar codigo em ${resendCooldown}s`
                : 'Reenviar codigo por WhatsApp'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Editar dados */}
        <TouchableOpacity onPress={handleEditData} style={styles.editDataBtn} activeOpacity={0.7}>
          <MaterialIcons name="edit" size={15} color={colors.textSecondary} style={{ marginRight: 5 }} />
          <Text style={[styles.editDataText, { color: colors.textSecondary }]}>
            Numero errado?{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Editar dados do cadastro</Text>
          </Text>
        </TouchableOpacity>

        <Text style={[styles.helpText, { color: colors.textMuted }]}>
          Nao recebeu o codigo? Aguarde alguns instantes e tente reenviar. Verifique se o numero esta correto.
        </Text>
      </KeyboardAwareScrollView>

      <View style={{ height: Math.max(insets.bottom, 16) }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 32,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 24,
  },
  phoneText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 12,
    fontWeight: '800',
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  btnDisabled: { opacity: 0.7 },
  divider: {
    height: 1,
    marginVertical: 14,
    borderRadius: 1,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '700',
  },
  editDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  editDataText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});

export default VerifyPhoneScreen;
