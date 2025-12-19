import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import Card from '../components/Card';

const AjudaSuporteScreen = () => {
  return (
    <View style={styles.container}>
      <Card style={styles.placeholderCard}>
        <Text style={styles.title}>Ajuda e Suporte</Text>
        <Text style={styles.description}>
          Precisa de ajuda? Entre em contato com nosso suporte ou consulte a documentação.
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:suporte@recoverapp.com')} style={styles.linkButton}>
          <Text style={styles.linkText}>Enviar e-mail para suporte</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  placeholderCard: {
    margin: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  linkButton: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  linkText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default AjudaSuporteScreen;
