import type {
  AuditLogEntry,
  Beneficiary,
  DangerAlert,
  Facility,
  FollowUpTask,
  ImmunisationScheduleItem,
  UserProfile,
} from '@/types';

/**
 * Production / Firebase DB mode:
 * All sample patient, visit, alert, follow-up, and immunisation data has been removed.
 * All clinical records are stored and synced via Firebase Firestore (`sakshya-aasha`).
 */

export const SYNTHETIC_FACILITIES: Facility[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    code: 'PHC-PRIMARY-01',
    name: 'Primary Health Centre',
    facility_type: 'PHC',
    district: 'District PHC',
    state: 'India',
    pincode: '000000',
    contact_phone: '108',
    emergency_transport_phone: '108',
  },
];

export const SYNTHETIC_PROFILES: UserProfile[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    worker_code: 'ASHA-01',
    role: 'ASHA_WORKER',
    full_name: 'ASHA Worker',
    phone_number: '',
    phc_id: 'a0000000-0000-0000-0000-000000000001',
    phc_name: 'Primary Health Centre',
    assigned_area: 'Field Ward',
    preferred_language: 'hi-IN',
    is_active: true,
    is_online: true,
    last_active_at: new Date().toISOString(),
  },
  {
    id: 'b0000000-0000-0000-0000-000000000010',
    worker_code: 'SUP-PHC-01',
    role: 'PHC_SUPERVISOR',
    full_name: 'PHC Medical Supervisor',
    phone_number: '',
    phc_id: 'a0000000-0000-0000-0000-000000000001',
    phc_name: 'Primary Health Centre',
    assigned_area: 'PHC Block',
    preferred_language: 'en-IN',
    is_active: true,
    is_online: true,
    last_active_at: new Date().toISOString(),
  },
];

export const SYNTHETIC_BENEFICIARIES: Beneficiary[] = [];
export const SYNTHETIC_INITIAL_VISITS: never[] = [];
export const SYNTHETIC_DANGER_ALERTS: DangerAlert[] = [];
export const SYNTHETIC_FOLLOW_UPS: FollowUpTask[] = [];
export const SYNTHETIC_IMMUNISATIONS: ImmunisationScheduleItem[] = [];
export const SYNTHETIC_AUDIT_LOGS: AuditLogEntry[] = [];
