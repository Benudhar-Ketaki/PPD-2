import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Video, 
  Activity, 
  Users, 
  Settings, 
  Radio, 
  ChevronRight,
  Plus,
  Search,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  ShieldCheck,
  Server,
  Play,
  X,
  RefreshCw,
  FileVideo,
  Cpu,
  Layers,
  Sparkles,
  Clock,
  Crosshair,
  Sliders,
  Check,
  ExternalLink
} from 'lucide-react';
import { 
  SAMPLE_CAMERAS, 
  SAMPLE_PROFILES
} from '../data/mockData';
import { DashboardTab, PersonProfile } from '../types';
import { WalkTraceApi, DashboardOverview, AnalysisResult, CandidateMatch } from '../services/api';

export const DashboardPage: React.FC = () => {
  const { activeTab, setActiveTab, user } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean navigation tabs: Removed 'events', 'models', and 'reports'
  const navTabs: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'monitor', label: 'Live Monitor', icon: <Video className="w-4 h-4" /> },
    { id: 'gait', label: 'Gait Analysis', icon: <Activity className="w-4 h-4" /> },
    { id: 'people', label: 'People Profiles', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  // Live state from API Gateway
  const [overviewData, setOverviewData] = useState<DashboardOverview | null>(null);
  const [profiles, setProfiles] = useState<PersonProfile[]>(SAMPLE_PROFILES);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real S3 video upload & analysis state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoResolution, setVideoResolution] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'GaitBase-v1' | 'GaitGL-ET'>('GaitBase-v1');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'requesting_url' | 'uploading_s3' | 'queuing_analysis' | 'processing' | 'completed' | 'error'>('idle');
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [analysisResultData, setAnalysisResultData] = useState<AnalysisResult | null>(null);
  const abortUploadRef = useRef<{ abort?: () => void }>({});

  // New subject enrollment modal/form state
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollSubjectId, setEnrollSubjectId] = useState('');
  const [enrollLabel, setEnrollLabel] = useState('');
  const [enrollCategory, setEnrollCategory] = useState('Authorized Staff');
  const [enrollSaving, setEnrollSaving] = useState(false);

  // Fetch live overview telemetry from API Gateway
  useEffect(() => {
    let isMounted = true;
    WalkTraceApi.getDashboardOverview()
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setOverviewData(res.data);
        }
      })
      .catch((err) => {
        console.warn('[WalkTrace API] Could not load live overview, using cached telemetry:', err.message);
      });

    // Fetch profiles from DynamoDB
    WalkTraceApi.listProfiles()
      .then((res) => {
        if (isMounted && res.success && res.data?.profiles) {
          const mapped: PersonProfile[] = res.data.profiles.map((p) => ({
            id: p.profileId,
            displayLabel: p.displayName,
            category: p.category,
            sequences: p.sequences || 6,
            enrolledDate: p.enrolledDate || '12 Nov 2026',
            status: (p.status as any) || 'Active',
          }));
          setProfiles(mapped);
        }
      })
      .catch((err) => {
        console.warn('[WalkTrace API] Using default enrolled profiles:', err.message);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Video File Selection & Validation
  const processSelectedFile = (file: File) => {
    const validExtensions = ['.mp4', '.avi', '.mov', '.mkv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext) && !file.type.startsWith('video/')) {
      alert(`Invalid video format (${ext}). Supported formats: MP4, AVI, MOV, MKV.`);
      return;
    }

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    setSelectedFile(file);
    const objUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objUrl);
    setVideoDuration(null);
    setVideoResolution(null);
    setUploadStatus('idle');
    setUploadProgressPercent(0);
    setUploadProgressMsg('');
    setAnalysisResultData(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleResetVideo = () => {
    if (abortUploadRef.current?.abort) {
      abortUploadRef.current.abort();
    }
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setSelectedFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(null);
    setVideoResolution(null);
    setUploadStatus('idle');
    setUploadProgressPercent(0);
    setUploadProgressMsg('');
    setActiveAnalysisId(null);
    setAnalysisResultData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelUpload = () => {
    if (abortUploadRef.current?.abort) {
      abortUploadRef.current.abort();
    }
    setUploadStatus('idle');
    setUploadProgressPercent(0);
    setUploadProgressMsg('Upload canceled by operator.');
  };

  // Video Upload & AI Pipeline Execution
  const handleStartUploadAndAnalysis = async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus('requesting_url');
      setUploadProgressPercent(5);
      setUploadProgressMsg('Requesting secure presigned S3 upload authorization from API Gateway...');

      // 1. Get presigned upload URL
      const presignedRes = await WalkTraceApi.getVideoUploadUrl(selectedFile.name, selectedFile.type || 'video/mp4');
      const { videoId, s3Key, uploadUrl } = presignedRes.data;

      // 2. Upload file directly to Amazon S3 with real browser upload progress
      setUploadStatus('uploading_s3');
      setUploadProgressMsg(`Streaming binary directly to Amazon S3 bucket...`);

      await WalkTraceApi.uploadVideoToS3WithProgress(
        uploadUrl,
        selectedFile,
        (percent) => {
          setUploadProgressPercent(percent);
          setUploadProgressMsg(`Uploading to Amazon S3: ${percent}%`);
        },
        abortUploadRef.current
      );

      // 3. Confirm upload in DynamoDB with server-side HeadObject verification
      setUploadStatus('queuing_analysis');
      setUploadProgressPercent(100);
      setUploadProgressMsg('Verifying S3 object integrity via HeadObject & registering READY state...');
      
      await WalkTraceApi.completeVideoUpload(
        videoId,
        s3Key,
        selectedFile.name,
        selectedFile.size,
        videoDuration || undefined,
        videoResolution || undefined
      );

      // 4. Dispatch analysis job to Amazon SQS
      setUploadProgressMsg(`Enqueuing analysis job for ${selectedModel} in Amazon SQS pipeline...`);
      const jobRes = await WalkTraceApi.createAnalysisJob(videoId, 'TRACK-001', selectedModel);
      const analysisId = jobRes.data.analysisId;
      setActiveAnalysisId(analysisId);

      // 5. Poll for AI Worker results
      setUploadStatus('processing');
      setUploadProgressMsg(`AI Worker active: Extracting pedestrian silhouettes and computing ${selectedModel} embedding...`);

      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const res = await WalkTraceApi.getAnalysisResults(analysisId);
          if (res.success && res.data) {
            if (res.data.status === 'COMPLETED') {
              clearInterval(pollInterval);
              setAnalysisResultData(res.data);
              setUploadStatus('completed');
              setUploadProgressMsg('Gait analysis complete. Biometric identification finished.');
            } else if (res.data.status === 'FAILED') {
              clearInterval(pollInterval);
              setUploadStatus('error');
              setUploadProgressMsg(res.data.error || 'AI analysis failed on footage.');
            }
          }
        } catch {
          // Continue polling until terminal status or timeout
        }

        if (attempts > 60) {
          clearInterval(pollInterval);
          setUploadStatus('error');
          setUploadProgressMsg('Analysis timed out. Inference worker is taking longer than expected.');
        }
      }, 2000);

    } catch (err: any) {
      if (err.message === 'Upload canceled by user') {
        setUploadStatus('idle');
        setUploadProgressMsg('Upload canceled.');
      } else {
        console.error('[Upload/Analysis Error]', err);
        setUploadStatus('error');
        setUploadProgressMsg(err.message || 'Operation failed. Please check network connection or permissions.');
      }
    }
  };

  // Subject Enrollment
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollSubjectId.trim() || !enrollLabel.trim()) return;

    setEnrollSaving(true);
    try {
      await WalkTraceApi.createProfile({
        profileId: enrollSubjectId.toUpperCase(),
        displayName: enrollLabel,
        category: enrollCategory,
        status: 'Active',
      });

      // Update local state
      const newSubject: PersonProfile = {
        id: enrollSubjectId.toUpperCase(),
        displayLabel: enrollLabel,
        category: enrollCategory,
        sequences: 1,
        enrolledDate: 'Today',
        status: 'Active',
      };
      setProfiles((prev) => [newSubject, ...prev]);
      setIsEnrollModalOpen(false);
      setEnrollSubjectId('');
      setEnrollLabel('');
    } catch (err: any) {
      alert(`Could not save profile: ${err.message}`);
    } finally {
      setEnrollSaving(false);
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      p.displayLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-[calc(100vh-72px)] bg-bg-main text-slate-100">
      {/* Collapsible Left Sidebar */}
      <aside className="w-60 bg-bg-surface border-r border-borderLine flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider px-3">
              Surveillance Workspace
            </span>
            <nav className="space-y-1 pt-2">
              {navTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-bg-hover text-white border-l-2 border-brand-cyan shadow-sm'
                      : 'text-muted hover:text-white hover:bg-bg-panel'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-brand-cyan' : 'text-muted'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Operator status card */}
        <div className="p-3.5 rounded-xl bg-bg-panel border border-borderLine space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-brand-green font-medium">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              WalkTrace Node
            </span>
            <span className="text-[10px] font-mono text-muted">CAM 7/8</span>
          </div>
          <div className="text-[11px] font-bold text-white truncate">
            {user.name} ({user.role})
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-6 sm:p-8 space-y-6 overflow-y-auto">
        {/* Top telemetry breadcrumb */}
        <div className="flex items-center justify-between pb-4 border-b border-borderLine/60">
          <div>
            <div className="text-xs text-muted">
              WalkTrace / <span className="text-white font-semibold capitalize">{activeTab}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1 capitalize">
              {activeTab === 'overview' ? 'Operations Overview' : activeTab.replace('-', ' ')}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-[11px] font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
              AWS REGION: us-east-1
            </span>
            <button
              onClick={() => setActiveTab('gait')}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-brand-cyan to-brand-blue text-bg-main hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top 3 KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-bg-surface border border-borderLine space-y-1">
                <span className="text-xs text-muted">Active Camera Feeds</span>
                <div className="text-2xl font-black text-white">
                  {overviewData?.activeCamerasCount || '07 / 08'}
                </div>
                <div className="text-[10px] text-brand-green flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green" /> 1 Offline for maintenance
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface border border-borderLine space-y-1">
                <span className="text-xs text-muted">Tracks Detected Today</span>
                <div className="text-2xl font-black text-white">
                  {overviewData?.totalTracksToday?.toLocaleString() || '1,284'}
                </div>
                <div className="text-[10px] text-brand-cyan">Continuous pedestrian tracking</div>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface border border-borderLine space-y-1">
                <span className="text-xs text-muted">Enrolled Reference Profiles</span>
                <div className="text-2xl font-black text-white">
                  {profiles.length || overviewData?.enrolledProfilesCount || '246'}
                </div>
                <div className="text-[10px] text-muted">Active gallery subjects</div>
              </div>
            </div>

            {/* Split Grid: Live Cameras Preview & Activity Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: 4 Camera Previews */}
              <div className="lg:col-span-8 space-y-4">
                <div className="p-4 rounded-xl bg-bg-surface border border-borderLine space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Video className="w-4 h-4 text-brand-cyan" />
                      Live Surveillance Previews
                    </h3>
                    <button 
                      onClick={() => setActiveTab('monitor')}
                      className="text-xs text-brand-cyan hover:underline flex items-center gap-1"
                    >
                      <span>View All Cameras</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {SAMPLE_CAMERAS.slice(0, 4).map((cam) => (
                      <div key={cam.id} className="relative rounded-xl overflow-hidden bg-slate-900 border border-borderLine/80 group">
                        <img 
                          src="/landing-surveillance.png" 
                          alt={cam.name} 
                          className="w-full h-40 object-cover brightness-75 group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                          <span>{cam.id} · {cam.name}</span>
                        </div>
                        {cam.hasTrack && (
                          <div className="absolute top-[30%] left-[45%] w-[18%] h-[55%] border border-brand-cyan rounded shadow-[0_0_8px_rgba(69,215,226,0.5)]">
                            <span className="absolute -top-4 left-0 px-1 py-0.2 rounded bg-brand-cyan text-bg-main font-bold font-mono text-[8px]">
                              TRACK 01
                            </span>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-slate-300 font-mono bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                          <span>{cam.location}</span>
                          <span className="text-brand-green">{cam.fps} FPS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Feed Activity Stream */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 rounded-xl bg-bg-surface border border-borderLine space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-brand-green animate-pulse" />
                    Surveillance Feed Stream
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-bg-panel border border-borderLine text-xs space-y-1">
                      <div className="flex items-center justify-between text-white font-semibold">
                        <span>Person tracklet acquired</span>
                        <span className="text-[10px] font-mono text-muted">Just now</span>
                      </div>
                      <p className="text-muted text-[11px]">CAM-01 Main Corridor · Track ID #091</p>
                    </div>

                    <div className="p-3 rounded-lg bg-bg-panel border border-borderLine text-xs space-y-1">
                      <div className="flex items-center justify-between text-white font-semibold">
                        <span>Candidate match generated</span>
                        <span className="text-[10px] font-mono text-muted">2m ago</span>
                      </div>
                      <p className="text-muted text-[11px]">Matched Subject 104 with 94.2% score</p>
                    </div>

                    <div className="p-3 rounded-lg bg-bg-panel border border-borderLine text-xs space-y-1">
                      <div className="flex items-center justify-between text-brand-cyan font-semibold">
                        <span>Sequence extracted</span>
                        <span className="text-[10px] font-mono text-muted">6m ago</span>
                      </div>
                      <p className="text-muted text-[11px]">CAM-02 normalized 64×64 silhouette matrix</p>
                    </div>

                    <div className="p-3 rounded-lg bg-bg-panel border border-borderLine text-xs space-y-1">
                      <div className="flex items-center justify-between text-white font-semibold">
                        <span>Camera CAM-06 reconnected</span>
                        <span className="text-[10px] font-mono text-muted">12m ago</span>
                      </div>
                      <p className="text-muted text-[11px]">Loading Bay Access stream 30 FPS</p>
                    </div>
                  </div>
                </div>

                {/* Transit Distribution */}
                <div className="p-4 rounded-xl bg-bg-surface border border-borderLine space-y-3">
                  <h3 className="text-sm font-bold text-white">Transit Distribution</h3>
                  <div className="space-y-2.5 text-xs">
                    {(overviewData?.activityByZone || [
                      { zone: 'Entrance Checkpoints', tracks: 86, percentage: 86 },
                      { zone: 'West Corridor Walkway', tracks: 63, percentage: 63 },
                      { zone: 'South Lobby Transit', tracks: 29, percentage: 29 }
                    ]).map((item) => (
                      <div key={item.zone}>
                        <div className="flex justify-between text-muted mb-1">
                          <span>{item.zone}</span>
                          <span className="text-white font-mono">{item.tracks} tracks</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-brand-cyan" 
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE MONITOR */}
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-bg-surface border border-borderLine flex items-center justify-between">
              <div className="text-xs text-muted">
                Displaying 8 camera surveillance matrix. All streams running with AI bounding-box tracking overlays.
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg bg-bg-panel border border-borderLine text-xs font-semibold hover:text-white">
                  Filter by Zone
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-bg-panel border border-borderLine text-xs font-semibold hover:text-white">
                  Toggle Overlays
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SAMPLE_CAMERAS.map((cam) => (
                <div key={cam.id} className="rounded-xl overflow-hidden bg-slate-900 border border-borderLine group relative">
                  <img 
                    src="/landing-surveillance.png" 
                    alt={cam.name} 
                    className="w-full h-44 object-cover brightness-75 group-hover:scale-105 transition-transform" 
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-white flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${cam.status === 'ONLINE' ? 'bg-brand-green' : 'bg-red-500'}`} />
                    <span>{cam.id}</span>
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-brand-cyan">
                    {cam.status}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 p-2 rounded bg-black/60 backdrop-blur-md text-xs space-y-0.5">
                    <div className="font-bold text-white text-[11px] truncate">{cam.name}</div>
                    <div className="flex justify-between text-[10px] text-muted font-mono">
                      <span>{cam.location}</span>
                      <span>{cam.fps} FPS</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: GAIT ANALYSIS */}
        {activeTab === 'gait' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 text-xs text-brand-cyan flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <strong>WalkTrace AI Gait Recognition Pipeline</strong>: Upload surveillance footage directly to Amazon S3 via presigned authorization, isolate 64×64 pedestrian silhouettes, generate 256-D neural embeddings, and rank gallery biometric distance.
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-[10px] bg-brand-cyan/20 px-2 py-1 rounded">S3 Direct Upload</span>
                <span className="font-mono text-[10px] bg-brand-cyan/20 px-2 py-1 rounded">SQS Async</span>
                <span className="font-mono text-[10px] bg-brand-cyan/20 px-2 py-1 rounded">PyTorch 256-D</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Upload, Preview & Sequence Extraction */}
              <div className="lg:col-span-6 space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="video/mp4,video/avi,video/quicktime,video/mkv"
                  className="hidden"
                />

                {/* Upload & Video Preview Card */}
                <div className="p-5 rounded-2xl bg-bg-surface border border-borderLine space-y-4">
                  {!selectedFile ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`p-8 rounded-2xl border-2 border-dashed text-center space-y-3 cursor-pointer transition-all ${
                        dragActive 
                          ? 'border-brand-cyan bg-brand-cyan/10 scale-[1.01]' 
                          : 'border-borderLine hover:border-brand-cyan/70 bg-bg-panel/40'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-full bg-brand-cyan/15 text-brand-cyan flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                        <UploadCloud className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">
                          Drag & Drop Surveillance Footage Here
                        </h3>
                        <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                          Supports MP4, AVI, MOV footage (10–30s walking snippets recommended). Files stream directly to S3 without passing binary through Lambda.
                        </p>
                      </div>
                      <button 
                        type="button"
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-bg-surface border border-borderLine text-white hover:border-brand-cyan transition-colors"
                      >
                        Browse Local Footage
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Active Video Player & Metadata Header */}
                      <div className="relative rounded-xl overflow-hidden bg-black border border-borderLine">
                        {videoPreviewUrl && (
                          <video 
                            src={videoPreviewUrl} 
                            controls 
                            className="w-full h-48 object-contain bg-black"
                            onLoadedMetadata={(e) => {
                              const v = e.currentTarget;
                              setVideoDuration(Math.round(v.duration * 10) / 10);
                              setVideoResolution(`${v.videoWidth}x${v.videoHeight}`);
                            }}
                          />
                        )}
                        <button
                          onClick={handleResetVideo}
                          disabled={uploadStatus === 'uploading_s3' || uploadStatus === 'processing'}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-500/80 text-white backdrop-blur-md transition-colors"
                          title="Remove footage"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Video File Specifications */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                        <div className="p-2.5 rounded-lg bg-bg-panel border border-borderLine">
                          <span className="text-muted block text-[10px]">FILE NAME</span>
                          <span className="text-white font-bold truncate block">{selectedFile.name}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-bg-panel border border-borderLine">
                          <span className="text-muted block text-[10px]">FILE SIZE</span>
                          <span className="text-brand-cyan font-bold block">
                            {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-bg-panel border border-borderLine">
                          <span className="text-muted block text-[10px]">DURATION</span>
                          <span className="text-brand-green font-bold block">
                            {videoDuration ? `${videoDuration}s` : 'Detecting...'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-bg-panel border border-borderLine">
                          <span className="text-muted block text-[10px]">RESOLUTION</span>
                          <span className="text-white font-bold block">
                            {videoResolution || '1080p'}
                          </span>
                        </div>
                      </div>

                      {/* AI Model Selector */}
                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-brand-cyan" />
                          <span>Select Neural Architecture for Feature Extraction:</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setSelectedModel('GaitBase-v1')}
                            disabled={uploadStatus !== 'idle'}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              selectedModel === 'GaitBase-v1'
                                ? 'bg-brand-cyan/15 border-brand-cyan text-white shadow-sm'
                                : 'bg-bg-panel border-borderLine text-muted hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>GaitBase-v1</span>
                              {selectedModel === 'GaitBase-v1' && <Check className="w-3.5 h-3.5 text-brand-cyan" />}
                            </div>
                            <p className="text-[10px] text-muted mt-1 leading-snug">
                              OpenGait Deep Baseline. Spatial conv backbone with Horizontal Pyramid Pooling (HPP).
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedModel('GaitGL-ET')}
                            disabled={uploadStatus !== 'idle'}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              selectedModel === 'GaitGL-ET'
                                ? 'bg-brand-cyan/15 border-brand-cyan text-white shadow-sm'
                                : 'bg-bg-panel border-borderLine text-muted hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>GaitGL-ET</span>
                              {selectedModel === 'GaitGL-ET' && <Check className="w-3.5 h-3.5 text-brand-cyan" />}
                            </div>
                            <p className="text-[10px] text-muted mt-1 leading-snug">
                              Efficient Temporal GaitGL. Depthwise separable convolutions & frame differencing D(t).
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar & Status Display */}
                      {uploadStatus !== 'idle' && (
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-muted">{uploadProgressMsg}</span>
                            <span className="text-brand-cyan font-bold">{uploadProgressPercent}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                uploadStatus === 'completed'
                                  ? 'bg-brand-green'
                                  : uploadStatus === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-gradient-to-r from-brand-cyan to-brand-blue'
                              }`}
                              style={{ width: `${uploadProgressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Action Control Buttons */}
                      <div className="flex items-center gap-3 pt-2">
                        {uploadStatus === 'idle' && (
                          <>
                            <button
                              onClick={handleStartUploadAndAnalysis}
                              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-cyan to-brand-blue text-bg-main hover:brightness-110 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
                            >
                              <Play className="w-4 h-4 fill-current" />
                              <span>Start Direct S3 Upload & Biometric Analysis</span>
                            </button>
                            <button
                              onClick={handleResetVideo}
                              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-bg-panel border border-borderLine text-muted hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {uploadStatus === 'uploading_s3' && (
                          <button
                            onClick={handleCancelUpload}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 flex items-center justify-center gap-2 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel Upload</span>
                          </button>
                        )}

                        {(uploadStatus === 'queuing_analysis' || uploadStatus === 'processing') && (
                          <div className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Neural Analysis in Progress (SQS + PyTorch Worker)...</span>
                          </div>
                        )}

                        {uploadStatus === 'completed' && (
                          <button
                            onClick={handleResetVideo}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-brand-green/20 border border-brand-green/40 text-brand-green hover:bg-brand-green/30 flex items-center justify-center gap-2 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Analysis Complete · Analyze Another Video</span>
                          </button>
                        )}

                        {uploadStatus === 'error' && (
                          <button
                            onClick={handleStartUploadAndAnalysis}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 flex items-center justify-center gap-2 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span>Retry Analysis</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Silhouette Matrix Preview Section */}
                <div className="p-5 rounded-2xl bg-bg-surface border border-borderLine space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-brand-cyan" />
                      <span>Extracted Silhouette Stream (64×64 Centered Matrix)</span>
                    </span>
                    <span className="text-[10px] font-mono text-brand-green">
                      {analysisResultData?.silhouettesExtracted 
                        ? `${analysisResultData.silhouettesExtracted} Frames Processed` 
                        : 'MOG2 Centering Pipeline'}
                    </span>
                  </div>

                  {analysisResultData?.silhouettesPreviewUrl ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-black border border-borderLine overflow-x-auto flex justify-center">
                        <img 
                          src={analysisResultData.silhouettesPreviewUrl} 
                          alt="Extracted Silhouettes Preview Strip" 
                          className="max-h-20 object-contain rounded"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted">
                        <span>Source: s3://gaitvision-storage-dev/{analysisResultData.silhouettesS3Key}</span>
                        <span className="text-brand-cyan">Aspect Preserved · 64×64</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-black/80 border border-borderLine/60 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="flex items-center gap-3 text-2xl text-slate-600">
                        <span>🚶</span>
                        <span>🚶</span>
                        <span>🚶</span>
                        <span>🚶</span>
                        <span>🚶</span>
                      </div>
                      <span className="text-xs text-muted">
                        {uploadStatus === 'processing' 
                          ? 'Extracting pedestrian silhouette sequence from footage...' 
                          : 'Silhouette preview strip will appear here after analysis completes.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: AI Telemetry & Candidate Identification Output */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-5 rounded-2xl bg-bg-surface border border-borderLine space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-borderLine/60">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-brand-cyan" />
                      <span>Biometric Identification Results</span>
                    </h3>
                    <span className="text-[10px] font-mono text-brand-cyan bg-brand-cyan/15 px-2 py-0.5 rounded">
                      {analysisResultData?.modelId || selectedModel}
                    </span>
                  </div>

                  {/* Processing Telemetry Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px] font-mono">
                    <div className="p-2.5 rounded-lg bg-bg-panel border border-borderLine">
                      <span className="text-muted block text-[10px]">ANALYSIS STATUS</span>
                      <span className={`font-bold block ${
                        analysisResultData?.status === 'COMPLETED' ? 'text-brand-green' : 'text-brand-cyan'
                      }`}>
                        {analysisResultData?.status || (uploadStatus === 'processing' ? 'PROCESSING' : 'READY')}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-bg-panel border border-borderLine">
                      <span className="text-muted block text-[10px]">EMBEDDING DIM</span>
                      <span className="text-white font-bold block">
                        {analysisResultData?.embeddingDimension || 256}-D (L2 Unit)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-bg-panel border border-borderLine">
                      <span className="text-muted block text-[10px]">INFERENCE TIME</span>
                      <span className="text-brand-cyan font-bold block">
                        {analysisResultData?.inferenceTimeMs ? `${analysisResultData.inferenceTimeMs} ms` : '--'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-bg-panel border border-borderLine">
                      <span className="text-muted block text-[10px]">INPUT FOOTAGE</span>
                      <span className="text-white font-bold block">
                        {analysisResultData?.inputResolution ? `${analysisResultData.inputResolution} @ ${analysisResultData.fps}fps` : '--'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-bg-panel border border-borderLine">
                      <span className="text-muted block text-[10px]">FRAMES EXTRACTED</span>
                      <span className="text-brand-green font-bold block">
                        {analysisResultData?.silhouettesExtracted || '--'} frames
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-bg-panel border border-borderLine">
                      <span className="text-muted block text-[10px]">DISTANCE METRIC</span>
                      <span className="text-white font-bold block">Euclidean</span>
                    </div>
                  </div>

                  {/* Identification Match Status Banner */}
                  {analysisResultData?.matchState === 'NO_MATCH' && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">NO MATCH (Exceeds 1.35 Distance Threshold)</div>
                        <p className="text-[11px] text-amber-300/80 mt-0.5">
                          The gait sequence did not match any reference identity in the enrolled gallery above acceptable confidence. Subject may be un-enrolled.
                        </p>
                      </div>
                    </div>
                  )}

                  {analysisResultData?.matchState === 'MATCH_FOUND' && (
                    <div className="p-3.5 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">BIOMETRIC CANDIDATE MATCH CONFIRMED</div>
                        <p className="text-[11px] text-brand-green/80 mt-0.5">
                          High confidence biometric similarity match identified within configured distance threshold.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Ranked Candidate Gallery Results */}
                  <div className="space-y-3 pt-1">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Ranked Candidate Gallery Matches</span>
                      <span className="text-[10px] font-mono text-muted">Nearest Neighbor (L2)</span>
                    </div>

                    {(analysisResultData?.candidateMatches || [
                      { rank: 1, profileId: 'WT-0104', displayName: 'Enrolled Subject 104', similarityScore: '94.2', distance: '0.428', gaitCondition: 'Normal Walking (NM)', category: 'Authorized Staff', reviewStatus: 'UNCONFIRMED_HUMAN_REVIEW_REQUIRED' },
                      { rank: 2, profileId: 'WT-0087', displayName: 'Enrolled Subject 087', similarityScore: '88.7', distance: '0.582', gaitCondition: 'Bag Transit (BG)', category: 'Contractor', reviewStatus: 'UNCONFIRMED_HUMAN_REVIEW_REQUIRED' },
                      { rank: 3, profileId: 'WT-0062', displayName: 'Enrolled Subject 062', similarityScore: '72.1', distance: '0.814', gaitCondition: 'Outer Coat (CL)', category: 'Visitor', reviewStatus: 'UNCONFIRMED_HUMAN_REVIEW_REQUIRED' }
                    ]).map((candidate: any) => (
                      <div 
                        key={candidate.rank} 
                        className={`p-3.5 rounded-xl bg-bg-panel border space-y-2 transition-all ${
                          candidate.rank === 1 && analysisResultData?.matchState === 'MATCH_FOUND'
                            ? 'border-brand-green/60 bg-brand-green/5' 
                            : 'border-borderLine'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="font-bold text-white text-xs flex items-center gap-2">
                              <span>Rank {candidate.rank}: {candidate.displayName}</span>
                              <span className="text-[10px] font-mono text-muted">({candidate.profileId})</span>
                            </div>
                            <span className="text-[10px] text-muted block">
                              {candidate.category || 'General Subject'} · {candidate.gaitCondition}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              Number(candidate.similarityScore) >= 85
                                ? 'bg-brand-green/20 text-brand-green' 
                                : Number(candidate.similarityScore) >= 65
                                ? 'bg-brand-cyan/20 text-brand-cyan'
                                : 'bg-slate-700 text-slate-300'
                            }`}>
                              {candidate.similarityScore}% Match
                            </span>
                            <span className="text-[10px] font-mono text-muted block mt-0.5">
                              Dist: {candidate.distance}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-borderLine/50 flex items-center justify-between text-[10px] text-muted">
                          <span className="font-mono text-amber-400/90 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-amber-400" />
                            <span>{candidate.reviewStatus || 'UNCONFIRMED_HUMAN_REVIEW_REQUIRED'}</span>
                          </span>
                          <button
                            onClick={() => setActiveTab('people')}
                            className="text-brand-cyan hover:underline flex items-center gap-0.5"
                          >
                            <span>Inspect Profile</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-panel/50 border border-borderLine text-[11px] text-muted leading-relaxed space-y-1">
                    <p className="font-semibold text-slate-300">Biometric Verification Governance Disclaimer:</p>
                    <p>
                      Candidate similarity scores represent statistical Euclidean and Cosine biometric distance rankings produced by the deep neural network. Biometric rankings do not constitute legal confirmation of identity and must be confirmed by an authorized human operator.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PEOPLE PROFILES */}
        {activeTab === 'people' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-bg-surface border border-borderLine flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search enrolled identity gallery..."
                  className="w-full bg-bg-panel border border-borderLine rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-muted focus:outline-none focus:border-brand-cyan"
                />
              </div>
              <button 
                onClick={() => setIsEnrollModalOpen(true)}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-brand-cyan to-brand-blue text-bg-main hover:brightness-110 flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll Reference Subject</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl bg-bg-surface border border-borderLine">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-borderLine text-muted text-[11px]">
                    <th className="p-3.5 font-semibold">Subject ID</th>
                    <th className="p-3.5 font-semibold">Display Label</th>
                    <th className="p-3.5 font-semibold">Category</th>
                    <th className="p-3.5 font-semibold">Enrolled Sequences</th>
                    <th className="p-3.5 font-semibold">Enrollment Date</th>
                    <th className="p-3.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderLine/50">
                  {filteredProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-bg-panel/50 transition-colors">
                      <td className="p-3.5 font-mono text-brand-cyan font-bold">{p.id}</td>
                      <td className="p-3.5 font-semibold text-white">{p.displayLabel}</td>
                      <td className="p-3.5 text-muted">{p.category}</td>
                      <td className="p-3.5 font-mono text-slate-300">{p.sequences} sequences</td>
                      <td className="p-3.5 font-mono text-muted text-[11px]">{p.enrolledDate}</td>
                      <td className="p-3.5 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.status === 'Active'
                            ? 'bg-brand-green/20 text-brand-green border border-brand-green/40'
                            : p.status === 'Review'
                            ? 'bg-brand-amber/20 text-brand-amber border border-brand-amber/40'
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subject Enrollment Modal */}
            {isEnrollModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="w-full max-w-md bg-bg-surface border border-borderLine rounded-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-borderLine">
                    <h3 className="text-base font-bold text-white">Enroll Reference Subject</h3>
                    <button
                      onClick={() => setIsEnrollModalOpen(false)}
                      className="text-muted hover:text-white text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleEnrollSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-muted font-medium">Subject ID (e.g. WT-0150)</label>
                      <input
                        type="text"
                        required
                        value={enrollSubjectId}
                        onChange={(e) => setEnrollSubjectId(e.target.value)}
                        placeholder="WT-0150"
                        className="w-full bg-bg-panel border border-borderLine rounded-lg px-3 py-2 text-white placeholder-muted focus:outline-none focus:border-brand-cyan"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-muted font-medium">Display Name / Label</label>
                      <input
                        type="text"
                        required
                        value={enrollLabel}
                        onChange={(e) => setEnrollLabel(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-bg-panel border border-borderLine rounded-lg px-3 py-2 text-white placeholder-muted focus:outline-none focus:border-brand-cyan"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-muted font-medium">Department / Category</label>
                      <select
                        value={enrollCategory}
                        onChange={(e) => setEnrollCategory(e.target.value)}
                        className="w-full bg-bg-panel border border-borderLine rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-cyan"
                      >
                        <option value="Authorized Staff">Authorized Staff</option>
                        <option value="Contractor">Contractor</option>
                        <option value="Security Ops">Security Ops</option>
                        <option value="Visitor">Visitor</option>
                        <option value="Logistics">Logistics</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsEnrollModalOpen(false)}
                        className="px-4 py-2 rounded-lg bg-bg-panel border border-borderLine text-white hover:bg-bg-hover"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={enrollSaving}
                        className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-brand-cyan to-brand-blue text-bg-main hover:brightness-110 flex items-center gap-1.5"
                      >
                        {enrollSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>Save to DynamoDB</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-bg-surface border border-borderLine">
              <h3 className="text-sm font-bold text-white mb-1">WalkTrace System Configuration</h3>
              <p className="text-xs text-muted">Active AWS Serverless v4 infrastructure parameters, Cognito authentication, and DynamoDB data stores.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-bg-surface border border-borderLine space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-brand-cyan" />
                  AWS Serverless Infrastructure (us-east-1)
                </div>
                <div className="font-mono text-muted text-[11px] space-y-2">
                  <div className="p-2 rounded bg-bg-panel border border-borderLine">
                    <span className="text-slate-400 block text-[10px]">API GATEWAY ENDPOINT:</span>
                    <span className="text-brand-cyan break-all">https://dhxv2f51l1.execute-api.us-east-1.amazonaws.com/dev</span>
                  </div>
                  <div className="p-2 rounded bg-bg-panel border border-borderLine">
                    <span className="text-slate-400 block text-[10px]">COGNITO USER POOL ID:</span>
                    <span className="text-white">us-east-1_fLyGM6BsL</span>
                  </div>
                  <div className="p-2 rounded bg-bg-panel border border-borderLine">
                    <span className="text-slate-400 block text-[10px]">DYNAMODB SINGLE-TABLE:</span>
                    <span className="text-white">gaitvision-main-dev (PK, SK, GSI1)</span>
                  </div>
                  <div className="p-2 rounded bg-bg-panel border border-borderLine">
                    <span className="text-slate-400 block text-[10px]">S3 STORAGE BUCKET:</span>
                    <span className="text-white">gaitvision-storage-dev</span>
                  </div>
                  <div className="p-2 rounded bg-bg-panel border border-borderLine">
                    <span className="text-slate-400 block text-[10px]">SQS ASYNC PIPELINE:</span>
                    <span className="text-white">gaitvision-jobs-queue-dev</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg-surface border border-borderLine space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-green" />
                  Operator Session & Access Control
                </div>
                <div className="space-y-2 text-slate-300">
                  <div className="p-2.5 rounded bg-bg-panel border border-borderLine space-y-1">
                    <div className="text-[10px] text-muted uppercase">Authenticated Identity</div>
                    <div className="text-white font-semibold">{user.email || 'operator@walktrace.ai'}</div>
                    <div className="text-[11px] text-slate-400">Name: {user.name}</div>
                  </div>
                  <div className="p-2.5 rounded bg-bg-panel border border-borderLine space-y-1">
                    <div className="text-[10px] text-muted uppercase">Assigned Security Role</div>
                    <div className="text-brand-cyan font-bold">{user.role}</div>
                  </div>
                  <div className="p-2.5 rounded bg-bg-panel border border-borderLine space-y-1">
                    <div className="text-[10px] text-muted uppercase">Authentication Security</div>
                    <div className="text-brand-green font-mono text-[11px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                      AWS Cognito SRP + Email OTP Verified
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-bg-panel border border-borderLine space-y-1">
                    <div className="text-[10px] text-muted uppercase">AI Inference Engine</div>
                    <div className="text-slate-200 font-mono text-[11px]">
                      GaitBase-v1 (PyTorch / OpenGait Pretrained Checkpoint)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
