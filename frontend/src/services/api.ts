const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'https://dhxv2f51l1.execute-api.us-east-1.amazonaws.com/dev';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('walktrace_id_token') || localStorage.getItem('walktrace_access_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || errJson.error || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    throw new Error(`API Error [${response.status}]: ${errorDetail}`);
  }

  return response.json();
}

export interface DashboardOverview {
  activeCamerasCount: string;
  totalTracksToday: number;
  enrolledProfilesCount: number;
  needsReviewCount: number;
  systemStatus: string;
  nodeRegion: string;
  authenticatedUser: {
    email: string;
    role: string;
  };
  activityByZone: Array<{
    zone: string;
    tracks: number;
    percentage: number;
  }>;
}

export interface GaitProfile {
  profileId: string;
  displayName: string;
  sequences: number;
  category: string;
  status: string;
  enrolledDate: string;
}

export interface VideoUploadUrlResponse {
  videoId: string;
  s3Key: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface AnalysisJob {
  analysisId: string;
  videoId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  modelId: string;
  selectedTrackId?: string;
  createdAt: string;
}

export interface CandidateMatch {
  rank: number;
  profileId: string;
  displayName: string;
  category?: string;
  gaitCondition: string;
  distance: string | number;
  similarityScore: string | number;
  reviewStatus?: string;
}

export interface AnalysisResult {
  analysisId: string;
  videoId: string;
  status: string;
  modelId?: string;
  modelVersion?: string;
  matchState?: 'MATCH_FOUND' | 'NO_MATCH';
  candidateMatches: CandidateMatch[];
  silhouettesExtracted?: number;
  silhouettesS3Key?: string;
  silhouettesPreviewUrl?: string;
  inputResolution?: string;
  fps?: string;
  videoDuration?: string;
  inferenceTimeMs?: string;
  embeddingDimension?: number;
  distanceMetric?: string;
  trackId?: string;
  completedAt?: string;
  error?: string;
  disclaimer?: string;
}

export const WalkTraceApi = {
  // Dashboard Telemetry
  async getDashboardOverview(): Promise<{ success: boolean; data: DashboardOverview }> {
    return request('/dashboard/overview');
  },

  async getDashboardActivity(): Promise<{ success: boolean; data: any }> {
    return request('/dashboard/activity');
  },

  // Video Management & Presigned Uploads
  async getVideoUploadUrl(fileName: string, fileType = 'video/mp4'): Promise<{ success: boolean; data: VideoUploadUrlResponse }> {
    return request('/videos/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType }),
    });
  },

  async uploadVideoToS3WithProgress(
    uploadUrl: string,
    file: File,
    onProgress: (percent: number) => void,
    abortSignalRef?: { abort?: () => void }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      if (abortSignalRef) {
        abortSignalRef.abort = () => xhr.abort();
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`S3 direct upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error occurred during direct S3 video upload'));
      xhr.onabort = () => reject(new Error('Upload canceled by user'));

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.send(file);
    });
  },

  async completeVideoUpload(
    videoId: string, 
    s3Key: string, 
    fileName: string, 
    fileSize?: number, 
    duration?: number, 
    resolution?: string
  ): Promise<{ success: boolean; data: any }> {
    return request('/videos/complete-upload', {
      method: 'POST',
      body: JSON.stringify({ videoId, s3Key, fileName, fileSize, duration, resolution }),
    });
  },

  async listVideos(): Promise<{ success: boolean; data: { videos: any[]; total: number } }> {
    return request('/videos');
  },

  async getVideoById(videoId: string): Promise<{ success: boolean; data: any }> {
    return request(`/videos/${videoId}`);
  },

  // Gait Analysis Pipelines & SQS Dispatch
  async createAnalysisJob(videoId: string, selectedTrackId = 'TRACK-001', modelId = 'GaitBase-v1'): Promise<{ success: boolean; data: AnalysisJob }> {
    return request('/analysis', {
      method: 'POST',
      body: JSON.stringify({ videoId, selectedTrackId, modelId }),
    });
  },

  async listAnalysisJobs(): Promise<{ success: boolean; data: { jobs: AnalysisJob[]; total: number } }> {
    return request('/analysis');
  },

  async getAnalysisJob(analysisId: string): Promise<{ success: boolean; data: AnalysisJob }> {
    return request(`/analysis/${analysisId}`);
  },

  async getAnalysisResults(analysisId: string): Promise<{ success: boolean; data: AnalysisResult }> {
    return request(`/analysis/${analysisId}/results`);
  },

  // Gait Profiles Gallery
  async listProfiles(): Promise<{ success: boolean; data: { profiles: GaitProfile[]; total: number } }> {
    return request('/profiles');
  },

  async createProfile(profile: Partial<GaitProfile>): Promise<{ success: boolean; data: GaitProfile }> {
    return request('/profiles', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },

  async getProfileById(profileId: string): Promise<{ success: boolean; data: GaitProfile }> {
    return request(`/profiles/${profileId}`);
  },

  // Events & Operator Review
  async listEvents(): Promise<{ success: boolean; data: { events: any[]; total: number } }> {
    return request('/events');
  },

  async reviewEvent(eventId: string, reviewStatus: 'CONFIRMED' | 'REJECTED' | 'FLAGGED', notes?: string): Promise<{ success: boolean; data: any }> {
    return request(`/events/${eventId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ reviewStatus, notes }),
    });
  },

  // Model Registry & Evaluations
  async listModels(): Promise<{ success: boolean; data: any }> {
    return request('/models');
  },

  async listEvaluations(): Promise<{ success: boolean; data: any }> {
    return request('/models/evaluations');
  },
};
