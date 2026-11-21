import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Beneficiary, SyncStatus, VisitDraft } from '@/types';

const DRAFTS_STORAGE_KEY = 'sakshya_mobile_visit_drafts_v2';
const BENEFICIARIES_CACHE_KEY = 'sakshya_mobile_cached_beneficiaries_v2';

let memoryDraftsCache: Record<string, VisitDraft> | null = null;
let memoryBeneficiariesCache: Beneficiary[] | null = null;

async function ensureDraftsLoaded(): Promise<Record<string, VisitDraft>> {
  if (memoryDraftsCache !== null) {
    return memoryDraftsCache;
  }
  try {
    const raw = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
    memoryDraftsCache = raw ? (JSON.parse(raw) as Record<string, VisitDraft>) : {};
  } catch {
    memoryDraftsCache = {};
  }
  return memoryDraftsCache;
}

async function persistDraftsMap(map: Record<string, VisitDraft>): Promise<void> {
  memoryDraftsCache = map;
  try {
    await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export async function saveDraftLocally(draft: VisitDraft): Promise<void> {
  const map = await ensureDraftsLoaded();
  const updated: VisitDraft = {
    ...draft,
    updated_at: new Date().toISOString(),
  };
  map[draft.draft_id] = updated;
  await persistDraftsMap({ ...map });
}

export async function getDraftLocally(draftId: string): Promise<VisitDraft | undefined> {
  const map = await ensureDraftsLoaded();
  return map[draftId];
}

export async function getAllLocalDrafts(): Promise<VisitDraft[]> {
  const map = await ensureDraftsLoaded();
  return Object.values(map).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function getPendingDrafts(): Promise<VisitDraft[]> {
  const all = await getAllLocalDrafts();
  return all.filter(
    (d) =>
      d.status === 'confirmed' &&
      (d.sync_status === 'pending' || d.sync_status === 'failed')
  );
}

export async function updateDraftSyncStatus(
  draftId: string,
  status: SyncStatus,
  error?: string,
  persistenceRecordId?: string | null,
  committedAt?: string | null
): Promise<void> {
  const map = await ensureDraftsLoaded();
  const draft = map[draftId];
  if (draft) {
    draft.sync_status = status;
    if (error !== undefined) {
      draft.last_sync_error = error;
    }
    if (persistenceRecordId) {
      draft.persistence_record_id = persistenceRecordId;
      draft.status = 'committed';
    }
    if (committedAt) {
      draft.committed_at = committedAt;
    }
    draft.updated_at = new Date().toISOString();
    map[draftId] = { ...draft };
    await persistDraftsMap({ ...map });
  }
}

export async function deleteLocalDraft(draftId: string): Promise<void> {
  const map = await ensureDraftsLoaded();
  delete map[draftId];
  await persistDraftsMap({ ...map });
}

export async function clearWorkerLocalData(): Promise<void> {
  memoryDraftsCache = {};
  try {
    await AsyncStorage.removeItem(DRAFTS_STORAGE_KEY);
  } catch {
    // ignore cleanup errors
  }
}

export async function cacheBeneficiariesLocally(beneficiaries: Beneficiary[]): Promise<void> {
  memoryBeneficiariesCache = [...beneficiaries];
  try {
    await AsyncStorage.setItem(BENEFICIARIES_CACHE_KEY, JSON.stringify(beneficiaries));
  } catch {
    // non-fatal
  }
}

export async function getCachedBeneficiariesLocally(): Promise<Beneficiary[]> {
  if (memoryBeneficiariesCache !== null) {
    return [...memoryBeneficiariesCache];
  }
  try {
    const raw = await AsyncStorage.getItem(BENEFICIARIES_CACHE_KEY);
    memoryBeneficiariesCache = raw ? (JSON.parse(raw) as Beneficiary[]) : [];
    return [...memoryBeneficiariesCache];
  } catch {
    return [];
  }
}

