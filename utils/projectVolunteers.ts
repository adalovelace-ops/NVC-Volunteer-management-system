import { Project, Volunteer, VolunteerProjectJoinRecord } from '../models/types';

export type ProjectVolunteerMapEntry = {
  id: string;
  label: string;
  volunteerId?: string;
  volunteerUserId?: string;
};

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function getTaskAssignedVolunteerIds(project: Project): string[] {
  return (project.internalTasks || []).flatMap(task => [
    normalizeText(task.assignedVolunteerId),
    ...(Array.isArray(task.assignedVolunteerIds)
      ? task.assignedVolunteerIds.map(normalizeText)
      : []),
  ]);
}

function getTaskAssignedVolunteerNames(project: Project): string[] {
  return (project.internalTasks || []).flatMap(task => [
    normalizeText(task.assignedVolunteerName),
    ...(Array.isArray(task.assignedVolunteerNames)
      ? task.assignedVolunteerNames.map(normalizeText)
      : []),
  ]);
}

export function getProjectVolunteerMapEntries(
  project: Project,
  volunteers: Volunteer[] = [],
  joinRecords: VolunteerProjectJoinRecord[] = []
): ProjectVolunteerMapEntry[] {
  const volunteerById = new Map(volunteers.map(volunteer => [volunteer.id, volunteer]));
  const volunteerByUserId = new Map(
    volunteers
      .filter(volunteer => Boolean(normalizeText(volunteer.userId)))
      .map(volunteer => [volunteer.userId, volunteer])
  );
  const entriesByKey = new Map<string, ProjectVolunteerMapEntry>();

  const addVolunteer = (volunteer: Volunteer, fallbackKey?: string) => {
    const key = volunteer.id || volunteer.userId || fallbackKey;
    if (!key || entriesByKey.has(key)) {
      return;
    }
    entriesByKey.set(key, {
      id: key,
      label: volunteer.name || volunteer.email || 'Volunteer',
      volunteerId: volunteer.id,
      volunteerUserId: volunteer.userId,
    });
  };

  const addFallback = (key: string, label?: string) => {
    const normalizedKey = normalizeText(key);
    if (!normalizedKey || entriesByKey.has(normalizedKey)) {
      return;
    }

    const volunteer = volunteerById.get(normalizedKey) || volunteerByUserId.get(normalizedKey);
    if (volunteer) {
      addVolunteer(volunteer, normalizedKey);
      return;
    }

    entriesByKey.set(normalizedKey, {
      id: normalizedKey,
      label: normalizeText(label) || 'Volunteer',
    });
  };

  (project.volunteers || []).forEach(volunteerId => addFallback(volunteerId, volunteerId));
  (project.joinedUserIds || []).forEach(userId => addFallback(userId, userId));

  const assignedIds = getTaskAssignedVolunteerIds(project).filter(Boolean);
  const assignedNames = getTaskAssignedVolunteerNames(project).filter(Boolean);
  assignedIds.forEach((volunteerId, index) => addFallback(volunteerId, assignedNames[index] || volunteerId));

  joinRecords
    .filter(record => record.projectId === project.id)
    .forEach(record => {
      const volunteer = volunteerById.get(record.volunteerId) || volunteerByUserId.get(record.volunteerUserId);
      if (volunteer) {
        addVolunteer(volunteer, record.id);
        return;
      }

      addFallback(
        record.volunteerId || record.volunteerUserId || record.id,
        record.volunteerName || record.volunteerEmail || 'Volunteer'
      );
    });

  return Array.from(entriesByKey.values()).sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}

export function getProjectVolunteerMapCount(
  project: Project,
  volunteers: Volunteer[] = [],
  joinRecords: VolunteerProjectJoinRecord[] = []
): number {
  return getProjectVolunteerMapEntries(project, volunteers, joinRecords).length;
}
