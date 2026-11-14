export type PageView = 'landing' | 'dashboard';

// Removed: 'events' | 'models' | 'reports'
export type DashboardTab = 
  | 'overview' 
  | 'monitor' 
  | 'gait' 
  | 'people' 
  | 'settings';

export interface User {
  email: string;
  name: string;
  role: 'Administrator' | 'Investigator' | 'Analyst' | 'Viewer';
  isLoggedIn: boolean;
}

export interface CameraFeed {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'RECORDING';
  location: string;
  hasTrack: boolean;
  fps: number;
  resolution: string;
}

export interface PersonProfile {
  id: string;
  displayLabel: string;
  sequences: number;
  enrolledDate: string;
  status: 'Active' | 'Review' | 'Archived';
  category: string;
}
