import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const MapScreenWeb = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Mapa Interativo</Text>
    <Text style={styles.text}>O mapa com geolocalização e rotas está disponível no aplicativo móvel (Android / iOS).</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MapScreenWeb;
