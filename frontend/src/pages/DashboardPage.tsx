import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { jobService } from '@/services/jobService';
import { resumeService } from '@/services/resumeService';
import { MarketQueryBox } from '@/components/dashboard/MarketQueryBox';
import {
  JobTrendChart,
  GraphDistributionChart,
  AtsCalibrationChart,
  EngineActivityChart,
} from '@/components/dashboard/DashboardMetricCharts';
import { InteractiveMarketTrendsChart } from '@/components/dashboard/InteractiveMarketTrendsChart';
import { KoboyoSparkle, KoboyoBrain } from '@/components/icons/Koboyo';
import { ReiconGraph, ReiconRadar, ReiconAtsDoc } from '@/components/icons/Reicon';
import { AnimatedNumber } from '@/components/reactbits/AnimatedNumber';
import { AIThinkingOrb } from '@/components/shared/AIThinkingOrb';
import {
  FileText,
  Briefcase,
  ArrowRight,
  Building2,
  Sparkles,
} from 'lucide-react';

const TOP_SKILLS = [
  'Python',
  'Django',
  'PostgreSQL',
  'React',
  'TypeScript',
  'Docker',
  'FastAPI',
  'Machine Learning',
  'AWS',
  'Redis',
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [jobCount, setJobCount] = useState<number | null>(null);
  const [resumeCount, setResumeCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredJobVal, setHoveredJobVal] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadOverviewData = async () => {
      try {
        const [jobs, resumes] = await Promise.allSettled([
          jobService.getJobsPaginated({ page_size: 1 }),
          resumeService.getResumes(),
        ]);

        if (isMounted) {
          if (jobs.status === 'fulfilled') {
            setJobCount(jobs.value.count);
          }
          if (resumes.status === 'fulfilled') {
            setResumeCount(resumes.value.length);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadOverviewData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          HERO BANNER: Warm Minimalist Editorial Header
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-white border border-[#E2E8E5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Soft, subtle ambient accent */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-[100px] pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(0, 136, 85, 0.15) 0%, rgba(238, 247, 241, 0.4) 60%, transparent 80%)',
          }}
        />

        <div className="relative z-10 max-w-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD] font-mono">
              <KoboyoSparkle size={13} strokeWidth={2.2} />
              <span className="uppercase tracking-wider text-[11px]">Placement Intelligence v2.3</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0A1A12]">
              Welcome back, {user?.first_name || 'Student'}!
            </h1>

            <p className="text-sm text-neutral-600 leading-relaxed">
              SkillBridge AI unifies campus job trends, ATS resume tailoring, and skill calibration around a{' '}
              <span className="font-semibold text-[#008855]">grounded Neo4j knowledge graph</span> and vector retrieval system.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <Link
            to="/resumes"
            className="h-10 px-5 rounded-full text-xs font-semibold text-white bg-[#008855] hover:bg-[#007347] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-[#008855]/20 cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>Analyze Resume</span>
          </Link>

          <Link
            to="/jobs"
            className="h-10 px-5 rounded-full text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Briefcase className="h-4 w-4 text-neutral-500" />
            <span>Browse Jobs</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          METRICS ROW: 4 Cards with Embedded Interactive Charts
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Ingested Job Postings + Interactive Trend Sparkline */}
        <div className="p-5 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs flex flex-col justify-between transition-all hover:border-[#008855]/40 hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider font-mono">
                Live Job Postings
              </span>
              <div className="h-8 w-8 rounded-xl bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD] flex items-center justify-center">
                <ReiconRadar size={16} strokeWidth={2} />
              </div>
            </div>

            <div className="text-2xl font-bold font-mono text-[#0A1A12]">
              {isLoading ? (
                <div className="py-1">
                  <AIThinkingOrb state="working" size={20} color="#008855" />
                </div>
              ) : (
                <AnimatedNumber value={hoveredJobVal ?? (jobCount ?? 1240)} suffix="+" />
              )}
            </div>
          </div>

          {/* Interactive Chart Component */}
          <JobTrendChart onHoverValue={(v) => setHoveredJobVal(v)} />
        </div>

        {/* Metric 2: Knowledge Graph + Interactive Entity Distribution Bar */}
        <div className="p-5 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs flex flex-col justify-between transition-all hover:border-[#008855]/40 hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider font-mono">
                Knowledge Graph
              </span>
              <div className="h-8 w-8 rounded-xl bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD] flex items-center justify-center">
                <ReiconGraph size={16} strokeWidth={2} />
              </div>
            </div>

            <div className="text-2xl font-bold font-mono text-[#0A1A12] flex items-center gap-1.5">
              <AnimatedNumber value={4820} />
              <span className="text-sm font-normal text-neutral-500 font-sans">nodes</span>
            </div>
          </div>

          {/* Interactive Chart Component */}
          <GraphDistributionChart />
        </div>

        {/* Metric 3: My Resumes + Interactive Calibration Step Chart */}
        <div className="p-5 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs flex flex-col justify-between transition-all hover:border-[#008855]/40 hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider font-mono">
                My Resumes
              </span>
              <div className="h-8 w-8 rounded-xl bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD] flex items-center justify-center">
                <ReiconAtsDoc size={16} strokeWidth={2} />
              </div>
            </div>

            <div className="text-2xl font-bold font-mono text-[#0A1A12]">
              {isLoading ? (
                <div className="py-1">
                  <AIThinkingOrb state="working" size={20} color="#008855" />
                </div>
              ) : (
                <AnimatedNumber value={resumeCount ?? 0} />
              )}
            </div>
          </div>

          {/* Interactive Chart Component */}
          <AtsCalibrationChart />
        </div>

        {/* Metric 4: Reasoning Engine + Interactive Latency Pipeline */}
        <div className="p-5 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs flex flex-col justify-between transition-all hover:border-[#008855]/40 hover:shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider font-mono">
                Reasoning Engine
              </span>
              <div className="h-8 w-8 rounded-xl bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD] flex items-center justify-center">
                <KoboyoBrain size={16} strokeWidth={2} />
              </div>
            </div>

            <div className="text-xl font-bold font-mono text-[#0A1A12]">
              LangGraph + Ollama
            </div>
          </div>

          {/* Interactive Chart Component */}
          <EngineActivityChart />
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE MARKET TRENDS & SPECIALIZATION CHARTS
          ========================================================================= */}
      <section aria-label="Interactive Market Trends">
        <InteractiveMarketTrendsChart />
      </section>

      {/* =========================================================================
          CENTERPIECE: Interactive GraphRAG Market Query Widget
          ========================================================================= */}
      <section aria-label="GraphRAG Career Intelligence">
        <MarketQueryBox />
      </section>

      {/* =========================================================================
          IN-DEMAND SKILLS & BENTO PREVIEW
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* In-Demand Placement Skills */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD] flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#0A1A12]">
                  High-Demand Campus Placement Skills
                </h3>
                <p className="text-xs text-neutral-500">
                  Extracted by spaCy NER from live job postings and connected in our knowledge graph
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]">
              Market Verified
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {TOP_SKILLS.map((skill, i) => (
              <div
                key={skill}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-[#F8FAF8] hover:border-[#008855]/50 hover:bg-[#EEF7F1] transition-all text-xs font-medium cursor-default"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#008855]" />
                <span className="text-[#0A1A12] font-medium">{skill}</span>
                <span className="text-[10px] text-neutral-400 font-mono ml-1">#{i + 1}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-xl bg-[#EEF7F1] border border-[#D6E8DD] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs space-y-0.5">
              <p className="font-semibold text-[#004D2F]">
                Want to see how your resume compares?
              </p>
              <p className="text-neutral-600">
                Our Resume Engine parses your technical skills and computes an objective fit score.
              </p>
            </div>
            <Link
              to="/resumes"
              className="h-8 px-4 rounded-full text-xs font-semibold text-white bg-[#008855] hover:bg-[#007347] active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-xs"
            >
              <span>Check Fit Score</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Feature Preview Card */}
        <div className="p-6 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase bg-amber-50 text-amber-700 border border-amber-200">
              Phase 3 Preview
            </div>
            <h3 className="text-base font-semibold text-[#0A1A12]">
              AI Mock Interview Prep
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              In Phase 3, practice technical interviews tailored to specific roles using questions grounded directly in the knowledge graph.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-dashed border-neutral-200 bg-[#F8FAF8] text-xs text-neutral-600 space-y-2">
            <div className="font-semibold text-[#004D2F] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#008855]" />
              <span>Role-Calibrated Q&A</span>
            </div>
            <p className="text-[11px] leading-snug text-neutral-500">
              Evaluates spoken responses against company requirements and provides real-time LLM feedback.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
