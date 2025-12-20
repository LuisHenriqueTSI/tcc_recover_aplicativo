import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { sendPasswordReset } from '../services/supabaseAuth';

export default function EsqueciSenhaScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Erro', 'Por favor, informe seu e-mail.');
      return;
    }
    setLoading(true);
    const error = await sendPasswordReset(email);
    setLoading(false);
    if (!error) {
      Alert.alert('Sucesso', 'Verifique seu e-mail para redefinir a senha.');
      navigation.goBack();
    } else {
      Alert.alert('Erro', error.message || 'Não foi possível enviar o e-mail.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redefinir senha</Text>
      <Text style={styles.label}>Digite seu e-mail cadastrado:</Text>
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Enviando...' : 'Enviar e-mail'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 48,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
