import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../models/types';
import { getAllProjects } from '../models/storage';
import {
  PHILIPPINES_BOUNDS,
  PHILIPPINES_WEB_CENTER,
  getProjectMarkerColor,
} from '../utils/projectMap';
import { getProjectDisplayStatus, getProjectStatusColor } from '../utils/projectStatus';

const MapHost = 'div' as any;

// Resolves the Google Maps web API key from environment or Expo runtime config.
function getWebGoogleMapsApiKey(): string {
  const fromEnv =
    process.env.GOOGLE_MAPS_WEB_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_WEB_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;

  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  const constantsAny = Constants as typeof Constants & {
    manifest?: { extra?: Record<string, unknown> };
    manifest2?: { extra?: { expoClient?: { extra?: Record<string, unknown> } } };
  };

  const fromExpoConfig = Constants.expoConfig?.extra?.webGoogleMapsApiKey;
  const fromManifest = constantsAny.manifest?.extra?.webGoogleMapsApiKey;
  const fromManifest2 = constantsAny.manifest2?.extra?.expoClient?.extra?.webGoogleMapsApiKey;

  const resolvedKey =
    fromExpoConfig ??
    fromManifest ??
    fromManifest2 ??
    'AIzaSyDrZWSM9FJ7pURqvnd2lNqK5y0I084kupE';

  return typeof resolvedKey === 'string' && resolvedKey.trim().length > 0
    ? resolvedKey.trim()
    : 'AIzaSyDrZWSM9FJ7pURqvnd2lNqK5y0I084kupE';
}

// Loads the Google Maps browser script once and reuses the same promise.
function loadGoogleMapsScript(apiKey: string) {
  const browserWindow = window as Window & {
    google?: any;
    __googleMapsScriptPromise?: Promise<void>;
  };

  if (browserWindow.google?.maps) {
    return Promise.resolve();
  }

  if (browserWindow.__googleMapsScriptPromise) {
    return browserWindow.__googleMapsScriptPromise;
  }

  browserWindow.__googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-js-api') as HTMLScriptElement | null;

    const handleLoad = () => {
      if (browserWindow.google?.maps) {
        resolve();
        return;
      }

      reject(new Error('Google Maps JavaScript API did not initialize.'));
    };

    const handleError = () => reject(new Error('Failed to load Google Maps JavaScript API.'));

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js-api';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  return browserWindow.__googleMapsScriptPromise;
}

