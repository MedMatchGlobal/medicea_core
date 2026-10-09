// Native recovery codes remain experimental: local rehearsal only until validated.
export const recoveryEnabled = () => process.env.NODE_ENV === 'development' && process.env.MEDICEA_RECOVERY_CODES_BETA_ENABLED === 'true';
