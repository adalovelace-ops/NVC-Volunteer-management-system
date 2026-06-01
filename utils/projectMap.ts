import { ImageSourcePropType } from 'react-native';
import { Project } from '../models/types';
import { getProjectStatusColor } from './projectStatus';
import { isImageMediaUri } from './media';

const PROGRAM_IMAGE_BY_CATEGORY: Partial<Record<Project['category'], ImageSourcePropType>> = {
  Nutrition: require('../assets/programs/nutrition.jpg'),
  Education: require('../assets/programs/education.jpg'),
  Livelihood: require('../assets/programs/livelihood.jpg'),
};

const PROGRAM_PHOTO_BY_TITLE: Record<string, ImageSourcePropType> = {
  'Farm to Fork Program': require('../assets/programs/farm-to-fork.jpg'),
  'Mingo for Nutritional Support': require('../assets/programs/nutrition.jpg'),
  'Mingo for Emergency Relief': require('../assets/programs/mingo-relief.jpg'),
  LoveBags: require('../assets/programs/lovebags.jpg'),
  'School Support': require('../assets/programs/school-support.jpg'),
  'Artisans of Hope': require('../assets/programs/artisans-of-hope.jpg'),
  'Project Joseph': require('../assets/programs/project-joseph.jpg'),
  'Growing Hope': require('../assets/programs/growing-hope.jpg'),
  'Peter Project': require('../assets/programs/peter-project.jpg'),
};

const PROGRAM_PHOTO_MATCHERS: Array<{
  matches: (project: Project, normalizedTitle: string) => boolean;
  source: ImageSourcePropType;
}> = [
  {
    matches: (_project, normalizedTitle) => normalizedTitle.includes('farm to fork'),
    source: require('../assets/programs/farm-to-fork.jpg'),
  },
  {
    matches: (_project, normalizedTitle) =>
      normalizedTitle.includes('lovebag') || normalizedTitle.includes('school bag'),
    source: require('../assets/programs/lovebags.jpg'),
  },
  {
    matches: (_project, normalizedTitle) => normalizedTitle.includes('school'),
    source: require('../assets/programs/school-support.jpg'),
  },
  {
    matches: (_project, normalizedTitle) => normalizedTitle.includes('artisans'),
    source: require('../assets/programs/artisans-of-hope.jpg'),
  },
  {
    matches: (_project, normalizedTitle) =>
      normalizedTitle.includes('joseph') || normalizedTitle.includes('sewing'),
    source: require('../assets/programs/project-joseph.jpg'),
  },
  {
    matches: (_project, normalizedTitle) =>
      normalizedTitle.includes('growing hope') || normalizedTitle.includes('garden'),
    source: require('../assets/programs/growing-hope.jpg'),
  },
  {
    matches: (_project, normalizedTitle) => normalizedTitle.includes('peter'),
    source: require('../assets/programs/peter-project.jpg'),
  },
  {
    matches: (project, normalizedTitle) =>
      normalizedTitle.includes('mingo') || normalizedTitle.includes('masiglang') || project.category === 'Nutrition',
    source: require('../assets/programs/nutrition.jpg'),
  },
];

function getProgramPhotoSource(project: Project): ImageSourcePropType | undefined {
  if (!project || !project.title) {
    return undefined;
  }

  if (PROGRAM_PHOTO_BY_TITLE[project.title]) {
    return PROGRAM_PHOTO_BY_TITLE[project.title];
  }

  const normalizedTitle = project.title.trim().toLowerCase();
  return PROGRAM_PHOTO_MATCHERS.find((entry) => entry.matches(project, normalizedTitle))?.source;
}

function getProjectImageSources(project: Project): ImageSourcePropType[] {
  if (!project) {
    return [];
  }

  if (project.imageHidden) {
    return [];
  }

  const imageSources: ImageSourcePropType[] = [];
  const hasUploadedProjectImage = isImageMediaUri(project.imageUrl);
  if (hasUploadedProjectImage) {
    imageSources.push({ uri: project.imageUrl! });
  }
  const isProposalCreatedProject = String(project.id || '').startsWith('project-proposal-');
  if (isProposalCreatedProject && !hasUploadedProjectImage) {
    return imageSources;
  }
  const programPhotoSource = getProgramPhotoSource(project);

  if (programPhotoSource) {
    imageSources.push(programPhotoSource);
  }

  if (project.programModule && project.programModule in PROGRAM_IMAGE_BY_CATEGORY) {
    imageSources.push(
      PROGRAM_IMAGE_BY_CATEGORY[project.programModule as Project['category']] as ImageSourcePropType
    );
  }

  const categoryImageSource = project.category ? PROGRAM_IMAGE_BY_CATEGORY[project.category] : undefined;
  if (categoryImageSource && !imageSources.includes(categoryImageSource)) {
    imageSources.push(categoryImageSource);
  }

  return imageSources;
}

