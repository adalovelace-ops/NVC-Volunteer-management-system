import { Page } from '@playwright/test';

const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:8000';

export async function apiCall<T = any>(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => '<no body>');
    throw new Error(`API ${method} ${url} → ${response.status} ${response.statusText}: ${text}`);
  }

  const payload = await response.json();
  // Storage endpoints return { key, value: [...] }
  if (payload && typeof payload === 'object' && 'value' in payload) {
    return payload.value as T;
  }
  return payload as T;
}

// ── Storage helpers ──────────────────────────────────────────────────────────

export async function getUsers(): Promise<any[]> {
  return apiCall('/storage/users');
}

export async function getVolunteers(): Promise<any[]> {
  return apiCall('/storage/volunteers');
}

export async function getPartners(): Promise<any[]> {
  return apiCall('/storage/partners');
}

export async function getProjects(): Promise<any[]> {
  return apiCall('/storage/projects');
}

export async function getEvents(): Promise<any[]> {
  return apiCall('/storage/events');
}

export async function getVolunteerMatches(): Promise<any[]> {
  return apiCall('/storage/volunteerMatches');
}

export async function getVolunteerJoins(): Promise<any[]> {
  return apiCall('/storage/volunteerProjectJoins');
}

export async function getPartnerApplications(): Promise<any[]> {
  return apiCall('/storage/partnerProjectApplications');
}

export async function getTimeLogs(): Promise<any[]> {
  return apiCall('/storage/volunteerTimeLogs');
}

export async function clearProjects(): Promise<any> {
  return apiCall('/storage/projects', 'DELETE');
}

export async function clearVolunteers(): Promise<any> {
  return apiCall('/storage/volunteers', 'DELETE');
}

export async function clearPartnerApplications(): Promise<any> {
  return apiCall('/storage/partnerProjectApplications', 'DELETE');
}

export async function clearProjectsVolunteersAndProposals(): Promise<void> {
  await Promise.all([
    clearProjects(),
    clearVolunteers(),
    clearPartnerApplications(),
  ]);
}

export async function getMessages(userId: string): Promise<any[]> {
  const res = await apiCall(`/messages?user_id=${encodeURIComponent(userId)}`) as any;
  if (Array.isArray(res)) return res;
  if (res?.messages) return res.messages;
  return [];
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

export async function loginViaAPI(identifier: string, password: string): Promise<any> {
  return apiCall('/auth/login', 'POST', { identifier, password });
}

export async function getPendingUsers(): Promise<any[]> {
  const res = await apiCall('/auth/users/pending') as any;
  if (Array.isArray(res)) return res;
  if (res?.pendingUsers) return res.pendingUsers;
  return [];
}

export async function approveUser(userId: string, adminId: string = 'user-admin-1780189738'): Promise<any> {
  return apiCall(
    `/auth/users/${encodeURIComponent(userId)}/approve?admin_id=${encodeURIComponent(adminId)}`,
    'POST',
    { status: 'approved' }
  );
}

// ── Partner proposal helpers ─────────────────────────────────────────────────

export async function submitPartnerProposal(
  projectId: string,
  partnerUserId: string,
  partnerName: string,
  proposalDetails: any
): Promise<any> {
  return apiCall('/partner-project-applications/request', 'POST', {
    projectId,
    partnerUserId,
    partnerName,
    partnerEmail: `${partnerName.toLowerCase().replace(/\s+/g, '.')}@test.com`,
    proposalDetails,
  });
}

export async function reviewPartnerApplication(
  applicationId: string,
  status: 'Approved' | 'Rejected',
  reviewedBy: string = 'user-admin-1780189738',
  reviewNotes?: string
): Promise<any> {
  return apiCall(
    `/partner-project-applications/${encodeURIComponent(applicationId)}/review`,
    'POST',
    { status, reviewedBy, reviewNotes }
  );
}

// ── Snapshot ─────────────────────────────────────────────────────────────────

export async function getSnapshot(userId: string, role: string): Promise<any> {
  return apiCall(`/projects/snapshot?user_id=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`);
}
