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
        <Image source={require('../assets/logo_recover.png')} style={styles.logoImg} resizeMode="contain" />
        <View style={{ alignItems: 'center', marginBottom: 8, marginTop: -8 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#4F46E5', marginBottom: 2 }}>Entrar no aplicativo.</Text>
          <Text style={{ fontSize: 15, color: '#6B7280', textAlign: 'center' }}>Acesse sua conta para continuar</Text>
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
    backgroundColor: '#F9FAFB',
  },
  centeredScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    paddingVertical: 32,
    backgroundColor: '#F9FAFB',
  },
  // header removido
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
    padding: 24,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignSelf: 'center',
  },
  input: {
    marginBottom: 16,
  },
  inputField: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  loginButton: {
    marginTop: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 4,
  },
  loginButtonText: {
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
    color: '#fff',
  },
  forgotPassword: {
    color: '#4F46E5',
    fontSize: 14,
    marginBottom: 8,
    marginTop: -8,
    textAlign: 'left',
    textDecorationLine: 'underline',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
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

export default LoginScreen;