export function getPrimaryProjectImageSource(project: Project): ImageSourcePropType | undefined {
  return getProjectImageSources(project)[0];
}

type ProjectCoordinates = Pick<Project['location'], 'latitude' | 'longitude'>;

const KNOWN_PLACE_COORDINATES: Array<{
  keywords: string[];
  latitude: number;
  longitude: number;
}> = [
  {
    keywords: ['baybay talisay city', 'baybay talisay', 'talisay city'],
    latitude: 10.5447,
    longitude: 123.1885,
  },
  {
    keywords: ['kabankalan city', 'kabankalan'],
    latitude: 10.6711,
    longitude: 122.9534,
  },
  {
    keywords: ['bacolod city', 'bacolod'],
    latitude: 10.6765,
    longitude: 122.9509,
  },
  {
    keywords: ['bago city', 'bago'],
    latitude: 10.5333,
    longitude: 122.8333,
  },
  {
    keywords: ['silay city', 'silay'],
    latitude: 10.8002,
    longitude: 122.9726,
  },
  {
    keywords: ['victorias city', 'victorias'],
    latitude: 10.9013,
    longitude: 123.0707,
  },
  {
    keywords: ['cadiz city', 'cadiz'],
    latitude: 10.9465,
    longitude: 123.2881,
  },
  {
    keywords: ['san carlos city', 'san carlos'],
    latitude: 10.4812,
    longitude: 123.4184,
  },
  {
    keywords: ['himamaylan city', 'himamaylan'],
    latitude: 10.1048,
    longitude: 122.8703,
  },
  {
    keywords: ['murcia'],
    latitude: 10.6056,
    longitude: 123.0417,
  },
  {
    keywords: ['la carlota city', 'la carlota'],
    latitude: 10.4247,
    longitude: 122.9212,
  },
  {
    keywords: ['sipalay city', 'sipalay'],
    latitude: 9.7514,
    longitude: 122.4665,
  },
  {
    keywords: ['bindoy', 'camudlas bindoy', 'camudlas'],
    latitude: 10.4026,
    longitude: 123.0059,
  },
  {
    keywords: ['badian'],
    latitude: 9.8647,
    longitude: 123.3967,
  },
  {
    keywords: ['central visayas', 'region vii', 'region 7'],
    latitude: 10.3157,
    longitude: 123.8854,
  },
  {
    keywords: ['region vi', 'region 6', 'western visayas'],
    latitude: 10.7202,
    longitude: 122.5621,
  },
  {
    keywords: ['region iv a', 'calabarzon'],
    latitude: 14.1008,
    longitude: 121.0794,
  },
  {
    keywords: ['region iii', 'region 3', 'central luzon'],
    latitude: 15.4828,
    longitude: 120.712,
  },
  {
    keywords: ['region i ', 'region 1', 'ilocos region'],
    latitude: 16.0832,
    longitude: 120.6199,
  },
  {
    keywords: ['region ii', 'region 2', 'cagayan valley'],
    latitude: 17.6132,
    longitude: 121.727,
  },
  {
    keywords: ['mimaropa', 'region iv b', 'region 4 b'],
    latitude: 12.1896,
    longitude: 121.3063,
  },
  {
    keywords: ['bicol region', 'region v', 'region 5'],
    latitude: 13.1391,
    longitude: 123.7438,
  },
  {
    keywords: ['eastern visayas', 'region viii', 'region 8'],
    latitude: 11.2433,
    longitude: 125.0046,
  },
  {
    keywords: ['zamboanga peninsula', 'region ix', 'region 9'],
    latitude: 7.8383,
    longitude: 123.2967,
  },
  {
    keywords: ['northern mindanao', 'region x', 'region 10'],
    latitude: 8.4542,
    longitude: 124.6319,
  },
  {
    keywords: ['davao region', 'region xi', 'region 11'],
    latitude: 7.1907,
    longitude: 125.4553,
  },
  {
    keywords: ['soccsksargen', 'region xii', 'region 12'],
    latitude: 6.1164,
    longitude: 125.1716,
  },
  {
    keywords: ['caraga', 'region xiii', 'region 13'],
    latitude: 8.9475,
    longitude: 125.5406,
  },
  {
    keywords: ['cordillera administrative region', 'region xiv'],
    latitude: 16.4023,
    longitude: 120.596,
  },
  {
    keywords: ['barmm', 'bangsamoro'],
    latitude: 7.2167,
    longitude: 124.25,
  },
  {
    keywords: ['negros occidental'],
    latitude: 10.5,
    longitude: 123.0,
  },
  {
    keywords: ['negros island region', 'nir'],
    latitude: 10.68,
    longitude: 122.97,
  },
  {
    keywords: ['philippines', 'philippine', 'pinas'],
    latitude: 12.8797,
    longitude: 121.7740,
  },
  {
    keywords: ['metro manila', 'manila', 'ncr', 'national capital region'],
    latitude: 14.5995,
    longitude: 120.9842,
  },
  {
    keywords: ['cebu city', 'cebu'],
    latitude: 10.3157,
    longitude: 123.8854,
  },
  {
    keywords: ['davao city', 'davao'],
    latitude: 7.1907,
    longitude: 125.4553,
  },
  {
    keywords: ['iloilo city', 'iloilo'],
    latitude: 10.7202,
    longitude: 122.5621,
  },
  {
    keywords: ['cagayan de oro', 'cdo'],
    latitude: 8.4542,
    longitude: 124.6319,
  },
  {
    keywords: ['zamboanga city', 'zamboanga'],
    latitude: 6.9214,
    longitude: 122.0790,
  },
];

