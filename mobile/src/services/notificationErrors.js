export const shouldIgnoreNotificationError = (error = {}) => {
  const message = String(error?.message || error || '');
  const normalized = message.toLowerCase();

  return [
    'PGRST116',
    'PGRST205',
    'PGRST303',
    'duplicate key',
    'already exists',
    'row-level security',
    'could not find the table',
    'not found in the schema cache',
    'jwt issued at future',
  ].some((needle) => normalized.includes(needle.toLowerCase()));
};
