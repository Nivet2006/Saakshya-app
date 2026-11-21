import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyAVS-DrwWQX2Ho3eD_qwk9aU6mNoQksGsg',
  authDomain: 'sakshya-aasha.firebaseapp.com',
  projectId: 'sakshya-aasha',
  storageBucket: 'sakshya-aasha.firebasestorage.app',
  messagingSenderId: '149471048841',
  appId: '1:149471048841:web:62bcb39a9715243fb34258',
  measurementId: 'G-HZRSQ4YK9F',
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
