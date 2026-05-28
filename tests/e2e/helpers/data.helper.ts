// ── Seeded credentials (match app_storage_seed.py) ───────────────────────────

export const ADMIN = {
  email: 'admin@nvc.org',
  password: 'admin123',
  id: 'admin-1',
  name: 'NVC Admin Account',
};

export const VOLUNTEER = {
  email: 'volunteer@example.com',
  password: 'volunteer123',
  id: 'volunteer-1',
  name: 'Volunteer Account',
};

export const PARTNER_JOLLIBEE = {
  email: 'partnerships@jollibeefoundation.org',
  password: 'partner123',
  id: 'partner-user-3',
  name: 'Jollibee Foundation Account',
  orgName: 'Jollibee Foundation',
};

export const PARTNER_PBSP = {
  email: 'partnerships@pbsp.org.ph',
  password: 'partner123',
  id: 'partner-user-2',
  name: 'PBSP Account',
  orgName: 'Philippine Business for Social Progress',
};

export const PARTNER_LIVELIHOOD = {
  email: 'partner@livelihoods.org',
  password: 'partner123',
  id: 'partner-user-1',
  name: 'Kabankalan Livelihood Network Account',
  orgName: 'Kabankalan Livelihood Network',
};

// ── Dynamic data generators ───────────────────────────────────────────────────

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeEmail(prefix: string): string {
  return `${prefix}-${uid()}@test.com`;
}

export function makeProposalDetails(module: string = 'Education') {
  const title = `E2E ${module} Proposal ${uid()}`;
  const now = new Date();
  const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    requestedProgramModule: module,
    proposedTitle: title,
    proposedDescription: `Automated E2E test proposal for ${module} - ${uid()}`,
    proposedStartDate: now.toISOString().split('T')[0],
    proposedEndDate: later.toISOString().split('T')[0],
    proposedLocation: 'Bacolod City, Negros Occidental',
    proposedVolunteersNeeded: 5,
    skillsNeeded: ['Leadership', 'Communication'],
    communityNeed: 'E2E test community need',
    expectedDeliverables: 'E2E test deliverables',
  };
}
