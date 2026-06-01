import type { Partner, PartnerProjectApplication, Project, User } from '../models/types';

function normalizeKey(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function addProjectAndChildEvents(projectIds: Set<string>, project: Project, projects: Project[]): void {
  projectIds.add(project.id);

  let changed = true;
  while (changed) {
    changed = false;
    projects.forEach(candidate => {
      if (!candidate.parentProjectId || projectIds.has(candidate.id)) {
        return;
      }

      if (projectIds.has(candidate.parentProjectId)) {
        projectIds.add(candidate.id);
        changed = true;
      }
    });
  }
}

function addProjectsMatchingApplication(
  projectIds: Set<string>,
  application: PartnerProjectApplication,
  projects: Project[]
): void {
  const proposalDetails = application.proposalDetails;
  const requestedModule = normalizeKey(proposalDetails?.requestedProgramModule);
  const proposedTitle = normalizeKey(proposalDetails?.proposedTitle);
  const targetTitle = normalizeKey(proposalDetails?.targetProjectTitle);

  if (!requestedModule && !proposedTitle && !targetTitle) {
    return;
  }

  projects.forEach(candidate => {
    const candidateModule = normalizeKey(
      candidate.programModule || candidate.program_id || candidate.category
    );
    const candidateTitle = normalizeKey(candidate.title);
    const moduleMatches = requestedModule && candidateModule === requestedModule;
    const titleMatches =
      (proposedTitle && candidateTitle === proposedTitle) ||
      (targetTitle && candidateTitle === targetTitle);

    if (titleMatches || (moduleMatches && String(candidate.id || '').startsWith('project-proposal-'))) {
      addProjectAndChildEvents(projectIds, candidate, projects);
    }
  });
}

function partnerMatchesApplication(partner: Partner, application: PartnerProjectApplication): boolean {
  const partnerOwnerId = normalizeKey(partner.ownerUserId);
  const applicationUserId = normalizeKey(application.partnerUserId);
  if (partnerOwnerId && partnerOwnerId === applicationUserId) {
    return true;
  }

  const partnerEmail = normalizeKey(partner.contactEmail);
  const applicationEmail = normalizeKey(application.partnerEmail);
  if (partnerEmail && partnerEmail === applicationEmail) {
    return true;
  }

  const partnerName = normalizeKey(partner.name);
  const applicationName = normalizeKey(application.partnerName);
  return Boolean(partnerName && applicationName && partnerName === applicationName);
}

function projectMatchesPartner(project: Project, partner: Partner): boolean {
  const projectPartnerId = normalizeKey(project.partnerId);
  if (!projectPartnerId) {
    return false;
  }

  return (
    projectPartnerId === normalizeKey(partner.id) ||
    projectPartnerId === normalizeKey(partner.ownerUserId) ||
    projectPartnerId === normalizeKey(partner.contactEmail) ||
    projectPartnerId === normalizeKey(partner.name)
  );
}

export function getPartnerForMappedProject(project: Project, partners: Partner[]): Partner | null {
  return partners.find(partner => projectMatchesPartner(project, partner)) || null;
}

export function getProjectIdsForPartner(
  partner: Partner,
  projects: Project[],
  applications: PartnerProjectApplication[]
): string[] {
  const projectById = new Map(projects.map(project => [project.id, project]));
  const projectIds = new Set<string>();

  projects.forEach(project => {
    if (projectMatchesPartner(project, partner)) {
      addProjectAndChildEvents(projectIds, project, projects);
    }
  });

  applications
    .filter(application => application.status === 'Approved' && partnerMatchesApplication(partner, application))
    .forEach(application => {
      const directProject = projectById.get(application.projectId);
      if (directProject) {
        addProjectAndChildEvents(projectIds, directProject, projects);
      }

      const targetProjectId = application.proposalDetails?.targetProjectId;
      const targetProject = targetProjectId ? projectById.get(targetProjectId) : null;
      if (targetProject) {
        addProjectAndChildEvents(projectIds, targetProject, projects);
      }

      addProjectsMatchingApplication(projectIds, application, projects);
    });

  return Array.from(projectIds);
}

export function getProjectIdsForPartnerUser(
  user: User | null | undefined,
  partners: Partner[],
  projects: Project[],
  applications: PartnerProjectApplication[]
): string[] {
  if (!user) {
    return [];
  }

  const userId = normalizeKey(user.id);
  const userEmail = normalizeKey(user.email);
  const ownedPartners = partners.filter(partner => {
    if (normalizeKey(partner.ownerUserId) === userId) {
      return true;
    }
    return Boolean(userEmail && normalizeKey(partner.contactEmail) === userEmail);
  });

  const projectIds = new Set<string>();
  ownedPartners.forEach(partner => {
    getProjectIdsForPartner(partner, projects, applications).forEach(projectId => projectIds.add(projectId));
  });

  applications
    .filter(application => {
      if (application.status !== 'Approved') {
        return false;
      }
      if (normalizeKey(application.partnerUserId) === userId) {
        return true;
      }
      return Boolean(userEmail && normalizeKey(application.partnerEmail) === userEmail);
    })
    .forEach(application => {
      const project = projects.find(candidate => candidate.id === application.projectId);
      if (project) {
        addProjectAndChildEvents(projectIds, project, projects);
      }

      const targetProjectId = application.proposalDetails?.targetProjectId;
      const targetProject = targetProjectId
        ? projects.find(candidate => candidate.id === targetProjectId)
        : null;
      if (targetProject) {
        addProjectAndChildEvents(projectIds, targetProject, projects);
      }

      addProjectsMatchingApplication(projectIds, application, projects);
    });

  projects.forEach(project => {
    if (normalizeKey(project.partnerId) === userId || (userEmail && normalizeKey(project.partnerId) === userEmail)) {
      addProjectAndChildEvents(projectIds, project, projects);
    }
  });

  return Array.from(projectIds);
}
