import { test, expect } from '@playwright/test';
import {
  clearProjectsVolunteersAndProposals,
  getProjects,
  getVolunteers,
  getPartnerApplications,
} from '../helpers/api.helper';

test.describe('Storage cleanup', () => {
  test('Empty projects, volunteers, and proposals', async () => {
    await clearProjectsVolunteersAndProposals();

    const [projects, volunteers, proposals] = await Promise.all([
      getProjects(),
      getVolunteers(),
      getPartnerApplications(),
    ]);

    expect(projects).toHaveLength(0);
    expect(volunteers).toHaveLength(0);
    expect(proposals).toHaveLength(0);
  });
});
