import { describe, expect, it, vi } from "vitest";
import {
  FreeAgentClient,
  freeAgentAuthorizationUrl,
  parseFreeAgentEnvironment
} from "../../src/accounting/freeagent/client";
import {
  freeAgentEnvironmentConfig,
  freeAgentEnvironmentConfigIssue,
  type AccountingEnvironment
} from "../../src/accounting/service";

function environment(overrides: Partial<AccountingEnvironment> = {}): AccountingEnvironment {
  return {
    FREEAGENT_ENVIRONMENT: "sandbox",
    FREEAGENT_SANDBOX_CLIENT_ID: "sandbox-client",
    FREEAGENT_SANDBOX_CLIENT_SECRET: "sandbox-secret",
    FREEAGENT_SANDBOX_COMPANY_SUBDOMAIN: "sandbox-company",
    FREEAGENT_SANDBOX_TOKEN_ENCRYPTION_KEY: "sandbox-key",
    FREEAGENT_SANDBOX_OAUTH_REDIRECT_URI: "https://foxtutor.org/learn/admin/accounting/oauth/callback",
    FREEAGENT_PRODUCTION_CLIENT_ID: "production-client",
    FREEAGENT_PRODUCTION_CLIENT_SECRET: "production-secret",
    FREEAGENT_PRODUCTION_COMPANY_SUBDOMAIN: "production-company",
    FREEAGENT_PRODUCTION_TOKEN_ENCRYPTION_KEY: "production-key",
    FREEAGENT_PRODUCTION_OAUTH_REDIRECT_URI: "https://foxtutor.org/learn/admin/accounting/oauth/callback",
    ...overrides
  };
}

describe("FreeAgent environment isolation", () => {
  it("accepts only canonical lowercase environment names", () => {
    expect(parseFreeAgentEnvironment("sandbox")).toBe("sandbox");
    expect(parseFreeAgentEnvironment("production")).toBe("production");
    for (const value of ["prod", "live", "real", "", "SANDBOX", "Production", null, undefined]) {
      expect(parseFreeAgentEnvironment(value)).toBeNull();
    }
  });

  it("selects separate credentials and company pins", () => {
    const env = environment();
    expect(freeAgentEnvironmentConfig(env, "sandbox")).toMatchObject({
      clientId: "sandbox-client",
      clientSecret: "sandbox-secret",
      companySubdomain: "sandbox-company",
      tokenEncryptionKey: "sandbox-key"
    });
    expect(freeAgentEnvironmentConfig(env, "production")).toMatchObject({
      clientId: "production-client",
      clientSecret: "production-secret",
      companySubdomain: "production-company",
      tokenEncryptionKey: "production-key"
    });
  });

  it("never uses legacy Sandbox credentials for Production", () => {
    const env = environment({
      FREEAGENT_ENVIRONMENT: "production",
      FREEAGENT_PRODUCTION_CLIENT_ID: undefined,
      FREEAGENT_PRODUCTION_CLIENT_SECRET: undefined,
      FREEAGENT_PRODUCTION_TOKEN_ENCRYPTION_KEY: undefined,
      FREEAGENT_CLIENT_ID: "legacy-sandbox-client",
      FREEAGENT_CLIENT_SECRET: "legacy-sandbox-secret",
      FREEAGENT_TOKEN_ENCRYPTION_KEY: "legacy-sandbox-key"
    });
    expect(freeAgentEnvironmentConfig(env, "production")).toBeNull();
  });

  it("identifies a missing Production token encryption key before OAuth", () => {
    const env = environment({ FREEAGENT_PRODUCTION_TOKEN_ENCRYPTION_KEY: undefined });
    expect(freeAgentEnvironmentConfigIssue(env, "production")).toBe("token_encryption_key");
    expect(freeAgentEnvironmentConfig(env, "production")).toBeNull();
  });

  it("accepts complete Production configuration for OAuth URL generation", () => {
    const env = environment();
    expect(freeAgentEnvironmentConfigIssue(env, "production")).toBeNull();
    const approval = new URL(freeAgentAuthorizationUrl("production", {
      clientId: env.FREEAGENT_PRODUCTION_CLIENT_ID ?? "",
      redirectUri: env.FREEAGENT_PRODUCTION_OAUTH_REDIRECT_URI ?? "",
      state: "production-state",
      accessLevel: "4"
    }));
    expect(approval.origin).toBe("https://api.freeagent.com");
    expect(approval.pathname).toBe("/v2/approve_app");
  });

  it("uses an environment-specific API origin", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toMatch(/^https:\/\/api\.sandbox\.freeagent\.com\/v2\/company$/);
      return new Response(JSON.stringify({ company: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    });
    await new FreeAgentClient({ environment: "sandbox", fetcher }).requestJson("sandbox-token", "/v2/company");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("keeps the complete OAuth host matrix environment-specific", async () => {
    const sandboxApproval = new URL(freeAgentAuthorizationUrl("sandbox", {
      clientId: "sandbox-client",
      redirectUri: "https://foxtutor.org/learn/admin/accounting/oauth/callback",
      state: "sandbox-state",
      accessLevel: "4"
    }));
    const productionApproval = new URL(freeAgentAuthorizationUrl("production", {
      clientId: "production-client",
      redirectUri: "https://foxtutor.org/learn/admin/accounting/oauth/callback",
      state: "production-state",
      accessLevel: "4"
    }));
    expect(sandboxApproval.origin).toBe("https://api.sandbox.freeagent.com");
    expect(productionApproval.origin).toBe("https://api.freeagent.com");
    expect(sandboxApproval.searchParams.get("client_id")).toBe("sandbox-client");
    expect(productionApproval.searchParams.get("client_id")).toBe("production-client");
  });
});
