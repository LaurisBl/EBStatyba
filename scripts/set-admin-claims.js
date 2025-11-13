import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const envPath =
  process.env.DOTENV_CONFIG_PATH ||
  (process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local');
loadEnv({ path: envPath, override: false });

async function assignAdminClaims() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const adminEmails = process.env.ADMIN_EMAILS;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is required.');
  }

  if (!adminEmails) {
    throw new Error('ADMIN_EMAILS environment variable must be a comma-separated list of authorized emails.');
  }

  let credential = null;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    credential = cert(JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON));
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = applicationDefault();
  } else {
    const defaultKeyPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(defaultKeyPath)) {
      credential = cert(JSON.parse(fs.readFileSync(defaultKeyPath, 'utf8')));
      process.env.GOOGLE_APPLICATION_CREDENTIALS = defaultKeyPath;
    } else {
      throw new Error(
        'No service account credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or place service-account.json in the project root.'
      );
    }
  }

  initializeApp({
    credential,
    projectId
  });

  const auth = getAuth();
  const emails = adminEmails.split(',').map((email) => email.trim()).filter(Boolean);

  if (emails.length === 0) {
    throw new Error('No valid emails provided in ADMIN_EMAILS.');
  }

  for (const email of emails) {
    try {
      const userRecord = await auth.getUserByEmail(email);
      const existingClaims = userRecord.customClaims || {};
      await auth.setCustomUserClaims(userRecord.uid, { ...existingClaims, admin: true });
      console.log(`Assigned admin claim to ${email}`);
    } catch (error) {
      console.error(`Failed to assign admin claim to ${email}:`, error.message);
    }
  }

  console.log('Admin claim assignment complete.');
}

assignAdminClaims().catch((error) => {
  console.error('assign:admins script failed:', error);
  process.exitCode = 1;
});
