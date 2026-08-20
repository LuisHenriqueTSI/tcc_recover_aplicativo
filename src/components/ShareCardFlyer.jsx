import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ShareCardFlyer = React.forwardRef(({ item, imageUrl }, ref) => {
  if (!item) return null;

  const isLost = item.status === 'lost';
  const statusColor = isLost ? '#DC2626' : '#16A34A';

  // Cabeçalho dinâmico por espécie (ex: GATO ENCONTRADO, CACHORRO PERDIDO)
  const speciesRaw = String(item.species || '').trim();
  const getHeaderTitle = () => {
    if (speciesRaw) {
      const upper = speciesRaw.toUpperCase();
      if (upper === 'AVE') {
        return isLost ? 'AVE PERDIDA' : 'AVE ENCONTRADA';
      }
      return isLost ? `${upper} PERDIDO` : `${upper} ENCONTRADO`;
    }
    return isLost ? 'ANIMAL PERDIDO' : 'ANIMAL ENCONTRADO';
  };

  const statusHeaderTitle = getHeaderTitle();
  const locationLabel = isLost ? 'ÚLTIMA VEZ VISTO EM:' : 'LOCAL ONDE FOI ENCONTRADO:';

  // Informações de localização
  const city = item.city || item.extra_fields?.location_details?.city || '';
  const state = item.state || item.extra_fields?.location_details?.state || '';
  const cityState = [city, state].filter(Boolean).join(' - ');
  const street = item.street || item.extra_fields?.location_details?.street || '';
  const houseNumber = item.house_number || item.extra_fields?.location_details?.number || '';
  const neighborhood = item.neighborhood || item.extra_fields?.location_details?.district || '';
  const streetPart = [street, houseNumber].filter(Boolean).join(', ');
  const streetNeighborhood = [streetPart, neighborhood].filter(Boolean).join(' - ');

  // Formatação de data
  const formatDate = (rawDate) => {
    if (!rawDate) return '';
    try {
      const str = String(rawDate).trim();
      const date = /^\d{4}-\d{2}-\d{2}$/.test(str) ? new Date(`${str}T12:00:00`) : new Date(str);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      }
    } catch (e) {
      // fallback
    }
    return String(rawDate);
  };

  const formattedDate = formatDate(item.date);

  // Foto principal
  const photoUrl = imageUrl || (item.item_photos && item.item_photos[0]?.url) || null;

  // Recompensa ativa
  const activeReward = Array.isArray(item.rewards)
    ? item.rewards.find((r) => r?.status === 'active')
    : null;

  // Formatação de telefone com o 9 a mais (padrão brasileiro)
  const formatPhoneWithNine = (phone) => {
    if (!phone) return null;
    let cleaned = String(phone).replace(/\D/g, '');
    
    // Se tiver 10 dígitos (DDD + 8 dígitos), insere o 9 no celular
    if (cleaned.length === 10) {
      cleaned = cleaned.slice(0, 2) + '9' + cleaned.slice(2);
    }
    
    // Formata padrão nacional com 11 dígitos: (XX) 9XXXX-XXXX
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    
    if (cleaned.length === 8) {
      cleaned = '9' + cleaned;
    }
    if (cleaned.length === 9) {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    }

    return phone;
  };

  // Verifica se a publicação foi feita em nome de terceiro
  const thirdParty = item.extra_fields?.third_party_owner;
  const isThirdParty = Boolean(thirdParty && thirdParty.active && (thirdParty.name || thirdParty.phone));

  // Contato do responsável (prioriza o tutor caso seja terceiro)
  const rawPhone = (isThirdParty && thirdParty.phone)
    ? thirdParty.phone
    : (
        item.profiles?.whatsapp ||
        item.profiles?.phone ||
        item.contact_phone ||
        item.phone ||
        item.extra_fields?.contact_phone ||
        null
      );

  const formattedPhone = formatPhoneWithNine(rawPhone);
  const ownerName = (isThirdParty && thirdParty.name)
    ? thirdParty.name
    : (item.profiles?.name || item.owner_name || 'Usuário do Recover');
  const ownerLabel = isLost ? 'Tutor' : 'Encontrado por';

  return (
    <View ref={ref} collapsable={false} style={styles.canvasWrapper}>
      <View style={styles.cardContainer}>
        {/* Faixa Superior de Alerta */}
        <View style={[styles.headerBanner, { backgroundColor: statusColor }]}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerAppBadge}>🐾 RECOVER</Text>
            {formattedDate ? <Text style={styles.headerDate}>{formattedDate}</Text> : null}
          </View>
          <Text style={styles.headerStatusText}>{statusHeaderTitle}</Text>
        </View>

        {/* Conteúdo Central */}
        <View style={styles.contentBody}>
          {/* Foto do Pet */}
          <View style={styles.imageContainer}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.petImage} resizeMode="cover" />
            ) : (
              <View style={styles.noPhotoBox}>
                <MaterialIcons name="pets" size={48} color="#9CA3AF" />
                <Text style={styles.noPhotoText}>Sem foto disponível</Text>
              </View>
            )}
          </View>

          {/* Título do Pet */}
          <Text style={styles.petTitle} numberOfLines={2}>
            {item.title || 'Animal sem identificação'}
          </Text>

          {/* Bloco de Localização Centralizado */}
          <View style={styles.locationContainer}>
            <View style={styles.locationHeaderRow}>
              <MaterialIcons name="place" size={14} color={statusColor} />
              <Text style={[styles.locationLabel, { color: statusColor }]}>{locationLabel}</Text>
            </View>
            {cityState ? <Text style={styles.cityStateText}>{cityState}</Text> : null}
            {streetNeighborhood ? (
              <Text style={styles.streetText}>{streetNeighborhood}</Text>
            ) : null}
          </View>

          {/* Descrição limpa em itálico e cinza */}
          {item.description ? (
            <Text style={styles.descriptionText} numberOfLines={3}>
              "{item.description}"
            </Text>
          ) : null}

          {/* Contato Minimalista */}
          <View style={styles.minimalContactContainer}>
            <Text style={styles.contactOwnerText}>
              {ownerLabel}: <Text style={styles.contactOwnerName}>{ownerName}</Text>
            </Text>
            {formattedPhone ? (
              <View style={styles.phoneRow}>
                <MaterialIcons name="phone" size={15} color="#059669" />
                <Text style={styles.contactPhoneText}>{formattedPhone}</Text>
              </View>
            ) : null}
          </View>

          {/* Bloco de Recompensa no final */}
          {activeReward && (
            <View style={styles.rewardContainer}>
              <Text style={styles.rewardText}>
                {activeReward.amount
                  ? `RECOMPENSA OFERECIDA: R$ ${parseFloat(activeReward.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : 'RECOMPENSA OFERECIDA'}
              </Text>
            </View>
          )}
        </View>

        {/* Rodapé / Chamada para Compartilhar */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            📢 Compartilhe para ajudar a trazer este pet de volta!
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  canvasWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerBanner: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerAppBadge: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  headerDate: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.9,
  },
  headerStatusText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 1,
    textAlign: 'center',
  },
  contentBody: {
    padding: 10,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 6,
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  noPhotoBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  petTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  rewardContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 5,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  locationContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  cityStateText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 18,
    textAlign: 'center',
  },
  streetText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 16,
    marginVertical: 3,
    paddingHorizontal: 6,
  },
  minimalContactContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  contactOwnerText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    textAlign: 'center',
  },
  contactOwnerName: {
    color: '#0F172A',
    fontWeight: '700',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  },
  contactPhoneText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.3,
  },
  footerContainer: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default ShareCardFlyer;
