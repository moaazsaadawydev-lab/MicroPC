export const TIMESTAMP = 'CURRENT_TIMESTAMP(6)';
export const USER_KEY = 'user';
export const RAW_REFRESH_TOKEN_KEY = 'rawRefreshToken';
export const Email_Verification_Token_EXPIRE_IN = new Date(
  Date.now() + 60 * 60 * 24 * 1000,
);
export const Refresh_Token_EXPIRE_IN =
  new Date(Date.now() + 60 * 60 * 24 * 15 * 1000);