const PHILIPPINES_PLACE_KEYWORDS = [
  'philippines',
  'philippine',
  'pinas',
  'metro manila',
  'manila',
  'ncr',
  'national capital region',
  'luzon',
  'visayas',
  'mindanao',
  'barangay',
  'brgy',
  'brgy.',
  'purok',
  'sitio',
  'poblacion',
  'barangay',
  'municipality',
  'mun',
  'mun.',
  'province',
  'city',
  'city.',
  'batangas',
  'cavite',
  'laguna',
  'rizal',
  'quezon',
  'pampanga',
  'bulacan',
  'pangasinan',
  'nova ecija',
  'tarlac',
  'zambales',
  'bataan',
  'albay',
  'camarines',
  'sorsogon',
  'naga',
  'cebu',
  'davao',
  'cagayan de oro',
  'zamboanga',
  'iligan',
  'general santos',
  'bukidnon',
  'surigao',
  'cotabato',
  'palawan',
  'siargao',
  'batangas',
  'biliran',
  'basilan',
  'batanes',
  'border',
  'dinagat',
  'guimaras',
  'ifugao',
  'kalinga',
  'mountain province',
  'occidental mindoro',
  'oriental mindoro',
  'marinduque',
  'romblon',
  'samar',
  'leyte',
  'biliran',
  'southern leyte',
  'northern samar',
  'western samar',
  'agusan',
  'sultan kudarat',
  'south cotabato',
  'north cotabato',
  'sarangani',
  'dinagat islands',
  'tawi tawi',
  'sulu',
  'lamitan',
  'marawi',
  'iriga',
];

function normalizePlaceValue(value: string | undefined | null): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasUsableCoordinates(location?: Partial<Project['location']> | null): location is ProjectCoordinates {
  return Boolean(
    location &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      !(location.latitude === 0 && location.longitude === 0)
  );
}

function getProjectLocationAddress(project: Pick<Project, 'location'>): string {
  return project.location?.address?.trim() || '';
}