// Escapes dynamic strings before they are injected into Google Maps HTML content.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Displays the web version of the project map using Google Maps JavaScript API.
export default function MappingScreen({ navigation }: any) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const googleMapsApiKey = getWebGoogleMapsApiKey();
  const mapElementRef = useRef<HTMLDivElement | null>(null);

  const statusCategories = [
    { key: 'Planning', label: 'Planning (Draft)', tag: 'Draft', color: '#2563EB', desc: 'Draft / Upcoming' },
    { key: 'In Progress', label: 'In Progress (Active)', tag: 'Active', color: '#16A34A', desc: 'Active' },
    { key: 'On Hold', label: 'On Hold (Not Active Yet)', tag: 'Not Active Yet', color: '#D97706', desc: 'Not Active Yet / Paused' },
    { key: 'Completed', label: 'Completed (Closed)', tag: 'Closed', color: '#7C3AED', desc: 'Closed Projects' },
    { key: 'Cancelled', label: 'Cancelled', tag: 'Cancel Project', color: '#DC2626', desc: 'Cancel Project' },
  ];

  const filteredProjects = selectedStatus
    ? projects.filter(p => {
        const s = getProjectDisplayStatus(p) as any;
        if (selectedStatus === 'Planning') return s === 'Planning' || s === 'Planned' || (p as any).proposalStage;
        if (selectedStatus === 'In Progress' || selectedStatus === 'Active') return s === 'In Progress' || s === 'Active' || p.status === 'Approved';
        return s === selectedStatus;
      })
    : projects;

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (!googleMapsApiKey) {
      setMapError('Google Maps web key is missing. Add GOOGLE_MAPS_WEB_API_KEY to .env.');
      return;
    }

    if (!mapElementRef.current) {
      return;
    }

    let cancelled = false;
    const browserWindow = window as Window & {
      google?: any;
      gm_authFailure?: () => void;
    };

    browserWindow.gm_authFailure = () => {
      if (!cancelled) {
        setMapError('Google Maps rejected the web key. Check Maps JavaScript API and localhost referrer restrictions.');
      }
    };

    const renderMap = async () => {
      try {
        await loadGoogleMapsScript(googleMapsApiKey);
        if (cancelled || !mapElementRef.current || !browserWindow.google?.maps) {
          return;
        }

        setMapError(null);

        const map = new browserWindow.google.maps.Map(mapElementRef.current, {
          center: PHILIPPINES_WEB_CENTER,
          zoom: 6,
          minZoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          restriction: {
            latLngBounds: PHILIPPINES_BOUNDS,
            strictBounds: false,
          },
        });

        const bounds = new browserWindow.google.maps.LatLngBounds();
        const infoWindow = new browserWindow.google.maps.InfoWindow();

        filteredProjects.forEach((project, index) => {
          const marker = new browserWindow.google.maps.Marker({
            map,
            position: {
              lat: project.location.latitude,
              lng: project.location.longitude,
            },
            title: project.title,
            label: {
              text: String(index + 1),
              color: '#ffffff',
              fontWeight: '700',
            },
            icon: {
              path: browserWindow.google.maps.SymbolPath.CIRCLE,
              fillColor: getProjectMarkerColor(project),
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeOpacity: 1,
              strokeWeight: 2,
              scale: 12,
            },
          });

          bounds.extend(marker.getPosition());

          marker.addListener('click', () => {
            infoWindow.setContent(`
              <div style="width:220px;padding:14px;font-family:Arial,sans-serif;">
                <div style="margin-bottom:8px;font-size:16px;font-weight:700;color:#111827;">
                  ${escapeHtml(project.title)}
                </div>
                <div style="display:inline-block;margin-bottom:10px;padding:4px 10px;border-radius:999px;color:#fff;font-size:11px;font-weight:700;background:${getProjectMarkerColor(project)};">
                  ${escapeHtml(project.isEvent ? 'Event' : 'Program')}
                </div>
                <div style="margin-bottom:6px;font-size:12px;color:#4b5563;"><strong>Status:</strong> ${escapeHtml(project.status)}</div>
                <div style="margin-bottom:6px;font-size:12px;color:#4b5563;"><strong>Location:</strong> ${project.location.latitude.toFixed(4)}, ${project.location.longitude.toFixed(4)}</div>
                <div style="font-size:12px;color:#4b5563;"><strong>Volunteers Needed:</strong> ${project.volunteersNeeded}</div>
              </div>
            `);
            infoWindow.open({ anchor: marker, map });
            setSelectedProject(project);
            setShowDetails(true);
          });
        });

        if (filteredProjects.length > 0) {
          map.fitBounds(bounds, 48);
        }
      } catch (error) {
        if (!cancelled) {
          setMapError('Google Maps could not load. Check that Maps JavaScript API is enabled for the web key.');
        }
      }
    };

    void renderMap();

    return () => {
      cancelled = true;
      if (browserWindow.gm_authFailure) {
        delete browserWindow.gm_authFailure;
      }
    };
  }, [googleMapsApiKey, filteredProjects]);

  // Loads all projects so they can be rendered as web map markers.
  const loadProjects = async () => {
    try {
      const allProjects = await getAllProjects();
      setProjects(allProjects);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading projects for map:', error);
      setProjects([]);
      Alert.alert('Database Unavailable', error?.message || 'Failed to load projects from Postgres.');
      setLoading(false);
    }
  };

  // Redirects to the correct details screen for the currently selected project.
  const handleOpenProjectDetails = () => {
    if (!selectedProject) {
      return;
    }

    setShowDetails(false);
    if (selectedProject.isEvent) {
      navigation.navigate('VolunteerEventsScreen', { eventId: selectedProject.id });
    } else {
      navigation.navigate('ProjectLifecycleScreen', { projectId: selectedProject.id });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Negros Programs and Events</Text>
        <Text style={styles.headerSubtitle}>Marker map for Negros Occidental, Philippines</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 8,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        }}
      >
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: selectedStatus === null ? '#1e293b' : '#f1f5f9',
          }}
          onPress={() => setSelectedStatus(null)}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: selectedStatus === null ? '#ffffff' : '#475569' }}>
            All
          </Text>
          <View
            style={{
              backgroundColor: selectedStatus === null ? '#334155' : '#e2e8f0',
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: selectedStatus === null ? '#ffffff' : '#475569' }}>
              {projects.length}
            </Text>
          </View>
        </TouchableOpacity>

        {statusCategories.map(cat => {
          const count = projects.filter(p => {
            const s = getProjectDisplayStatus(p) as any;
            if (cat.key === 'Planning') return s === 'Planning' || s === 'Planned' || (p as any).proposalStage;
            if (cat.key === 'Active') return s === 'In Progress' || s === 'Active' || p.status === 'Approved';
            return s === cat.key;
          }).length;
          const isActive = selectedStatus === cat.key;

          return (
            <TouchableOpacity
              key={cat.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: isActive ? cat.color : '#f1f5f9',
              }}
              onPress={() => setSelectedStatus(current => (current === cat.key ? null : cat.key))}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isActive ? '#ffffff' : cat.color,
                }}
              />
              <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#ffffff' : '#334155' }}>
                {cat.label}
              </Text>
              <View
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: isActive ? '#ffffff' : '#475569' }}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.webMapContainer}>
        <MapHost ref={mapElementRef} style={styles.webMapFrame} />
        {mapError ? (
          <View style={styles.errorOverlay}>
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Google Maps is not available.</Text>
              <Text style={styles.errorText}>{mapError}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.projectListContainer}>
        <Text style={styles.projectListTitle}>Negros markers ({filteredProjects.length})</Text>
      </View>

      <Modal animationType="slide" transparent visible={showDetails} onRequestClose={() => setShowDetails(false)}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowDetails(false)}>
              <MaterialIcons name="close" size={28} color="#333" />
            </TouchableOpacity>

            {selectedProject && (
              <View style={styles.modalContent}>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: getProjectStatusColor(selectedProject.status) }]} />
                  <Text style={styles.statusText}>{selectedProject.status}</Text>
                </View>

                <Text style={styles.projectTitle}>{selectedProject.title}</Text>
                <Text style={styles.description}>{selectedProject.description}</Text>

                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Category</Text>
                    <Text style={styles.infoValue}>{selectedProject.category}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Volunteers Needed</Text>
                    <Text style={styles.infoValue}>{selectedProject.volunteersNeeded}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={handleOpenProjectDetails}
                >
                  <Text style={styles.viewDetailsButtonText}>View Full Details</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  webMapContainer: {
    position: 'relative',
    height: 420,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    overflow: 'hidden',
  },
  webMapFrame: {
    width: '100%',
    height: '100%',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 246, 241, 0.92)',
    paddingHorizontal: 24,
  },
  errorCard: {
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#12243d',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#243b53',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  projectListContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  projectListTitle: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    minHeight: '70%',
  },
  closeButton: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalContent: {
    paddingHorizontal: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  projectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  viewDetailsButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
