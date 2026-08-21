import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

const faqs = [
  { question: 'Como publico um animal perdido?', answer: 'Na tela inicial, toque em “Publicar” e preencha as informações do animal, local e data. Adicione uma foto nítida para aumentar as chances de identificação.' },
  { question: 'Como encontro minhas publicações?', answer: 'Abra seu perfil e escolha “Minhas Publicações”. Lá você acompanha o status e pode renovar uma publicação quando ela estiver inativa.' },
  { question: 'Como atualizo meus dados?', answer: 'Acesse Perfil > Configurações > Editar perfil. Suas alterações são salvas diretamente na sua conta.' },
  { question: 'Como denuncio um conteúdo?', answer: 'Abra os detalhes da publicação e use a opção de denúncia. Nossa equipe analisará o caso com cuidado.' },
];

const AjudaSuporteScreen = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const openContact = (url) => Linking.openURL(url);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Perguntas frequentes</Text>
      <View style={styles.faqPanel}>
        {faqs.map((faq, index) => {
          const isOpen = openFaq === index;
          return (
            <View key={faq.question}>
              <TouchableOpacity style={styles.faqRow} onPress={() => setOpenFaq(isOpen ? null : index)} activeOpacity={0.7}>
                <Text style={styles.question}>{faq.question}</Text>
                <Feather name={isOpen ? 'minus' : 'plus'} size={19} color="#2563EB" />
              </TouchableOpacity>
              {isOpen ? <Text style={styles.answer}>{faq.answer}</Text> : null}
              {index < faqs.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Fale com a equipe</Text>
      <View style={styles.contactRow}>
        <TouchableOpacity style={styles.contactCard} onPress={() => openContact('mailto:suporte@wefindapp.com')} activeOpacity={0.8}>
          <View style={[styles.contactIcon, { backgroundColor: '#EFF6FF' }]}><Feather name="mail" size={21} color="#2563EB" /></View>
          <Text style={styles.contactTitle}>E-mail</Text>
          <Text style={styles.contactText}>Enviar uma mensagem</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactCard} onPress={() => openContact('https://wa.me/5500000000000')} activeOpacity={0.8}>
          <View style={[styles.contactIcon, { backgroundColor: '#DCFCE7' }]}><Feather name="message-circle" size={21} color="#16A34A" /></View>
          <Text style={styles.contactTitle}>WhatsApp</Text>
          <Text style={styles.contactText}>Falar com o suporte</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.note}>Respondemos normalmente em até 1 dia útil.</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7FB' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: '#27272A', fontSize: 17, fontWeight: '800', marginBottom: 10 },
  faqPanel: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E4E4E7', marginBottom: 25 },
  faqRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  question: { color: '#27272A', fontSize: 14, fontWeight: '700', flex: 1, lineHeight: 20 },
  answer: { color: '#71717A', fontSize: 13, lineHeight: 20, paddingRight: 20, paddingBottom: 15 },
  divider: { height: 1, backgroundColor: '#F0F0F2' },
  contactRow: { flexDirection: 'row', gap: 12 },
  contactCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E4E4E7', padding: 15, flex: 1, minHeight: 136 },
  contactIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  contactTitle: { color: '#27272A', fontWeight: '800', fontSize: 14 },
  contactText: { color: '#71717A', fontSize: 12, marginTop: 5, lineHeight: 17 },
  note: { color: '#A1A1AA', textAlign: 'center', fontSize: 12, marginTop: 18 },
});

export default AjudaSuporteScreen;
