import type { BeneficiaryCategory } from '@/types';

export type PatientFieldKey =
  | 'fullName'
  | 'ageYears'
  | 'village'
  | 'householdHead'
  | 'phoneNumber'
  | 'eddDate';

export interface PatientIntakeDraftState {
  fullName: string;
  category: BeneficiaryCategory;
  ageYears: string;
  village: string;
  householdHead: string;
  phoneNumber: string;
  eddDate: string;
  highRisk: boolean;
}

const MONTH_MAP: Record<string, string> = {
  january: '01',
  jan: '01',
  february: '02',
  feb: '02',
  march: '03',
  mar: '03',
  april: '04',
  apr: '04',
  may: '05',
  june: '06',
  jun: '06',
  july: '07',
  jul: '07',
  august: '08',
  aug: '08',
  september: '09',
  sep: '09',
  sept: '09',
  october: '10',
  oct: '10',
  november: '11',
  nov: '11',
  december: '12',
  dec: '12',
};

function cleanLeadPhrases(raw: string, prefixes: RegExp[]): string {
  let text = raw.trim().replace(/[.,!?]+$/g, '').trim();
  for (const rx of prefixes) {
    text = text.replace(rx, '').trim();
  }
  return text;
}

export function normalizeSpokenDate(raw: string): string | null {
  const isoMatch = /\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/.exec(raw);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  const dmyMatch = /\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/.exec(raw);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  const namedMatch =
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-zA-Z]+)\s+(20\d{2})\b/i.exec(raw) ||
    /\b([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})\b/i.exec(raw);
  if (namedMatch) {
    const isMonthFirst = Number.isNaN(Number(namedMatch[1]));
    const monthWord = (isMonthFirst ? namedMatch[1] : namedMatch[2]).toLowerCase();
    const day = (isMonthFirst ? namedMatch[2] : namedMatch[1]).padStart(2, '0');
    const year = namedMatch[3];
    const mm = MONTH_MAP[monthWord];
    if (mm) return `${year}-${mm}-${day}`;
  }

  return null;
}

export function extractPatientFieldValue(field: PatientFieldKey, transcript: string): string {
  const clean = transcript.trim();
  if (!clean) return '';

  switch (field) {
    case 'fullName':
      return cleanLeadPhrases(clean, [
        /^(?:the\s+)?(?:patient(?:'s)?|beneficiary(?:'s)?|her|his|my)?\s*name\s+is\s+/i,
        /^(?:name|patient)\s*[:-]\s*/i,
      ]);
    case 'ageYears': {
      const m = /\b(\d{1,3})\b/.exec(clean);
      return m ? m[1] : clean.replace(/\D/g, '');
    }
    case 'village':
      return cleanLeadPhrases(clean, [
        /^(?:she\s+lives\s+in|lives\s+in|from|village|ward)\s+/i,
      ]);
    case 'householdHead':
      return cleanLeadPhrases(clean, [
        /^(?:household\s+head(?:\s+is)?|husband(?:\s+name)?(?:\s+is)?|father(?:\s+name)?(?:\s+is)?)\s+/i,
      ]);
    case 'phoneNumber': {
      const digits = clean.replace(/\D/g, '');
      if (digits.length === 10) {
        return `${digits.slice(0, 5)}-${digits.slice(5)}`;
      }
      return digits || clean;
    }
    case 'eddDate':
      return normalizeSpokenDate(clean) || clean;
  }
}

