import React, { useState } from 'react';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';

interface MonthlyData {
  month: string;
  backend: number;
  aiMl: number;
  fullstack: number;
  topSkill: string;
}

const MARKET_SERIES: MonthlyData[] = [
  { month: 'Apr', backend: 420, aiMl: 280, fullstack: 390, topSkill: 'Django & PostgreSQL' },
  { month: 'May', backend: 460, aiMl: 340, fullstack: 430, topSkill: 'FastAPI & Docker' },
  { month: 'Jun', backend: 510, aiMl: 390, fullstack: 470, topSkill: 'React & TypeScript' },
  { month: 'Jul', backend: 580, aiMl: 460, fullstack: 520, topSkill: 'LangChain & Vector DBs' },
  { month: 'Aug', backend: 640, aiMl: 540, fullstack: 590, topSkill: 'PyTorch & AWS' },
  { month: 'Sep', backend: 720, aiMl: 630, fullstack: 650, topSkill: 'GraphRAG & Neo4j' },
  { month: 'Oct', backend: 810, aiMl: 740, fullstack: 710, topSkill: 'Next.js & LLM Agents' },
];

export const InteractiveMarketTrendsChart: React.FC = () => {
  const [activeTrack, setActiveTrack] = useState<'all' | 'backend' | 'aiMl' | 'fullstack'>('all');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 800;
  const height = 240;
  const padX = 50;
  const padY = 30;

  const maxVal = 900;
  const minVal = 200;

  const getX = (i: number) => padX + (i / (MARKET_SERIES.length - 1)) * (width - padX * 2);
  const getY = (val: number) => height - padY - ((val - minVal) / (maxVal - minVal)) * (height - padY * 2);

  const generateSmoothPath = (key: 'backend' | 'aiMl' | 'fullstack') => {
    return MARKET_SERIES.reduce((acc, d, i) => {
      const x = getX(i);
      const y = getY(d[key]);
      return `${acc} ${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }, '');
  };

  const generateAreaPath = (key: 'backend' | 'aiMl' | 'fullstack') => {
    const linePath = generateSmoothPath(key);
    const lastX = getX(MARKET_SERIES.length - 1);
    const firstX = getX(0);
    return `${linePath} L ${lastX} ${height - padY} L ${firstX} ${height - padY} Z`;
  };

  const activeData = hoverIndex !== null ? MARKET_SERIES[hoverIndex] : null;

  return (
    <div className="p-6 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs space-y-4">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD] flex items-center justify-center shrink-0">
            <BarChart3 size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0A1A12] flex items-center gap-2">
              Campus Placement Market Trajectory
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]">
                Real-Time Hiring Index
              </span>
            </h2>
            <p className="text-xs text-neutral-500">
              Interactive timeline of verified engineering openings by technical specialization
            </p>
          </div>
        </div>

        {/* Track Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F8FAF8] p-1 rounded-xl border border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTrack('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTrack === 'all'
                ? 'bg-[#008855] text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All Tracks
          </button>
          <button
            type="button"
            onClick={() => setActiveTrack('backend')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTrack === 'backend'
                ? 'bg-[#008855] text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Backend & Cloud
          </button>
          <button
            type="button"
            onClick={() => setActiveTrack('aiMl')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTrack === 'aiMl'
                ? 'bg-[#008855] text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            AI & Machine Learning
          </button>
          <button
            type="button"
            onClick={() => setActiveTrack('fullstack')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTrack === 'fullstack'
                ? 'bg-[#008855] text-white shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Full Stack Web
          </button>
        </div>
      </div>

      {/* Interactive SVG Chart Container */}
      <div
        className="relative w-full overflow-hidden select-none"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <div className="w-full aspect-[16/6] min-h-[220px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="backendArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#008855" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#008855" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="aiArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="fullstackArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D97706" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[200, 400, 600, 800].map((val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1={padX}
                    y1={y}
                    x2={width - padX}
                    y2={y}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padX - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="#9CA3AF"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Filled Areas */}
            {(activeTrack === 'all' || activeTrack === 'backend') && (
              <path d={generateAreaPath('backend')} fill="url(#backendArea)" />
            )}
            {(activeTrack === 'all' || activeTrack === 'aiMl') && (
              <path d={generateAreaPath('aiMl')} fill="url(#aiArea)" />
            )}
            {(activeTrack === 'all' || activeTrack === 'fullstack') && (
              <path d={generateAreaPath('fullstack')} fill="url(#fullstackArea)" />
            )}

            {/* Line Strokes */}
            {(activeTrack === 'all' || activeTrack === 'backend') && (
              <path
                d={generateSmoothPath('backend')}
                fill="none"
                stroke="#008855"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {(activeTrack === 'all' || activeTrack === 'aiMl') && (
              <path
                d={generateSmoothPath('aiMl')}
                fill="none"
                stroke="#0284C7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {(activeTrack === 'all' || activeTrack === 'fullstack') && (
              <path
                d={generateSmoothPath('fullstack')}
                fill="none"
                stroke="#D97706"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* X-Axis Month Labels */}
            {MARKET_SERIES.map((d, i) => {
              const x = getX(i);
              return (
                <text
                  key={d.month}
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill={hoverIndex === i ? '#004D2F' : '#6B7280'}
                  fontWeight={hoverIndex === i ? '700' : '500'}
                  fontFamily="sans-serif"
                >
                  {d.month}
                </text>
              );
            })}

            {/* Active Vertical Scrubber Line */}
            {activeData && hoverIndex !== null && (
              <line
                x1={getX(hoverIndex)}
                y1={padY}
                x2={getX(hoverIndex)}
                y2={height - padY}
                stroke="#008855"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.8"
              />
            )}

            {/* Interactive Hit Areas */}
            {MARKET_SERIES.map((d, i) => {
              const x = getX(i);
              const slotWidth = (width - padX * 2) / (MARKET_SERIES.length - 1);
              return (
                <g key={d.month} onMouseEnter={() => setHoverIndex(i)}>
                  <rect
                    x={x - slotWidth / 2}
                    y={0}
                    width={slotWidth}
                    height={height}
                    fill="transparent"
                    className="cursor-crosshair"
                  />
                  {/* Point dots */}
                  {(activeTrack === 'all' || activeTrack === 'backend') && (
                    <circle
                      cx={x}
                      cy={getY(d.backend)}
                      r={hoverIndex === i ? 5 : 3}
                      fill="#008855"
                      stroke="#FFFFFF"
                      strokeWidth={hoverIndex === i ? 2.5 : 1}
                    />
                  )}
                  {(activeTrack === 'all' || activeTrack === 'aiMl') && (
                    <circle
                      cx={x}
                      cy={getY(d.aiMl)}
                      r={hoverIndex === i ? 5 : 3}
                      fill="#0284C7"
                      stroke="#FFFFFF"
                      strokeWidth={hoverIndex === i ? 2.5 : 1}
                    />
                  )}
                  {(activeTrack === 'all' || activeTrack === 'fullstack') && (
                    <circle
                      cx={x}
                      cy={getY(d.fullstack)}
                      r={hoverIndex === i ? 5 : 3}
                      fill="#D97706"
                      stroke="#FFFFFF"
                      strokeWidth={hoverIndex === i ? 2.5 : 1}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dynamic Tooltip / Readout Box */}
        {activeData && hoverIndex !== null && (
          <div
            className="absolute top-2 pointer-events-none p-3 rounded-xl bg-white border border-[#E2E8E5] shadow-md text-xs space-y-1.5 transition-all duration-150 z-20"
            style={{
              left: `${Math.min(Math.max((hoverIndex / (MARKET_SERIES.length - 1)) * 80 + 10, 15), 75)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center justify-between gap-4 font-mono font-bold text-[#0A1A12] border-b border-neutral-100 pb-1">
              <span>{activeData.month} Hiring Surge</span>
              <span className="text-[#008855]">
                {activeData.backend + activeData.aiMl + activeData.fullstack} total
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              {(activeTrack === 'all' || activeTrack === 'backend') && (
                <div className="flex items-center justify-between gap-3 text-[#008855]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#008855]" /> Backend/Cloud:
                  </span>
                  <span className="font-bold">{activeData.backend} jobs</span>
                </div>
              )}
              {(activeTrack === 'all' || activeTrack === 'aiMl') && (
                <div className="flex items-center justify-between gap-3 text-sky-700">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-600" /> AI & Machine Learning:
                  </span>
                  <span className="font-bold">{activeData.aiMl} jobs</span>
                </div>
              )}
              {(activeTrack === 'all' || activeTrack === 'fullstack') && (
                <div className="flex items-center justify-between gap-3 text-amber-700">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> Full Stack:
                  </span>
                  <span className="font-bold">{activeData.fullstack} jobs</span>
                </div>
              )}
            </div>

            <div className="pt-1 border-t border-neutral-100 text-[10px] text-neutral-500 font-sans">
              <span className="font-semibold text-neutral-700">Top In-Demand Stack:</span>{' '}
              {activeData.topSkill}
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Legend & Insights */}
      <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-neutral-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#008855]" />
            <span>Backend & Cloud</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0284C7]" />
            <span>AI & Machine Learning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#D97706]" />
            <span>Full Stack Web</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-neutral-500 font-mono text-[11px]">
          <TrendingUp className="h-3.5 w-3.5 text-[#008855]" />
          <span>Avg. +23.8% Quarter-over-Quarter Demand</span>
        </div>
      </div>
    </div>
  );
};
