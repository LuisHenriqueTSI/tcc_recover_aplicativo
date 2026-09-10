const toValidCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number !== 0 ? number : null;
};

const getCoordinates = (latitude, longitude) => {
  const validLatitude = toValidCoordinate(latitude);
  const validLongitude = toValidCoordinate(longitude);
  if (validLatitude == null || validLongitude == null) return null;
  return { latitude: validLatitude, longitude: validLongitude };
};

/**
 * Retorna a localização pública mais confiável para navegação.
 * A localização inicial de um animal perdido é apenas uma região aproximada.
 */
export const getPublicRouteTarget = (item) => {
  if (!item) return null;

  const extraFields = item.extra_fields || {};
  const locationDetails = extraFields.location_details || {};
  const itemCoordinates = getCoordinates(
    item.latitude ?? locationDetails.latitude ?? extraFields.latitude,
    item.longitude ?? locationDetails.longitude ?? extraFields.longitude
  );

  if (item.status === 'found' && extraFields.found_custody === 'spotted') {
    return itemCoordinates ? { ...itemCoordinates, source: 'street_found' } : null;
  }

  if (item.status !== 'lost' || Number(extraFields.sighting_count || 0) < 1) {
    return null;
  }

  const sightingCoordinates = getCoordinates(
    extraFields.last_sighting_lat,
    extraFields.last_sighting_lng
  );

  return sightingCoordinates
    ? { ...sightingCoordinates, source: 'last_sighting' }
    : null;
};

export const canTraceRouteToItem = (item) => Boolean(getPublicRouteTarget(item));
