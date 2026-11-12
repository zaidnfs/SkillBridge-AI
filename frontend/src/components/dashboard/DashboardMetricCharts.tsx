import React, { useState } from 'react';
import { TrendingUp, CheckCircle2, Zap } from 'lucide-react';

/* =========================================================================
   1. JOB TREND CARD CHART: Interactive Area Sparkline with Hover Scrubber
   ========================================================================= */
const JOB_DATA_7D = [
  { day: 'Mon', jobs: 142, growth: '+8%' },
  { day: 'Tue', jobs: 178, growth: '+12%' },
  { day: 'Wed', jobs: 165, growth: '-4%' },
  { day: 'Thu', jobs: 215, growth: '+18%' },
  { day: 'Fri', jobs: 284, growth: '+24%' },
  { day: 'Sat', jobs: 195, growth: '-9%' },
  { day: 'Sun', jobs: 256, growth: '+15%' },
];

const JOB_DATA_30D = [
  { day: 'W1', jobs: 940, growth: '+10%' },
  { day: 'W2', jobs: 1080, growth: '+14%' },
  { day: 'W3', jobs: 1190, growth: '+11%' },
  { day: 'W4', jobs: 1240, growth: '+16%' },
];

export const JobTrendChart: React.FC<{ onHoverValue?: (val: number | null) => void }> = ({
  onHoverValue,
}) => {
  const [period, setPeriod] = useState<'7D' | '30D'>('7D');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = period === '7D' ? JOB_DATA_7D : JOB_DATA_30D;
  const maxVal = Math.max(...data.map((d) => d.jobs));
  const minVal = Math.min(...data.map((d) => d.jobs)) * 0.85;

  const width = 240;
  const height = 65;
  const paddingX = 10;
  const paddingY = 8;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((d.jobs - minVal) / (maxVal - minVal)) * (height - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const handlePointer = (idx: number) => {
    setHoverIndex(idx);
    if (onHoverValue) onHoverValue(data[idx].jobs);
  };

  const handleLeave = () => {
    setHoverIndex(null);
    if (onHoverValue) onHoverValue(null);
  };

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="pt-2 space-y-2 select-none" onMouseLeave={handleLeave}>
      {/* Mini Controls & Active readout */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1 text-neutral-500">
          <TrendingUp className="h-3 w-3 text-[#008855]" />
          {activePoint ? (
            <span className="font-semibold text-[#008855]">
              {activePoint.day}: {activePoint.jobs} jobs ({activePoint.growth})
            </span>
          ) : (
            <span>Hiring Velocity</span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-[#EEF7F1] p-0.5 rounded-md border border-[#D6E8DD]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPeriod('7D');
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
              period === '7D' ? 'bg-[#008855] text-white font-bold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            7D
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPeriod('30D');
            }}
            className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
              period === '30D' ? 'bg-[#008855] text-white font-bold' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            30D
          </button>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div className="relative w-full h-[65px] overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="emeraldAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#008855" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#008855" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background area fill */}
          <path d={areaD} fill="url(#emeraldAreaGradient)" />

          {/* Stroke path line */}
          <path
            d={pathD}
            fill="none"
            stroke="#008855"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active hover vertical line */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={0}
              x2={activePoint.x}
              y2={height}
              stroke="#008855"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.8"
            />
          )}

          {/* Interactive touch/hover hot zones and dots */}
          {points.map((p, i) => (
            <g key={i} onMouseEnter={() => handlePointer(i)}>
              {/* Invisible large click/hover hit box */}
              <rect
                x={p.x - width / (data.length * 2)}
                y={0}
                width={width / data.length}
                height={height}
                fill="transparent"
                className="cursor-crosshair"
              />
              {/* Point dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIndex === i ? 4 : 2}
                fill={hoverIndex === i ? '#004D2F' : '#008855'}
                stroke="#FFFFFF"
                strokeWidth={hoverIndex === i ? 2 : 1}
                className="transition-all duration-150"
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

/* =========================================================================
   2. GRAPH DISTRIBUTION CARD CHART: Interactive Entity Breakdown Bar
   ========================================================================= */
const GRAPH_SEGMENTS = [
  { name: 'Skills', count: 2506, pct: 52, color: '#008855', bg: 'bg-[#008855]', examples: 'Python, Docker, SQL' },
  { name: 'Roles', count: 1156, pct: 24, color: '#00A264', bg: 'bg-[#00A264]', examples: 'Full Stack, DevOps' },
  { name: 'Companies', count: 772, pct: 16, color: '#0D9488', bg: 'bg-[#0D9488]', examples: 'Tech Hiring Partners' },
  { name: 'Concepts', count: 386, pct: 8, color: '#34D399', bg: 'bg-[#34D399]', examples: 'GraphRAG, Vector Index' },
];

export const GraphDistributionChart: React.FC = () => {
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const selected = activeSegment !== null ? GRAPH_SEGMENTS[activeSegment] : null;

  return (
    <div className="pt-2 space-y-2 select-none" onMouseLeave={() => setActiveSegment(null)}>
      {/* Information Header */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-neutral-500">
          {selected ? (
            <span className="font-semibold" style={{ color: selected.color }}>
              {selected.name}: {selected.count.toLocaleString()} ({selected.pct}%)
            </span>
          ) : (
            <span>Entity Distribution</span>
          )}
        </span>
        <span className="text-[10px] text-neutral-400">
          {selected ? selected.examples : 'Hover segments'}
        </span>
      </div>

      {/* Multi-segment Interactive Bar */}
      <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-neutral-200">
        {GRAPH_SEGMENTS.map((seg, idx) => (
          <div
            key={seg.name}
            onMouseEnter={() => setActiveSegment(idx)}
            style={{ width: `${seg.pct}%` }}
            className={`h-full rounded-sm transition-all duration-200 cursor-pointer ${seg.bg} ${
              activeSegment === idx ? 'brightness-110 scale-y-125' : 'opacity-85 hover:opacity-100'
            }`}
            title={`${seg.name}: ${seg.count} nodes (${seg.pct}%)`}
          />
        ))}
      </div>

      {/* Interactive Legend Tags */}
      <div className="flex items-center justify-between pt-0.5 text-[10px] font-mono text-neutral-500">
        {GRAPH_SEGMENTS.map((seg, idx) => (
          <button
            key={seg.name}
            type="button"
            onMouseEnter={() => setActiveSegment(idx)}
            onClick={() => setActiveSegment(idx)}
            className={`flex items-center gap-1 transition-colors px-1 py-0.5 rounded cursor-pointer ${
              activeSegment === idx ? 'font-bold text-[#004D2F] bg-[#EEF7F1]' : 'hover:text-neutral-900'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span>{seg.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* =========================================================================
   3. ATS CALIBRATION CARD CHART: Interactive Revision Score Progression
   ========================================================================= */
const RESUME_REVISIONS = [
  { rev: 'v1.0 Raw', score: 54, label: 'Base Upload', gap: '8 missing' },
  { rev: 'v1.1 NER', score: 72, label: 'Keyword Tailored', gap: '4 missing' },
  { rev: 'v2.0 Graph', score: 88, label: 'Optimal Calibration', gap: '1 missing' },
];

export const AtsCalibrationChart: React.FC = () => {
  const [hoveredRev, setHoveredRev] = useState<number | null>(null);

  const active = hoveredRev !== null ? RESUME_REVISIONS[hoveredRev] : null;

  return (
    <div className="pt-2 space-y-2 select-none" onMouseLeave={() => setHoveredRev(null)}>
      {/* Information Header */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-neutral-500">
          {active ? (
            <span className="font-semibold text-[#008855]">
              {active.rev}: {active.score}% ({active.label})
            </span>
          ) : (
            <span>Revision Calibration Lift</span>
          )}
        </span>
        <span className="text-[10px] text-[#008855] font-semibold">
          {active ? active.gap : '+34% improvement'}
        </span>
      </div>

      {/* 3 Interactive Revision Bars */}
      <div className="grid grid-cols-3 gap-2 h-[42px] items-end">
        {RESUME_REVISIONS.map((item, idx) => {
          const isHigh = item.score >= 80;
          return (
            <div
              key={item.rev}
              onMouseEnter={() => setHoveredRev(idx)}
              className="flex flex-col items-center gap-1 cursor-pointer group h-full justify-end"
            >
              <div className="w-full bg-neutral-100 rounded-lg h-full overflow-hidden flex flex-col justify-end p-0.5 border border-neutral-200 group-hover:border-[#008855]/40 transition-colors">
                <div
                  style={{ height: `${item.score}%` }}
                  className={`w-full rounded-md transition-all duration-300 ${
                    isHigh
                      ? 'bg-gradient-to-t from-[#008855] to-[#00A264]'
                      : 'bg-gradient-to-t from-neutral-400 to-neutral-500'
                  } ${hoveredRev === idx ? 'brightness-110 shadow-xs' : 'opacity-90'}`}
                />
              </div>
              <span className="text-[10px] font-mono text-neutral-500 group-hover:text-[#008855] transition-colors">
                {item.score}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* =========================================================================
   4. ENGINE ACTIVITY CARD CHART: Interactive Latency & Load Distribution
   ========================================================================= */
const LATENCY_STEPS = [
  { stage: 'Graph Traversal', time: 110, pct: 26, color: '#008855' },
  { stage: 'Vector Search', time: 85, pct: 20, color: '#0284C7' },
  { stage: 'LLM Synthesis', time: 225, pct: 54, color: '#004D2F' },
];

export const EngineActivityChart: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const active = activeStep !== null ? LATENCY_STEPS[activeStep] : null;

  return (
    <div className="pt-2 space-y-2 select-none" onMouseLeave={() => setActiveStep(null)}>
      {/* Information Header */}
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="text-neutral-500 flex items-center gap-1">
          <Zap className="h-3 w-3 text-amber-500" />
          {active ? (
            <span className="font-semibold text-[#004D2F]">
              {active.stage}: {active.time}ms ({active.pct}%)
            </span>
          ) : (
            <span>E2E Latency: 420ms</span>
          )}
        </span>
        <span className="text-[10px] text-[#008855] font-semibold flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#008855] animate-ping" />
          <span>Active</span>
        </span>
      </div>

      {/* Latency Pipeline Bar */}
      <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-neutral-200">
        {LATENCY_STEPS.map((step, idx) => (
          <div
            key={step.stage}
            onMouseEnter={() => setActiveStep(idx)}
            style={{ width: `${step.pct}%`, backgroundColor: step.color }}
            className={`h-full rounded-sm transition-all duration-200 cursor-pointer ${
              activeStep === idx ? 'brightness-125 scale-y-125' : 'opacity-85 hover:opacity-100'
            }`}
            title={`${step.stage}: ${step.time}ms (${step.pct}%)`}
          />
        ))}
      </div>

      {/* Latency Micro Legend */}
      <div className="flex items-center justify-between pt-0.5 text-[10px] font-mono text-neutral-500">
        {LATENCY_STEPS.map((step, idx) => (
          <button
            key={step.stage}
            type="button"
            onMouseEnter={() => setActiveStep(idx)}
            onClick={() => setActiveStep(idx)}
            className={`flex items-center gap-1 transition-colors px-1 py-0.5 rounded cursor-pointer ${
              activeStep === idx ? 'font-bold text-[#004D2F] bg-[#EEF7F1]' : 'hover:text-neutral-900'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: step.color }} />
            <span>{step.stage.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
