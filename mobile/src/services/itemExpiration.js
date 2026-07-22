const DEFAULT_EXPIRATION_DAYS = 7;
const DEFAULT_PERMANENT_DELETE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getExpirationDate = (item = {}) => normalizeDate(item?.expires_at || null);

const getSafeExpirationDays = () => {
  const raw = Number(process.env.EXPO_PUBLIC_ITEM_EXPIRATION_DAYS ?? process.env.ITEM_EXPIRATION_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_EXPIRATION_DAYS;
};

const getSafePermanentDeleteDays = () => {
  const raw = Number(process.env.EXPO_PUBLIC_ITEM_PERMANENT_DELETE_DAYS ?? process.env.ITEM_PERMANENT_DELETE_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PERMANENT_DELETE_DAYS;
};

export const getExpirationDays = () => getSafeExpirationDays();
export const getPermanentDeleteDays = () => getSafePermanentDeleteDays();

export const getItemExpirationDate = (item) => {
  const expiresAt = getExpirationDate(item);
  if (expiresAt) return expiresAt;

  const baseDate = normalizeDate(item?.created_at) || new Date();
  return new Date(baseDate.getTime() + getExpirationDays() * DAY_MS);
};

export const getRenewalInfo = (item = {}) => {
  const createdAt = normalizeDate(item?.created_at) || new Date();
  const expiresAt = getExpirationDate(item);
  const canRenew = item?.resolved !== true;

  if (!expiresAt) {
    return {
      canRenew,
      daysRemaining: null,
      expired: false,
      needsRenewal: false,
      inactive: false,
      willBePermanentlyDeletedSoon: false,
      deleteDaysRemaining: null,
      expiresAt: null,
      permanentDeleteDate: new Date(createdAt.getTime() + getPermanentDeleteDays() * DAY_MS),
    };
  }

  const now = Date.now();
  const daysRemaining = Math.ceil((expiresAt.getTime() - now) / DAY_MS);
  const permanentDeleteDate = new Date(createdAt.getTime() + getPermanentDeleteDays() * DAY_MS);
  const deleteDaysRemaining = Math.ceil((permanentDeleteDate.getTime() - now) / DAY_MS);

  const expired = daysRemaining <= 0;
  const needsRenewal = daysRemaining > 0 && daysRemaining <= 3;
  const inactive = expired;
  const willBePermanentlyDeletedSoon = deleteDaysRemaining <= 3 && deleteDaysRemaining >= 0;

  return {
    canRenew,
    daysRemaining,
    expired,
    needsRenewal,
    inactive,
    willBePermanentlyDeletedSoon,
    deleteDaysRemaining,
    expiresAt,
    permanentDeleteDate,
  };
};

export const shouldHideItem = (item = {}) => {
  if (item?.resolved) return true;
  const expiresAt = getExpirationDate(item);
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
};

export const getExpiredItemIds = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && getRenewalInfo(item).expired)
    .map((item) => item.id)
    .filter(Boolean);
};

export const shouldDeletePermanently = (item = {}) => {
  if (!item?.id) return false;
  const createdAt = normalizeDate(item.created_at);
  if (!createdAt) return false;

  const deletionDate = new Date(createdAt.getTime() + getPermanentDeleteDays() * DAY_MS);
  return deletionDate.getTime() <= Date.now();
};
