import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Shield, 
  ArrowRight, 
  Video, 
  Cpu, 
  CheckCircle2, 
  Activity, 
  ChevronRight,
  Database,
  Search
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <div className="min-h-screen bg-bg-main text-slate-100">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-6 sm:px-12 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 left-10 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column: Headlines & CTA */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              INTELLIGENT SURVEILLANCE PLATFORM
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              AI-Powered Gait Intelligence for <span className="bg-gradient-to-r from-brand-cyan to-brand-blue bg-clip-text text-transparent">Smarter Surveillance</span>
            </h1>

            <p className="text-sm sm:text-base text-muted max-w-xl leading-relaxed">
              WalkTrace provides a unified platform for human identification and movement analysis using gait recognition. Enhance security with non-intrusive, AI-driven person re-identification across multiple camera views.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-cyan to-brand-blue text-bg-main hover:brightness-110 shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <span>Explore Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#workflow"
                className="px-6 py-3.5 rounded-xl font-semibold text-sm bg-bg-surface border border-borderLine text-slate-200 hover:text-white hover:border-brand-cyan/50 hover:bg-bg-panel transition-all flex items-center gap-2"
              >
                <span>How It Works</span>
              </a>
            </div>

            {/* Micro badges below hero CTA */}
            <div className="flex items-center gap-6 pt-4 text-xs text-muted border-t border-borderLine/50">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-cyan" />
                <span>Non-Intrusive Identification</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-green" />
                <span>Real-Time Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-blue" />
                <span>Research Driven</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Video Frame Visual */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl border border-borderLine bg-bg-surface p-2 shadow-2xl shadow-cyan-950/40 group overflow-hidden">
              <div className="absolute top-5 left-5 right-5 z-20 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-white">
                  <Video className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>CAM 04 - Main Corridor</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-600/80 backdrop-blur-md text-white font-bold tracking-wider text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>LIVE DEMO</span>
                </div>
              </div>

              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                <img
                  src="/landing-surveillance.png"
                  alt="Surveillance Feed Corridor"
                  className="w-full h-full object-cover brightness-90 group-hover:scale-105 transition-transform duration-700"
                />

                <div className="absolute top-[22%] left-[45%] w-[18%] h-[68%] border-2 border-brand-cyan rounded shadow-[0_0_15px_rgba(69,215,226,0.6)]">
                  <span className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-brand-cyan text-bg-main font-bold font-mono text-[10px]">
                    ID: P-017
                  </span>
                </div>

                <div className="absolute bottom-12 right-4 px-2 py-1 rounded bg-black/70 backdrop-blur-md font-mono text-[11px] text-slate-300">
                  2026-11-14 14:28:16
                </div>

                <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-md p-3 flex items-center gap-3 text-xs text-slate-300">
                  <button className="text-white hover:text-brand-cyan font-bold">❚❚</button>
                  <span className="font-mono text-[11px]">00:12 / 00:30</span>
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="w-[40%] h-full bg-gradient-to-r from-brand-cyan to-brand-blue" />
                  </div>
                  <span className="text-[10px] text-brand-green font-mono">30 FPS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="py-20 px-6 sm:px-12 bg-bg-surface/50 border-y border-borderLine/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Platform <span className="bg-gradient-to-r from-brand-cyan to-brand-blue bg-clip-text text-transparent">Capabilities</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              A unified solution for gait-based surveillance, biometric re-identification, and human analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-bg-panel border border-borderLine hover:border-brand-cyan/60 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Live Monitoring</h3>
              <p className="text-xs text-muted leading-relaxed">
                Real-time video surveillance with continuous pedestrian detection and movement tracking across multi-camera streams.
              </p>
              <div className="pt-2 text-xs font-semibold text-brand-cyan flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>View Cameras</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-bg-panel border border-borderLine hover:border-brand-cyan/60 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/15 border border-brand-blue/30 text-brand-blue flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Gait Identification</h3>
              <p className="text-xs text-muted leading-relaxed">
                Identify and re-identify individuals using unique walking patterns (gait) even from distant or occlusion-prone views.
              </p>
              <div className="pt-2 text-xs font-semibold text-brand-blue flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Run Identification</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-bg-panel border border-borderLine hover:border-brand-cyan/60 transition-all group space-y-4">
              <div className="w-12 h-12 rounded-xl bg-brand-green/15 border border-brand-green/30 text-brand-green flex items-center justify-center group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Identity Gallery Management</h3>
              <p className="text-xs text-muted leading-relaxed">
                Manage enrolled reference subjects, reference walking sequence templates, and access permissions.
              </p>
              <div className="pt-2 text-xs font-semibold text-brand-green flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Inspect Profiles</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="workflow" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            How It <span className="bg-gradient-to-r from-brand-cyan to-brand-blue bg-clip-text text-transparent">Works</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            From video input to person identification — a simple, effective, and robust pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-bg-surface border border-borderLine space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 rounded bg-brand-cyan text-bg-main font-bold font-mono">1</span>
              <span className="font-semibold text-white">CCTV Video Input</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 border border-borderLine/50 relative">
              <img src="/landing-surveillance.png" alt="CCTV Input" className="w-full h-full object-cover brightness-75" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  ▶
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted">
              Live or recorded multi-camera surveillance video stream acquisition.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-bg-surface border border-borderLine space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 rounded bg-brand-cyan text-bg-main font-bold font-mono">2</span>
              <span className="font-semibold text-white">Person Tracking</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 border border-borderLine/50 relative">
              <img src="/landing-surveillance.png" alt="Person Tracking" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-6 right-6 bottom-2 border border-brand-cyan rounded shadow-[0_0_10px_rgba(69,215,226,0.6)]" />
            </div>
            <p className="text-[11px] text-muted">
              Pedestrian detection bounding box with spatial-temporal tracklet linking.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-bg-surface border border-borderLine space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 rounded bg-brand-cyan text-bg-main font-bold font-mono">3</span>
              <span className="font-semibold text-white">Silhouette Extraction</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-black border border-borderLine/50 flex items-center justify-center p-3">
              <div className="flex items-end justify-center gap-2 text-white font-mono text-2xl font-black">
                <span className="opacity-60 text-lg">🚶</span>
                <span className="opacity-80 text-xl">🚶</span>
                <span className="text-brand-cyan text-2xl">🚶</span>
                <span className="text-xs text-muted font-normal self-center">...</span>
              </div>
            </div>
            <p className="text-[11px] text-muted">
              Background subtraction & normalization to standard 64×64 silhouette sequences.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-bg-surface border border-borderLine space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 rounded bg-brand-cyan text-bg-main font-bold font-mono">4</span>
              <span className="font-semibold text-white">Gait Matching</span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-bg-panel border border-borderLine/50 p-3 space-y-2">
              <div className="p-2 rounded bg-bg-surface border border-brand-green/40 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white text-[11px]">ID: P-017</div>
                  <div className="text-[9px] text-brand-green font-mono">Similarity: 0.96</div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-brand-green" />
              </div>
              <div className="p-1.5 rounded bg-bg-surface/50 border border-borderLine text-[10px] flex items-center justify-between text-muted">
                <div>ID: P-031</div>
                <div>Similarity: 0.71</div>
              </div>
            </div>
            <p className="text-[11px] text-muted">
              Deep embedding extraction & similarity distance ranking against enrolled gallery.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="py-12 px-6 sm:px-12 border-t border-borderLine bg-bg-main text-xs text-muted">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center text-bg-main font-bold">
              <Shield className="w-4 h-4 text-bg-main" />
            </div>
            <span className="font-bold text-white text-sm">WalkTrace Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <span>PPD Academic Research Project</span>
            <span>•</span>
            <span>Intelligent Gait Recognition for Video Surveillance</span>
          </div>

          <div className="text-[11px] text-muted">
            © 2026 WalkTrace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
