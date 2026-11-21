import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { fastApiClient } from '@/lib/api/fastapi-client';
import { FIRESTORE_COLLECTIONS, firestoreDb } from '@/lib/firebase/config';
import { SYNTHETIC_PROFILES } from '@/lib/mock-data';
import {
  cacheBeneficiariesLocally,
  clearWorkerLocalData,
  getAllLocalDrafts,
  getCachedBeneficiariesLocally,
} from '@/lib/offline/offline-store';
import type {
  AuditLogEntry,
  Beneficiary,
  BeneficiaryCategory,
  DangerAlert,
  FollowUpTask,
  ImmunisationScheduleItem,
  UserProfile,
  VisitDraft,
} from '@/types';

const STORAGE_VISITS_KEY = 'sakshya_mobile_visits_v4';
const STORAGE_ALERTS_KEY = 'sakshya_mobile_alerts_v4';
const STORAGE_FOLLOWUPS_KEY = 'sakshya_mobile_followups_v4';
const STORAGE_AUDIT_KEY = 'sakshya_mobile_audit_v4';
const STORAGE_BENEFICIARIES_KEY = 'sakshya_mobile_beneficiaries_v4';

function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

class DataService {
  private beneficiaries: Beneficiary[] = [];
  private profiles: UserProfile[] = [...SYNTHETIC_PROFILES];
  private visits: VisitDraft[] = [];
  private dangerAlerts: DangerAlert[] = [];
  private followUps: FollowUpTask[] = [];
  private immunisations: ImmunisationScheduleItem[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private hydrated = false;

  async hydrateFromStorage(): Promise<void> {
    if (!this.hydrated) {
      this.hydrated = true;
      try {
        const [v, a, f, aud, bensRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_VISITS_KEY),
          AsyncStorage.getItem(STORAGE_ALERTS_KEY),
          AsyncStorage.getItem(STORAGE_FOLLOWUPS_KEY),
          AsyncStorage.getItem(STORAGE_AUDIT_KEY),
          AsyncStorage.getItem(STORAGE_BENEFICIARIES_KEY),
        ]);
        if (v) this.visits = JSON.parse(v);
        if (a) this.dangerAlerts = JSON.parse(a);
        if (f) this.followUps = JSON.parse(f);
        if (aud) this.auditLogs = JSON.parse(aud);
        if (bensRaw) this.beneficiaries = JSON.parse(bensRaw);
      } catch {
        // ignore local storage errors
      }
    }