function inferCoordinatesFromRelatedProject(
  project: Project,
  projects: Project[]
): { coordinates: ProjectCoordinates; address?: string } | null {
  const otherProjects = projects.filter(candidate => candidate.id !== project.id);
  const normalizedTitle = normalizePlaceValue(project.title);

  if (normalizedTitle) {
    const sameTitleMatch = otherProjects.find(candidate =>
      normalizePlaceValue(candidate.title) === normalizedTitle && hasUsableCoordinates(candidate.location)
    );

    if (sameTitleMatch) {
      return {
        coordinates: {
          latitude: sameTitleMatch.location.latitude,
          longitude: sameTitleMatch.location.longitude,
        },
        address: getProjectLocationAddress(sameTitleMatch),
      };
    }
  }

  if (project.parentProjectId) {
    const parentMatch = otherProjects.find(candidate =>
      candidate.id === project.parentProjectId && hasUsableCoordinates(candidate.location)
    );

    if (parentMatch) {
      return {
        coordinates: {
          latitude: parentMatch.location.latitude,
          longitude: parentMatch.location.longitude,
        },
        address: getProjectLocationAddress(parentMatch),
      };
    }

    const siblingMatch = otherProjects.find(candidate =>
      candidate.parentProjectId === project.parentProjectId && hasUsableCoordinates(candidate.location)
    );

    if (siblingMatch) {
      return {
        coordinates: {
          latitude: siblingMatch.location.latitude,
          longitude: siblingMatch.location.longitude,
        },
        address: getProjectLocationAddress(siblingMatch),
      };
    }
  }

  const childMatch = otherProjects.find(candidate =>
    candidate.parentProjectId === project.id && hasUsableCoordinates(candidate.location)
  );

  if (childMatch) {
    return {
      coordinates: {
        latitude: childMatch.location.latitude,
        longitude: childMatch.location.longitude,
      },
      address: getProjectLocationAddress(childMatch),
    };
  }

  const inferredFromAddress = inferCoordinatesFromPlace(getProjectLocationAddress(project), otherProjects);
  if (inferredFromAddress) {
    return {
      coordinates: inferredFromAddress,
      address: getProjectLocationAddress(project),
    };
  }

  return null;
}

function resolveProjectMapPlacement(project: Project, projects: Project[]): Project {
  if (hasUsableCoordinates(project.location)) {
    return project;
  }

  const inferredPlacement = inferCoordinatesFromRelatedProject(project, projects);
  if (inferredPlacement) {
    return {
      ...project,
      location: {
        address: getProjectLocationAddress(project) || inferredPlacement.address || 'Location to be finalized',
        latitude: inferredPlacement.coordinates.latitude,
        longitude: inferredPlacement.coordinates.longitude,
      },
    };
  }

  // Last resort: try to infer from the project's own address string against known places
  const addressOnly = inferCoordinatesFromPlace(getProjectLocationAddress(project), []);
  if (addressOnly) {
    return {
      ...project,
      location: {
        address: getProjectLocationAddress(project) || 'Location to be finalized',
        latitude: addressOnly.latitude,
        longitude: addressOnly.longitude,
      },
    };
  }

  // Final fallback: place unmapped projects at the Negros Occidental center so they
  // still appear on the map with a visible warning in the callout instead of disappearing.
  return {
    ...project,
    location: {
      address: getProjectLocationAddress(project) || 'Location to be finalized',
      latitude: NEGROS_REGION.latitude,
      longitude: NEGROS_REGION.longitude,
    },
  };
}

function spreadOverlappingProjectMarkers(projects: Project[]): Project[] {
  const projectsByCoordinateKey = new Map<string, Project[]>();

  projects.forEach(project => {
    const coordinateKey = `${project.location.latitude.toFixed(5)}:${project.location.longitude.toFixed(5)}`;
    const entries = projectsByCoordinateKey.get(coordinateKey) || [];
    entries.push(project);
    projectsByCoordinateKey.set(coordinateKey, entries);
  });

  return projects.flatMap(project => {
    const coordinateKey = `${project.location.latitude.toFixed(5)}:${project.location.longitude.toFixed(5)}`;
    const overlappingProjects = projectsByCoordinateKey.get(coordinateKey) || [];

    if (overlappingProjects.length <= 1) {
      return project;
    }

    const projectIndex = overlappingProjects.findIndex(entry => entry.id === project.id);
    if (projectIndex === -1) {
      return project;
    }

    const angle = (Math.PI * 2 * projectIndex) / overlappingProjects.length;
    const radius = 0.0035;
    const latitudeOffset = Math.sin(angle) * radius;
    const longitudeOffset = Math.cos(angle) * radius;

    return {
      ...project,
      location: {
        ...project.location,
        latitude: project.location.latitude + latitudeOffset,
        longitude: project.location.longitude + longitudeOffset,
      },
    };
  });
}

