#!/usr/bin/env node

import { createInterface } from "node:readline";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = resolve(__dirname, "..", "templates");

// ── Helpers ──

function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toPascalCase(str) {
  return str
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function createPrompt() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    ask(question) {
      return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
      });
    },
    close() {
      rl.close();
    },
  };
}

function applyTemplate(content, vars) {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function copyTemplateDir(srcDir, destDir, vars, conditionals) {
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const destName = applyTemplate(entry.name, vars);

    if (entry.isDirectory()) {
      const destPath = join(destDir, destName);
      mkdirSync(destPath, { recursive: true });
      copyTemplateDir(srcPath, destPath, vars, conditionals);
    } else {
      // Handle conditional files: skip files with .conditional-{flag} suffix
      const conditionalMatch = entry.name.match(/\.conditional-(\w+)/);
      if (conditionalMatch) {
        const flag = conditionalMatch[1];
        if (!conditionals[flag]) continue;
      }

      const destPath = join(destDir, destName.replace(/\.conditional-\w+/, ""));
      const raw = readFileSync(srcPath, "utf-8");
      const content = applyTemplate(raw, vars);
      writeFileSync(destPath, content);
    }
  }
}

// ── Main ──

async function main() {
  const appNameArg = process.argv[2];

  console.log("");
  console.log("  create-supa-app v0.1.0");
  console.log("  Set up a new Supa app in ~2 minutes.");
  console.log("");

  const prompt = createPrompt();

  try {
    // ── App Identity ──
    console.log("── App Identity ──");
    const appName = appNameArg || (await prompt.ask("? App name: "));
    if (!appName) {
      console.error("Error: App name is required.");
      process.exit(1);
    }

    const defaultSlug = toKebabCase(appName);
    const appSlugInput = await prompt.ask(
      `? App slug: (${defaultSlug}) `
    );
    const appSlug = appSlugInput || defaultSlug;

    const defaultScheme = appSlug;
    const urlSchemeInput = await prompt.ask(
      `? URL scheme (for deep links): (${defaultScheme}) `
    );
    const urlScheme = urlSchemeInput || defaultScheme;

    const defaultBundleId = `com.${appSlug.replace(/-/g, "")}.mobile`;
    const bundleIdInput = await prompt.ask(
      `? Bundle ID (production): (${defaultBundleId}) `
    );
    const bundleId = bundleIdInput || defaultBundleId;

    const defaultStagingBundleId = `com.${appSlug.replace(/-/g, "")}.staging`;
    const stagingBundleIdInput = await prompt.ask(
      `? Bundle ID (staging): (${defaultStagingBundleId}) `
    );
    const stagingBundleId = stagingBundleIdInput || defaultStagingBundleId;

    console.log("");

    // ── Architecture ──
    console.log("── Architecture ──");
    const multiTenantInput = await prompt.ask(
      "? Is this a multi-tenant app? (y/N) "
    );
    const multiTenant =
      multiTenantInput.toLowerCase() === "y" ||
      multiTenantInput.toLowerCase() === "yes";

    let tenantName = "";
    if (multiTenant) {
      tenantName = await prompt.ask(
        "? What are tenants called? (e.g., communities, organizations) "
      );
      if (!tenantName) tenantName = "organizations";
    }

    console.log("");

    // ── Auth ──
    console.log("── Auth ──");
    const phoneOtpInput = await prompt.ask(
      "? Enable Phone OTP (Twilio)? (Y/n) "
    );
    const phoneOtp =
      phoneOtpInput === "" ||
      phoneOtpInput.toLowerCase() === "y" ||
      phoneOtpInput.toLowerCase() === "yes";

    const emailOtpInput = await prompt.ask(
      "? Enable Email OTP (Resend)? (Y/n) "
    );
    const emailOtp =
      emailOtpInput === "" ||
      emailOtpInput.toLowerCase() === "y" ||
      emailOtpInput.toLowerCase() === "yes";

    console.log("");

    // ── Features ──
    console.log("── Features ──");
    const pushNotifInput = await prompt.ask(
      "? Enable push notifications? (Y/n) "
    );
    const pushNotifications =
      pushNotifInput === "" ||
      pushNotifInput.toLowerCase() === "y" ||
      pushNotifInput.toLowerCase() === "yes";

    const chatInput = await prompt.ask("? Enable chat module? (y/N) ");
    const chat =
      chatInput.toLowerCase() === "y" ||
      chatInput.toLowerCase() === "yes";

    const paymentsInput = await prompt.ask(
      "? Enable payments (Stripe)? (y/N) "
    );
    const payments =
      paymentsInput.toLowerCase() === "y" ||
      paymentsInput.toLowerCase() === "yes";

    console.log("");

    // ── Deployment ──
    console.log("── Deployment ──");
    const strictnessInput = await prompt.ask(
      "? Deployment strictness: (relaxed/standard/strict) [standard] "
    );
    const strictness = ["relaxed", "standard", "strict"].includes(
      strictnessInput.toLowerCase()
    )
      ? strictnessInput.toLowerCase()
      : "standard";

    console.log("");

    // ── Infrastructure ──
    console.log("── Infrastructure ──");
    const vaultName = await prompt.ask("? 1Password vault name: ");
    const easProjectId = await prompt.ask(
      "? EAS Project ID: (can leave blank, fill later) "
    );
    const expoOwner = await prompt.ask("? Expo owner: ");

    prompt.close();

    console.log("");
    console.log("Scaffolding your app...");
    console.log("");

    // ── Build template variables ──
    const appNamePascal = toPascalCase(appName);

    // Build auth providers string for schema and config
    const authProviders = [];
    if (phoneOtp) authProviders.push("phone");
    if (emailOtp) authProviders.push("email");

    // Build feature flags
    const features = [];
    if (pushNotifications) features.push("notifications");
    if (chat) features.push("chat");
    if (payments) features.push("payments");

    // Schema composables
    const schemaImports = [];
    const schemaSpread = [];
    if (multiTenant) {
      schemaImports.push("tenantSchema");
      schemaSpread.push("  ...tenantSchema,");
    }
    if (chat) {
      schemaImports.push("chatSchema");
      schemaSpread.push("  ...chatSchema,");
    }
    if (payments) {
      schemaImports.push("paymentsSchema");
      schemaSpread.push("  ...paymentsSchema,");
    }
    if (pushNotifications) {
      schemaImports.push("notificationsSchema");
      schemaSpread.push("  ...notificationsSchema,");
    }

    const schemaImportLine =
      schemaImports.length > 0
        ? `import { ${schemaImports.join(", ")} } from "@supa/convex/schema";\n`
        : "";
    const schemaSpreadLines =
      schemaSpread.length > 0 ? "\n" + schemaSpread.join("\n") : "";

    // Auth config for auth.ts
    const authMethods = [];
    if (phoneOtp) authMethods.push('    PhoneOTP({ twilioAccountSid: process.env.TWILIO_ACCOUNT_SID! }),');
    if (emailOtp) authMethods.push('    EmailOTP({ resendApiKey: process.env.RESEND_API_KEY! }),');

    // HTTP routes for http.ts
    const httpRoutes = [];
    if (payments) {
      httpRoutes.push('  ...stripeWebhookRoutes,');
    }

    // Provider imports for _layout.tsx
    const providerImports = [];
    const providerOpen = [];
    const providerClose = [];
    providerImports.push('import { SupaProvider, AuthProvider } from "@supa/core";');
    providerOpen.push("        <SupaProvider>");
    providerOpen.push("          <AuthProvider>");
    providerClose.push("          </AuthProvider>");
    providerClose.push("        </SupaProvider>");

    if (pushNotifications) {
      providerImports.push('import { NotificationProvider } from "@supa/notifications";');
      // Insert inside AuthProvider
      providerOpen.push("            <NotificationProvider>");
      providerClose.unshift("            </NotificationProvider>");
    }

    // Supa config features section
    const configFeatures = [];
    configFeatures.push(`    phoneOtp: ${phoneOtp},`);
    configFeatures.push(`    emailOtp: ${emailOtp},`);
    configFeatures.push(`    pushNotifications: ${pushNotifications},`);
    configFeatures.push(`    chat: ${chat},`);
    configFeatures.push(`    payments: ${payments},`);

    // Env vars for .env.example
    const envVars = [];
    envVars.push("# Convex");
    envVars.push("CONVEX_DEPLOYMENT=");
    envVars.push(`NEXT_PUBLIC_CONVEX_URL=`);
    envVars.push("");
    if (phoneOtp) {
      envVars.push("# Twilio (Phone OTP)");
      envVars.push(`TWILIO_ACCOUNT_SID=op://${vaultName || "Vault"}/Twilio/account-sid`);
      envVars.push(`TWILIO_AUTH_TOKEN=op://${vaultName || "Vault"}/Twilio/auth-token`);
      envVars.push(`TWILIO_PHONE_NUMBER=op://${vaultName || "Vault"}/Twilio/phone-number`);
      envVars.push("");
    }
    if (emailOtp) {
      envVars.push("# Resend (Email OTP)");
      envVars.push(`RESEND_API_KEY=op://${vaultName || "Vault"}/Resend/api-key`);
      envVars.push("");
    }
    if (pushNotifications) {
      envVars.push("# Expo Push Notifications");
      envVars.push(`EXPO_ACCESS_TOKEN=op://${vaultName || "Vault"}/Expo/access-token`);
      envVars.push("");
    }
    if (payments) {
      envVars.push("# Stripe");
      envVars.push(`STRIPE_SECRET_KEY=op://${vaultName || "Vault"}/Stripe/secret-key`);
      envVars.push(`STRIPE_WEBHOOK_SECRET=op://${vaultName || "Vault"}/Stripe/webhook-secret`);
      envVars.push("");
    }
    envVars.push("# Sentry");
    envVars.push(`SENTRY_DSN=op://${vaultName || "Vault"}/Sentry/dsn`);

    const vars = {
      APP_NAME: appName,
      APP_NAME_PASCAL: appNamePascal,
      APP_SLUG: appSlug,
      URL_SCHEME: urlScheme,
      BUNDLE_ID: bundleId,
      STAGING_BUNDLE_ID: stagingBundleId,
      MULTI_TENANT: String(multiTenant),
      TENANT_NAME: tenantName,
      PHONE_OTP: String(phoneOtp),
      EMAIL_OTP: String(emailOtp),
      PUSH_NOTIFICATIONS: String(pushNotifications),
      CHAT: String(chat),
      PAYMENTS: String(payments),
      STRICTNESS: strictness,
      VAULT_NAME: vaultName || "Vault",
      EAS_PROJECT_ID: easProjectId || "YOUR_EAS_PROJECT_ID",
      EXPO_OWNER: expoOwner || "your-expo-owner",
      SCHEMA_IMPORT_LINE: schemaImportLine,
      SCHEMA_SPREAD_LINES: schemaSpreadLines,
      AUTH_METHODS: authMethods.join("\n"),
      HTTP_ROUTES: httpRoutes.join("\n"),
      PROVIDER_IMPORTS: providerImports.join("\n"),
      PROVIDER_OPEN: providerOpen.join("\n"),
      PROVIDER_CLOSE: providerClose.reverse().join("\n"),
      CONFIG_FEATURES: configFeatures.join("\n"),
      ENV_VARS: envVars.join("\n"),
      AUTH_PROVIDERS_LIST: authProviders.map((p) => `"${p}"`).join(", "),
      FEATURES_LIST: features.map((f) => `"${f}"`).join(", "),
    };

    const conditionals = {
      payments,
      chat,
      notifications: pushNotifications,
      multiTenant,
    };

    // ── Create project directory ──
    const projectDir = resolve(process.cwd(), appSlug);
    mkdirSync(projectDir, { recursive: true });

    // ── Copy and process templates ──
    copyTemplateDir(TEMPLATES_DIR, projectDir, vars, conditionals);

    // ── Print results ──
    console.log(`\u2713 Created ${appSlug}/`);
    console.log("");
    console.log("Next steps:");
    console.log(`  cd ${appSlug}`);
    console.log("  pnpm install");
    console.log("  pnpm setup:secrets      # pulls secrets from 1Password");
    console.log("  npx convex dev           # creates Convex deployment");
    console.log("  pnpm dev                 # start developing!");
    console.log("");
    console.log("Your app is configured with:");
    console.log(
      `  ${phoneOtp ? "\u2713" : "\u2717"} Phone OTP auth (Twilio)${phoneOtp ? "" : " (disabled)"}`
    );
    console.log(
      `  ${emailOtp ? "\u2713" : "\u2717"} Email OTP auth (Resend)${emailOtp ? "" : " (disabled)"}`
    );
    console.log(
      `  ${pushNotifications ? "\u2713" : "\u2717"} Push notifications${pushNotifications ? "" : " (disabled)"}`
    );
    console.log(
      `  ${chat ? "\u2713" : "\u2717"} Chat${chat ? "" : " (disabled)"}`
    );
    console.log(
      `  ${payments ? "\u2713" : "\u2717"} Payments (Stripe)${payments ? "" : " (disabled)"}`
    );
    if (multiTenant) {
      console.log(`  \u2713 Multi-tenant (${tenantName})`);
    }
    console.log(`  \u2713 ${strictness.charAt(0).toUpperCase() + strictness.slice(1)} deployment strictness`);
    console.log("");
  } catch (err) {
    prompt.close();
    if (err.code === "ERR_USE_AFTER_CLOSE") {
      // User pressed Ctrl+C
      console.log("\nAborted.");
      process.exit(0);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
