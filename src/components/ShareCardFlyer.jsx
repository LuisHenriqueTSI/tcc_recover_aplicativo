import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ShareCardFlyer = React.forwardRef(({ item, imageUrl }, ref) => {
  if (!item) return null;

  const isLost = item.status === 'lost';
  const statusColor = isLost ? '#DC2626' : '#16A34A';
  const statusHeaderTitle = isLost ? '🚨 ANIMAL PERDIDO' : '✅ ANIMAL ENCONTRADO';
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

  // Contato do responsável
  const rawPhone =
    item.profiles?.whatsapp ||
    item.profiles?.phone ||
    item.contact_phone ||
    item.phone ||
    item.extra_fields?.contact_phone ||
    null;

  const formatPhone = (phone) => {
    if (!phone) return null;
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const ownerName = item.profiles?.name || item.owner_name || 'Usuário do Recover';
  const formattedPhone = formatPhone(rawPhone);

  return (
    <View ref={ref} collapsable={false} style={styles.cardContainer}>
      {/* Faixa Superior de Alerta */}
      <View style={[styles.headerBanner, { backgroundColor: statusColor }]}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerAppBadge}>🐾 RECOVER</Text>
          <Text style={styles.headerDate}>{formattedDate}</Text>
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
              <MaterialIcons name="pets" size={54} color="#9CA3AF" />
              <Text style={styles.noPhotoText}>Sem foto disponível</Text>
            </View>
          )}
        </View>

        {/* Título e Características */}
        <Text style={styles.petTitle} numberOfLines={2}>
          {item.title || 'Animal sem identificação'}
        </Text>

        {/* Tags de características */}
        <View style={styles.chipsRow}>
          {item.species ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>🐾 {item.species}</Text>
            </View>
          ) : null}
          {item.breed && item.breed !== 'Sem raça definida' ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>🐕 {item.breed}</Text>
            </View>
          ) : null}
          {item.color ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>🎨 {item.color}</Text>
            </View>
          ) : null}
          {item.size ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>📏 Porte {item.size}</Text>
            </View>
          ) : null}
        </View>

        {/* Bloco de Recompensa (se houver) */}
        {activeReward && (
          <View style={styles.rewardContainer}>
            <MaterialIcons name="emoji-events" size={20} color="#D97706" />
            <Text style={styles.rewardText}>
              {activeReward.amount
                ? `RECOMPENSA: R$ ${parseFloat(activeReward.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : 'RECOMPENSA OFERECIDA'}
            </Text>
          </View>
        )}

        {/* Bloco de Localização */}
        <View style={styles.locationContainer}>
          <View style={styles.locationHeaderRow}>
            <MaterialIcons name="place" size={18} color={statusColor} />
            <Text style={[styles.locationLabel, { color: statusColor }]}>{locationLabel}</Text>
          </View>
          {cityState ? <Text style={styles.cityStateText}>{cityState}</Text> : null}
          {streetNeighborhood ? (
            <Text style={styles.streetText}>{streetNeighborhood}</Text>
          ) : null}
        </View>

        {/* Descrição curta se houver */}
        {item.description ? (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText} numberOfLines={3}>
              "{item.description}"
            </Text>
          </View>
        ) : null}

        {/* Caixa de Contato */}
        <View style={styles.contactContainer}>
          <View style={styles.contactHeaderRow}>
            <MaterialIcons name="phone" size={18} color="#047857" />
            <Text style={styles.contactLabel}>SE VOCÊ VIU OU TEM INFORMAÇÕES:</Text>
          </View>
          {formattedPhone ? (
            <Text style={styles.contactPhone}>📞 {formattedPhone}</Text>
          ) : null}
          <Text style={styles.contactOwner}>👤 Responsável: {ownerName}</Text>
        </View>
      </View>

      {/* Rodapé / Chamada para Compartilhar */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          📢 Por favor, ajude a compartilhar! Sua ajuda faz toda a diferença.
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    width: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  headerBanner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerAppBadge: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  headerDate: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.9,
  },
  headerStatusText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  contentBody: {
    padding: 16,
  },
  imageContainer: {
    width: '100%',
    height: 230,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
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
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  petTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 6,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.3,
  },
  locationContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cityStateText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 20,
  },
  streetText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  descriptionContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#94A3B8',
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  contactContainer: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  contactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  contactPhone: {
    fontSize: 19,
    fontWeight: '900',
    color: '#047857',
    marginVertical: 2,
  },
  contactOwner: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
  footerContainer: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 15,
  },
});

export default ShareCardFlyer;