export function inferCoordinatesFromPlace(
  place: string,
  projects: Array<Pick<Project, 'location'>> = []
): ProjectCoordinates | null {
  const normalizedPlace = normalizePlaceValue(place);
  if (!normalizedPlace) {
    return null;
  }

  const exactProjectMatch = projects.find(project => {
    const normalizedAddress = normalizePlaceValue(project.location?.address);
    return normalizedAddress === normalizedPlace && hasUsableCoordinates(project.location);
  });

  if (exactProjectMatch) {
    return {
      latitude: exactProjectMatch.location.latitude,
      longitude: exactProjectMatch.location.longitude,
    };
  }

  const relatedProjectMatch = projects.find(project => {
    const normalizedAddress = normalizePlaceValue(project.location?.address);
    return (
      normalizedAddress &&
      (normalizedAddress.includes(normalizedPlace) ||
        normalizedPlace.includes(normalizedAddress)) &&
      hasUsableCoordinates(project.location)
    );
  });

  if (relatedProjectMatch) {
    return {
      latitude: relatedProjectMatch.location.latitude,
      longitude: relatedProjectMatch.location.longitude,
    };
  }

  const keywordMatch = KNOWN_PLACE_COORDINATES.find(entry =>
    entry.keywords.some(keyword => normalizedPlace.includes(keyword))
  );

  if (keywordMatch) {
    return {
      latitude: keywordMatch.latitude,
      longitude: keywordMatch.longitude,
    };
  }

  // No specific place found - do NOT default to Philippines ocean center.
  // Return null and let the caller handle appropriate fallback logic.
  return null;
}

// Shared map constants and helpers for project and event map screens.

export const PHILIPPINES_REGION = {
  latitude: 12.8797,
  longitude: 121.774,
  latitudeDelta: 8.5,
  longitudeDelta: 8.5,
};

export const PHILIPPINES_WEB_CENTER = {
  lat: PHILIPPINES_REGION.latitude,
  lng: PHILIPPINES_REGION.longitude,
};

export const PHILIPPINES_BOUNDS = {
  south: 4.5,
  west: 116.5,
  north: 21.5,
  east: 127.5,
};

export const NEGROS_REGION = {
  latitude: 10.4,
  longitude: 123.05,
  latitudeDelta: 0.85,
  longitudeDelta: 0.8,
};

export const IMPACT_MAP_MIN_REGION = {
  latitudeDelta: 4.8,
  longitudeDelta: 4.8,
};

// Returns the marker color for a project or event based only on lifecycle status.
export function getProjectMarkerColor(
  project: Pick<Project, 'isEvent' | 'status' | 'startDate' | 'endDate'>
) {
  return getProjectStatusColor(project);
}

export function getMappedProjects(projects: Project[]): Project[] {
  // Filter out programs (top-level items that are neither events nor have a parent)
  // Only show projects and events on the map
  const projectsAndEvents = projects.filter(project => {
    // If it has a parent, it's a project or event under a program - include it
    if (project.parentProjectId) {
      return true;
    }
    // If it's marked as an event, include it
    if (project.isEvent) {
      return true;
    }
    // Otherwise, it's a top-level program - exclude it
    return false;
  });

  const resolvedProjects = projectsAndEvents
    .map(project => resolveProjectMapPlacement(project, projects))
    .filter(project => hasUsableCoordinates(project.location));

  return spreadOverlappingProjectMarkers(resolvedProjects);
}

// Returns projects that could not be placed on the map (no coordinates and no resolvable address).
export function getUnmappedProjects(projects: Project[]): Project[] {
  return projects.filter(project => {
    const resolved = resolveProjectMapPlacement(project, projects);
    // A project is truly unmapped only if it still has no usable coordinates after all resolution
    // attempts AND its address is a placeholder (meaning the user never entered a real location).
    const address = getProjectLocationAddress(resolved);
    const isPlaceholder =
      !address ||
      address === 'Location to be finalized' ||
      address === 'Program location to be finalized';
    return isPlaceholder && !hasUsableCoordinates(project.location);
  });
}

// Computes an initial map region that keeps all known projects in view.
export function getInitialProjectRegion(projects: Project[]) {
  const mappedProjects = getMappedProjects(projects);

  if (mappedProjects.length === 0) {
    return NEGROS_REGION;
  }

  const latitudes = mappedProjects.map(project => project.location.latitude);
  const longitudes = mappedProjects.map(project => project.location.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max(
      (maxLatitude - minLatitude) * 1.8,
      IMPACT_MAP_MIN_REGION.latitudeDelta
    ),
    longitudeDelta: Math.max(
      (maxLongitude - minLongitude) * 1.8,
      IMPACT_MAP_MIN_REGION.longitudeDelta
    ),
  };
}