    await this.syncFromFirebase();
  }

  async syncFromFirebase(): Promise<void> {
    try {
      const [benSnap, visitSnap, alertSnap, fuSnap, auditSnap] = await Promise.all([
        getDocs(collection(firestoreDb, FIRESTORE_COLLECTIONS.beneficiaries)),
        getDocs(collection(firestoreDb, FIRESTORE_COLLECTIONS.visits)),
        getDocs(collection(firestoreDb, FIRESTORE_COLLECTIONS.dangerAlerts)),
        getDocs(collection(firestoreDb, FIRESTORE_COLLECTIONS.followUpTasks)),
        getDocs(collection(firestoreDb, FIRESTORE_COLLECTIONS.auditLogs)),
      ]);

      this.beneficiaries = benSnap.docs.map((d) => d.data() as Beneficiary);
      this.visits = visitSnap.docs.map((d) => d.data() as VisitDraft);
      this.dangerAlerts = alertSnap.docs.map((d) => d.data() as DangerAlert);
      this.followUps = fuSnap.docs.map((d) => d.data() as FollowUpTask);
      this.auditLogs = auditSnap.docs.map((d) => d.data() as AuditLogEntry);

      await cacheBeneficiariesLocally(this.beneficiaries).catch(() => {});
      this.persistStorage();
    } catch {
      // Offline — keep cached AsyncStorage records
    }
  }

  private persistStorage(): void {
    void Promise.all([
      AsyncStorage.setItem(STORAGE_BENEFICIARIES_KEY, JSON.stringify(this.beneficiaries)),
      AsyncStorage.setItem(STORAGE_VISITS_KEY, JSON.stringify(this.visits)),
      AsyncStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(this.dangerAlerts)),
      AsyncStorage.setItem(STORAGE_FOLLOWUPS_KEY, JSON.stringify(this.followUps)),
      AsyncStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(this.auditLogs)),
    ]).catch(() => {});
  }

  clearAllDangerAlerts(): void {
    const existingIds = this.dangerAlerts.map((a) => a.alert_id);
    this.dangerAlerts = [];
    void AsyncStorage.removeItem(STORAGE_ALERTS_KEY).catch(() => {});
    this.persistStorage();
    for (const id of existingIds) {
      void deleteDoc(doc(firestoreDb, FIRESTORE_COLLECTIONS.dangerAlerts, id)).catch(() => {});
    }
  }

  async clearAllVisits(): Promise<void> {
    const existingIds = this.visits.map((v) => v.visit_id || v.draft_id);
    this.visits = [];
    await AsyncStorage.removeItem(STORAGE_VISITS_KEY).catch(() => {});
    await clearWorkerLocalData();
    this.persistStorage();
    for (const id of existingIds) {
      void deleteDoc(doc(firestoreDb, FIRESTORE_COLLECTIONS.visits, id)).catch(() => {});
    }
  }

  async refreshBeneficiaries(): Promise<Beneficiary[]> {
    await this.hydrateFromStorage();
    if (this.beneficiaries.length === 0) {
      const cached = await getCachedBeneficiariesLocally();
      if (cached.length > 0) {
        this.beneficiaries = cached;
      }
    }
    return [...this.beneficiaries];
  }

  getBeneficiaries(ashaId?: string, phcId?: string): Beneficiary[] {
    return this.beneficiaries.filter((b) => {
      if (ashaId && b.assigned_asha_id && b.assigned_asha_id !== ashaId) return false;
      if (phcId && b.phc_id !== phcId) return false;
      return true;
    });
  }

  async addBeneficiary(input: {
    full_name: string;
    category: BeneficiaryCategory;
    age_years: number;
    village: string;
    household_head?: string;
    phone_number?: string;
    edd_date?: string;
    high_risk_status: boolean;
    preferred_language: string;
    assigned_asha_id?: string;
    phc_id?: string;
  }): Promise<Beneficiary> {
    await this.hydrateFromStorage();
    let backendId: string | null = null;
    try {
      const res = await fastApiClient.createBeneficiary({
        full_name: input.full_name,
        category: input.category,
        village: input.village,
        preferred_language: input.preferred_language,
        age_years: input.age_years,
        household_head: input.household_head,
        phone_number: input.phone_number,
        edd_date: input.edd_date,
        high_risk_status: input.high_risk_status,
      });
      backendId = res.beneficiary?.beneficiary_id || null;
    } catch {
      // Offline / backend unreachable — still register in Firebase + local
    }

    let maxNum = 1000;
    for (const b of this.beneficiaries) {
      const m = /^BEN-(\d+)$/i.exec(b.beneficiary_id);
      if (m) maxNum = Math.max(maxNum, Number.parseInt(m[1], 10));
    }
    const benId = backendId || `BEN-${maxNum + 1}`;
    const now = new Date().toISOString();
    const created: Beneficiary = {
      id: `ben-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      beneficiary_id: benId,
      full_name: input.full_name.trim(),
      age_years: input.age_years,
      gender: 'FEMALE',
      category: input.category,
      village: input.village,
      household_head: input.household_head,
      phone_number: input.phone_number,
      edd_date: input.edd_date,
      high_risk_status: input.high_risk_status,
      high_risk_reasons: input.high_risk_status ? ['Marked High Risk'] : [],
      assigned_asha_id: input.assigned_asha_id || 'b0000000-0000-0000-0000-000000000001',
      phc_id: input.phc_id || 'a0000000-0000-0000-0000-000000000001',
      preferred_language: input.preferred_language,
      created_at: now,
      updated_at: now,
    };

    this.beneficiaries = [created, ...this.beneficiaries];
    this.persistStorage();
    await cacheBeneficiariesLocally(this.beneficiaries).catch(() => {});

    void setDoc(
      doc(firestoreDb, FIRESTORE_COLLECTIONS.beneficiaries, created.beneficiary_id),
      stripUndefined(created)
    ).catch(() => {});

    return created;
  }

  getProfiles(phcId?: string): UserProfile[] {
    return phcId ? this.profiles.filter((p) => p.phc_id === phcId) : [...this.profiles];
  }

  getVisits(ashaId?: string, phcId?: string): VisitDraft[] {
    return this.visits
      .filter((v) => {
        if (ashaId && v.asha_worker_id !== ashaId) return false;
        if (phcId && v.phc_id !== phcId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
  }

  async getAllVisitsMergedWithOffline(): Promise<VisitDraft[]> {
    await this.hydrateFromStorage();
    const localDrafts = await getAllLocalDrafts();
    const byId = new Map<string, VisitDraft>();
    for (const v of this.visits) {
      byId.set(v.visit_id || v.draft_id, v);
    }
    for (const d of localDrafts) {
      byId.set(d.visit_id || d.draft_id, d);
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  getDangerAlerts(phcId?: string): DangerAlert[] {
    return this.dangerAlerts
      .filter((a) => !phcId || a.phc_id === phcId)
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());
  }

  getFollowUps(ashaId?: string, phcId?: string): FollowUpTask[] {
    return this.followUps.filter((f) => {
      if (ashaId && f.asha_worker_id !== ashaId) return false;
      if (phcId && f.phc_id !== phcId) return false;
      return true;
    });
  }

  getImmunisations(beneficiaryId?: string): ImmunisationScheduleItem[] {
    return beneficiaryId
      ? this.immunisations.filter((i) => i.beneficiary_id === beneficiaryId)
      : [...this.immunisations];
  }

  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  registerDangerAlert(alert: DangerAlert, actor?: UserProfile): void {
    const existingIdx = this.dangerAlerts.findIndex((a) => a.alert_id === alert.alert_id);
    if (existingIdx >= 0) {
      this.dangerAlerts[existingIdx] = { ...this.dangerAlerts[existingIdx], ...alert };
    } else {
      this.dangerAlerts.unshift(alert);
      const logEntry: AuditLogEntry = {
        id: `aud-${Date.now()}`,
        actor_name: actor?.full_name || alert.asha_worker_name || 'ASHA Worker',
        actor_role: actor?.role || 'ASHA_WORKER',
        action_type: 'DANGER_ALERT_EMITTED',
        entity_type: 'danger_alert',
        entity_id: alert.alert_id,
        summary: `${alert.canonical_name} (${alert.source_guideline_ref})`,
        created_at: new Date().toISOString(),
      };
      this.auditLogs.unshift(logEntry);
      void setDoc(
        doc(firestoreDb, FIRESTORE_COLLECTIONS.auditLogs, logEntry.id),
        stripUndefined(logEntry)
      ).catch(() => {});
    }

    void setDoc(
      doc(firestoreDb, FIRESTORE_COLLECTIONS.dangerAlerts, alert.alert_id),
      stripUndefined(alert)
    ).catch(() => {});

    this.persistStorage();
  }

  updateDangerAlertStatus(
    alertId: string,
    nextStatus: DangerAlert['status'],
    actor: UserProfile,
    referralNotes?: string
  ): DangerAlert | undefined {
    const target = this.dangerAlerts.find((a) => a.alert_id === alertId);
    if (!target) return undefined;

    target.status = nextStatus;
    if (nextStatus !== 'active' && !target.acknowledged_at) {
      target.acknowledged_by = actor.full_name;
      target.acknowledged_at = new Date().toISOString();
    }
    if (referralNotes !== undefined) {
      target.referral_notes = referralNotes;
    }

    const logEntry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      actor_name: actor.full_name,
      actor_role: actor.role,
      action_type: `ALERT_${nextStatus.toUpperCase()}`,
      entity_type: 'danger_alert',
      entity_id: alertId,
      summary: `Alert ${alertId} marked ${nextStatus}`,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(logEntry);

    void updateDoc(
      doc(firestoreDb, FIRESTORE_COLLECTIONS.dangerAlerts, alertId),
      stripUndefined({
        status: target.status,
        acknowledged_by: target.acknowledged_by ?? null,
        acknowledged_at: target.acknowledged_at ?? null,
        referral_notes: target.referral_notes ?? null,
      })
    ).catch(() => {});
    void setDoc(
      doc(firestoreDb, FIRESTORE_COLLECTIONS.auditLogs, logEntry.id),
      stripUndefined(logEntry)
    ).catch(() => {});

    this.persistStorage();
    return { ...target };
  }

  recordCommittedVisit(visit: VisitDraft): void {
    if (visit.status === 'draft') return;

    const visitDocId = visit.visit_id || visit.draft_id;
    const syncedVisit: VisitDraft = {
      ...visit,
      sync_status: 'synced',
      updated_at: new Date().toISOString(),
    };

    const existingIdx = this.visits.findIndex(
      (v) => v.visit_id === visit.visit_id || v.idempotency_key === visit.idempotency_key
    );
    if (existingIdx >= 0) {
      this.visits[existingIdx] = syncedVisit;
    } else {
      this.visits.unshift(syncedVisit);
    }

    void setDoc(
      doc(firestoreDb, FIRESTORE_COLLECTIONS.visits, visitDocId),
      stripUndefined(syncedVisit)
    ).catch(() => {});

    for (const alert of visit.danger_alerts) {
      this.registerDangerAlert(alert);
    }

    visit.follow_up_actions.forEach((act, idx) => {
      const taskId = `fu_${visit.visit_id}_${idx}`;
      if (!this.followUps.some((f) => f.id === taskId)) {
        const fuTask: FollowUpTask = {
          id: taskId,
          beneficiary_uuid: visit.beneficiary_uuid,
          beneficiary_id: visit.beneficiary_id || 'UNASSIGNED',
          beneficiary_name: visit.beneficiary_name || undefined,
          asha_worker_id: visit.asha_worker_id,
          phc_id: visit.phc_id,
          due_date: act.due_date || new Date().toISOString().split('T')[0],
          task_type: act.description,
          action_type: act.action_type,
          priority:
            act.priority === 'urgent' ? 'URGENT' : act.priority === 'high' ? 'HIGH' : 'NORMAL',
          status: 'PENDING',
          notes: act.source_phrase || undefined,
          created_at: new Date().toISOString(),
        };
        this.followUps.unshift(fuTask);
        void setDoc(
          doc(firestoreDb, FIRESTORE_COLLECTIONS.followUpTasks, taskId),
          stripUndefined(fuTask)
        ).catch(() => {});
      }
    });

    const logEntry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      actor_name: visit.worker_name || 'ASHA Worker',
      actor_role: 'ASHA_WORKER',
      action_type: 'VISIT_COMMITTED',
      entity_type: 'visit',
      entity_id: visit.visit_id,
      summary: `${visit.visit_type || 'Visit'} saved for ${visit.beneficiary_name || visit.beneficiary_id || 'Beneficiary'}`,
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(logEntry);
    void setDoc(
      doc(firestoreDb, FIRESTORE_COLLECTIONS.auditLogs, logEntry.id),
      stripUndefined(logEntry)
    ).catch(() => {});

    this.persistStorage();
  }

  toggleFollowUpStatus(taskId: string): FollowUpTask | undefined {
    const task = this.followUps.find((f) => f.id === taskId);
    if (!task) return undefined;
    task.status = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    task.completed_at = task.status === 'COMPLETED' ? new Date().toISOString() : undefined;

    void updateDoc(
      doc(firestoreDb, FIRESTORE_COLLECTIONS.followUpTasks, taskId),
      stripUndefined({
        status: task.status,
        completed_at: task.completed_at ?? null,
      })
    ).catch(() => {});

    this.persistStorage();
    return { ...task };
  }

  subscribeToRealtimeAlerts(onNewOrUpdated: () => void): () => void {
    try {
      const unsub = onSnapshot(
        collection(firestoreDb, FIRESTORE_COLLECTIONS.dangerAlerts),
        () => onNewOrUpdated(),
        () => {}
      );
      return unsub;
    } catch {
      return () => {};
    }
  }
}

export const dataService = new DataService();
