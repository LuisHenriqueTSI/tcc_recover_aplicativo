import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

const LoginScreen = ({ navigation }) => {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      const result = await signIn(email, password);
      // Se o usuário não confirmou o email, Supabase retorna erro
      if (result?.user && !result?.user.confirmed_at && !result?.user.email_confirmed_at && !result?.session) {
        Alert.alert(
          'Confirmação necessária',
          'Você precisa confirmar seu e-mail antes de fazer login. Verifique sua caixa de entrada.',
        );
        return;
      }
      // NÃO navegue manualmente após login. O RootNavigator já faz o redirecionamento automático.
      // Removido navigation.reset()
    } catch (error) {
      if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
        Alert.alert('Confirmação necessária', 'Você precisa confirmar seu e-mail antes de fazer login. Verifique sua caixa de entrada.');
      } else {
        Alert.alert('Erro de Login', error.message || 'Falha ao fazer login');
      }
    }
  };


  return (
    <View style={styles.bgFull}>
      <ScrollView contentContainerStyle={styles.centeredScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.circularLogoContainer}>
          <Image source={require('../assets/logo_wefind.png')} style={styles.circularLogo} resizeMode="contain" />
        </View>
        <View style={{ alignItems: 'center', marginBottom: 12, marginTop: 4 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>Bem-vindo de volta</Text>
          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>Acesse sua conta para continuar</Text>
        </View>
        <View style={styles.formBox}>
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
            label="Senha"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            error={errors.password}
            style={styles.input}
            inputStyle={styles.inputField}
          />
          <Text style={styles.forgotPassword} onPress={() => navigation.navigate('EsqueciSenha')}>Esqueceu sua senha?</Text>
          <Button
            title={loading ? 'Entrar...' : 'Entrar'}
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
          />
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Não tem conta? </Text>
          <Text style={styles.createAccountText} onPress={() => navigation.navigate('Register')}>Criar conta</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  bgFull: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  centeredScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    paddingVertical: 32,
    backgroundColor: '#F8FAFB',
  },
  circularLogoContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3.5,
    borderColor: '#EFF6FF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 8,
  },
  circularLogo: {
    width: '100%',
    height: '100%',
  },
  formBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    marginBottom: 16,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  loginButton: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 4,
  },
  loginButtonText: {
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
  forgotPassword: {
    color: '#2563EB',
    fontSize: 14,
    marginBottom: 8,
    marginTop: -8,
    textAlign: 'left',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
  },
  createAccountText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
