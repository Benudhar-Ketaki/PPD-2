import { CameraFeed, PersonProfile } from '../types';

export const SAMPLE_CAMERAS: CameraFeed[] = [
  { id: 'CAM-01', name: 'Main Entrance Corridor', status: 'ONLINE', location: 'Gate Alpha', hasTrack: true, fps: 30, resolution: '1080p' },
  { id: 'CAM-02', name: 'East Concourse Transit', status: 'ONLINE', location: 'Wing B Corridor', hasTrack: true, fps: 30, resolution: '1080p' },
  { id: 'CAM-03', name: 'South Lobby Checkpoint', status: 'ONLINE', location: 'Central Lobby', hasTrack: false, fps: 25, resolution: '1080p' },
  { id: 'CAM-04', name: 'West Maintenance Pathway', status: 'ONLINE', location: 'Facility Perimeter', hasTrack: true, fps: 30, resolution: '1080p' },
  { id: 'CAM-05', name: 'North Parking Transit', status: 'ONLINE', location: 'Zone 4 Parking', hasTrack: false, fps: 25, resolution: '720p' },
  { id: 'CAM-06', name: 'Loading Bay Access', status: 'ONLINE', location: 'Service Gate 3', hasTrack: true, fps: 30, resolution: '1080p' },
  { id: 'CAM-07', name: 'Terminal 2 Concourse', status: 'ONLINE', location: 'Public Atrium', hasTrack: false, fps: 30, resolution: '1080p' },
  { id: 'CAM-08', name: 'Perimeter Fence Line', status: 'OFFLINE', location: 'External Perimeter', hasTrack: false, fps: 0, resolution: '1080p' },
];

export const SAMPLE_PROFILES: PersonProfile[] = [
  { id: 'WT-0104', displayLabel: 'Enrolled Subject 104', sequences: 12, enrolledDate: '12 Nov 2026', status: 'Active', category: 'Authorized Staff' },
  { id: 'WT-0087', displayLabel: 'Enrolled Subject 087', sequences: 9, enrolledDate: '10 Nov 2026', status: 'Active', category: 'Contractor' },
  { id: 'WT-0062', displayLabel: 'Enrolled Subject 062', sequences: 7, enrolledDate: '08 Nov 2026', status: 'Review', category: 'Visitor' },
  { id: 'WT-0045', displayLabel: 'Enrolled Subject 045', sequences: 14, enrolledDate: '05 Nov 2026', status: 'Active', category: 'Security Ops' },
  { id: 'WT-0031', displayLabel: 'Enrolled Subject 031', sequences: 6, enrolledDate: '01 Nov 2026', status: 'Active', category: 'Logistics' },
  { id: 'WT-0019', displayLabel: 'Enrolled Subject 019', sequences: 4, enrolledDate: '28 Oct 2026', status: 'Archived', category: 'Temporary Pass' },
];
