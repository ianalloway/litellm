import { describe, it, expect } from "vitest";
import { buildOnboardingUrl } from "./onboarding_link";

const invitation = {
  baseUrl: "http://localhost:4000/",
  invitationId: "inv-123",
  hasUserSetupSso: false,
  resetPassword: false,
} satisfies Parameters<typeof buildOnboardingUrl>[0];

describe("buildOnboardingUrl", () => {
  it("points the invitation link at the dedicated /ui/onboarding route", () => {
    expect(buildOnboardingUrl(invitation)).toBe("http://localhost:4000/ui/onboarding?invitation_id=inv-123");
  });

  it("preserves a server_root_path prefix before /ui/onboarding", () => {
    expect(buildOnboardingUrl({ ...invitation, baseUrl: "https://proxy.example.com/litellm" })).toBe(
      "https://proxy.example.com/litellm/ui/onboarding?invitation_id=inv-123",
    );
  });

  it("appends action=reset_password for the reset-password flow", () => {
    expect(buildOnboardingUrl({ ...invitation, resetPassword: true })).toBe(
      "http://localhost:4000/ui/onboarding?invitation_id=inv-123&action=reset_password",
    );
  });

  it("sends SSO users to the dashboard root, not the onboarding form", () => {
    expect(buildOnboardingUrl({ ...invitation, hasUserSetupSso: true })).toBe("http://localhost:4000/ui");
  });

  it("returns an empty string when no base URL is known yet", () => {
    expect(buildOnboardingUrl({ ...invitation, baseUrl: "" })).toBe("");
  });

  it("returns an empty string rather than an invitation_id=undefined link when the id is not ready", () => {
    expect(buildOnboardingUrl({ ...invitation, invitationId: undefined })).toBe("");
  });
});
