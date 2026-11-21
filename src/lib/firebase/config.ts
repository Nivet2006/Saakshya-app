import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'sakshya-aasha.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'sakshya-aasha',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'sakshya-aasha.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '149471048841',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:149471048841:web:62bcb39a9715243fb34258',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-HZRSQ4YK9F',
};

export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const firestoreDb: Firestore = getFirestore(firebaseApp);

export const FIRESTORE_COLLECTIONS = {
  beneficiaries: 'beneficiaries',
  visits: 'visits',
  dangerAlerts: 'danger_alerts',
  followUpTasks: 'follow_up_tasks',
  immunisations: 'immunisations',
  auditLogs: 'audit_logs',
  workers: 'workers',
} as const;
