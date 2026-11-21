type AuthFixture = {
  accessToken: string | null;
  token: string | null;
  userId: string | null;
  userRole: string | null;
  userEmail: string;
  premiumUser: boolean;
  disabledPersonalKeyCreation: boolean | null;
  showSSOBanner: boolean;
};

const admin: AuthFixture = {
  accessToken: "test-access-token",
  token: "test-token",
  userId: "test-user-id",
  userRole: "Admin",
  userEmail: "test@example.com",
  premiumUser: false,
  disabledPersonalKeyCreation: null,
  showSSOBanner: false,
};

const signedOut: AuthFixture = { ...admin, accessToken: null, token: null, userId: null, userRole: null };

export const createAuthFixture = (overrides: Partial<AuthFixture> = {}): AuthFixture => ({ ...admin, ...overrides });

export const createSignedOutAuthFixture = (overrides: Partial<AuthFixture> = {}): AuthFixture => ({
  ...signedOut,
  ...overrides,
});