export function extractPatientFieldsFromTranscript(
  transcript: string,
  expectedStep?: PatientFieldKey | null
): Partial<PatientIntakeDraftState> {
  const text = transcript.trim();
  if (!text) return {};
  const updates: Partial<PatientIntakeDraftState> = {};

  // Category detection
  if (/\b(pregnant|anc|antenatal|expecting)\b/i.test(text)) {
    updates.category = 'PREGNANT_WOMAN';
  } else if (/\b(postnatal|lactating|pnc|delivered|new\s*mother)\b/i.test(text)) {
    updates.category = 'LACTATING_MOTHER';
  } else if (/\b(newborn|infant|baby)\b/i.test(text)) {
    updates.category = 'INFANT';
  } else if (/\b(child|toddler|kid)\b/i.test(text)) {
    updates.category = 'CHILD';
  }

  // High risk detection
  if (/\b(high\s*risk|risky|danger|complicated|bleeding|anemia|anaemia)\b/i.test(text)) {
    updates.highRisk = true;
  }

  // Explicit Age extraction ("age 24", "24 years old")
  const ageMatch =
    /\b(?:age(?:\s+is)?|aged)\s+(\d{1,3})\b/i.exec(text) ||
    /\b(\d{1,3})\s*(?:years?|yrs?|y\/o)\b/i.exec(text);
  if (ageMatch) {
    updates.ageYears = ageMatch[1];
  } else if (expectedStep === 'ageYears') {
    const numOnly = /\b(\d{1,3})\b/.exec(text);
    if (numOnly) updates.ageYears = numOnly[1];
  }

  // Phone number extraction (9-12 digits)
  const phoneDigits = text.replace(/[^\d]/g, '');
  if (phoneDigits.length >= 10 && phoneDigits.length <= 12) {
    const last10 = phoneDigits.slice(-10);
    updates.phoneNumber = `${last10.slice(0, 5)}-${last10.slice(5)}`;
  }

  // EDD date extraction
  const parsedDate = normalizeSpokenDate(text);
  if (parsedDate) {
    updates.eddDate = parsedDate;
  }

  // Explicit Name extraction ("name is Priya Devi")
  const nameMatch =
    /\b(?:name\s+is|patient\s+is|called)\s+([^,.\n]{2,40}?)(?=,|\.|age|from|village|ward|pregnant|postnatal|infant|child|phone|$)/i.exec(
      text
    );
  if (nameMatch?.[1]) {
    updates.fullName = nameMatch[1].trim();
  } else if (
    expectedStep === 'fullName' &&
    !/\b(skip|next|none|no)\b/i.test(text) &&
    !updates.ageYears &&
    !updates.phoneNumber
  ) {
    updates.fullName = extractPatientFieldValue('fullName', text);
  }

  // Explicit Village extraction ("village Rampur", "from Madurai")
  const villageMatch =
    /\b(?:village|ward|from|lives\s+in)\s+([^,.\n]{2,40}?)(?=,|\.|age|phone|husband|head|pregnant|$)/i.exec(
      text
    );
  if (villageMatch?.[1]) {
    updates.village = villageMatch[1].trim();
  } else if (expectedStep === 'village' && !/\b(skip|next|none|no)\b/i.test(text)) {
    updates.village = extractPatientFieldValue('village', text);
  }

  // Explicit Household head extraction
  const headMatch =
    /\b(?:household\s+head(?:\s+is)?|husband(?:\s+name)?(?:\s+is)?)\s+([^,.\n]{2,40}?)(?=,|\.|phone|age|$)/i.exec(
      text
    );
  if (headMatch?.[1]) {
    updates.householdHead = headMatch[1].trim();
  } else if (expectedStep === 'householdHead' && !/\b(skip|next|none|no)\b/i.test(text)) {
    updates.householdHead = extractPatientFieldValue('householdHead', text);
  }

  return updates;
}

export function getNextGuidedStep(
  state: PatientIntakeDraftState,
  askedSteps: Set<PatientFieldKey>
): { step: PatientFieldKey | null; prompt: string } {
  if (!state.fullName.trim()) {
    return {
      step: 'fullName',
      prompt: "Please say the patient's full name (or speak all details together).",
    };
  }
  if (!askedSteps.has('ageYears')) {
    return {
      step: 'ageYears',
      prompt: `Got ${state.fullName}. How old is the patient, and is she pregnant, postnatal, infant, or child?`,
    };
  }
  if (!state.village.trim() || state.village === 'Field Ward') {
    return {
      step: 'village',
      prompt: 'Which village or ward does the patient live in?',
    };
  }
  if (!state.phoneNumber.trim() && !askedSteps.has('phoneNumber')) {
    return {
      step: 'phoneNumber',
      prompt: 'Please say the 10-digit phone number (or say "skip").',
    };
  }
  if (!state.householdHead.trim() && !askedSteps.has('householdHead')) {
    return {
      step: 'householdHead',
      prompt: 'Who is the household head? (or say "skip").',
    };
  }
  if (
    state.category === 'PREGNANT_WOMAN' &&
    !state.eddDate.trim() &&
    !askedSteps.has('eddDate')
  ) {
    return {
      step: 'eddDate',
      prompt: 'What is the expected delivery date (EDD)? (or say "skip").',
    };
  }
  return {
    step: null,
    prompt: 'All patient details filled! Review and tap Save Patient.',
  };
}
