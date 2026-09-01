import { clearProjectsVolunteersAndProposals } from './helpers/api.helper';

export default async function globalSetup(): Promise<void> {
  await clearProjectsVolunteersAndProposals();
}
