import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { getStates, getCitiesByState } from '../services/location';
import { Picker } from '@react-native-picker/picker';

const RegisterScreen = ({ navigation }) => {
  const { signUp, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [errors, setErrors] = useState({});

  // Validação simples: ambos selecionados
  const isValidLocation = () => selectedState && selectedCity;
    useEffect(() => {
      getStates().then(setStates).catch(() => setStates([]));
    }, []);

    useEffect(() => {
      if (selectedState) {
        getCitiesByState(selectedState).then(setCities).catch(() => setCities([]));
      } else {
        setCities([]);
        setSelectedCity('');
      }
    }, [selectedState]);
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
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Senhas não conferem';
    }
    if (!selectedState) {
      newErrors.selectedState = 'Selecione o estado';
    }
    if (!selectedCity) {
      newErrors.selectedCity = 'Selecione a cidade';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      const location = `${selectedCity}, ${selectedState}`;
      await signUp(email, password, name, location);
      Alert.alert(
        'Sucesso',
        'Conta criada! Por favor, confirme seu email e faça login.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro de Cadastro', error.message || 'Falha ao criar conta');
    }
  };

  return (
    <View style={styles.bgFull}>
      <ScrollView contentContainerStyle={styles.centeredScroll} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/logo_recover.png')} style={styles.logoImg} resizeMode="contain" />
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
          <View style={styles.inputRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Estado</Text>
              <View style={styles.pickerBox}>
                <Picker
                  selectedValue={selectedState}
                  onValueChange={value => setSelectedState(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecione" value="" />
                  {states.map(state => (
                    <Picker.Item key={state.sigla} label={`${state.nome} (${state.sigla})`} value={state.sigla} />
                  ))}
                </Picker>
              </View>
              {errors.selectedState ? <Text style={styles.error}>{errors.selectedState}</Text> : null}
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.label}>Cidade</Text>
              <View style={styles.pickerBox}>
                <Picker
                  selectedValue={selectedCity}
                  onValueChange={value => setSelectedCity(value)}
                  style={styles.picker}
                  enabled={!!selectedState}
                >
                  <Picker.Item label="Selecione" value="" />
                  {cities.map(city => (
                    <Picker.Item key={city.id} label={city.nome} value={city.nome} />
                  ))}
                </Picker>
              </View>
              {errors.selectedCity ? <Text style={styles.error}>{errors.selectedCity}</Text> : null}
            </View>
          </View>
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
          <Button
            title={loading ? 'Criando conta...' : 'Cadastrar-se'}
            onPress={handleRegister}
            disabled={loading}
            loading={loading}
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
          />
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Já tem conta? </Text>
          <Text style={styles.createAccountText} onPress={() => navigation.navigate('Login')}>Fazer Login</Text>
        </View>
      </ScrollView>
    </View>
  );
};


// ...existing code...

const styles = StyleSheet.create({
  label: {
    fontSize: 17,
    color: '#444',
    marginBottom: 4,
    fontWeight: '600',
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 2,
  },
  picker: {
    width: '100%',
    height: 54,
    color: '#222',
    backgroundColor: 'transparent',
    fontSize: 16,
    paddingVertical: 8,
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
