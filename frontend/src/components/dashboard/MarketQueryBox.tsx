import React, { useState } from 'react';
import { DecryptedText } from '@/components/reactbits/DecryptedText';
import { KoboyoSparkle, KoboyoBrain } from '@/components/icons/Koboyo';
import { ReiconGraph, ReiconTerminal } from '@/components/icons/Reicon';
import { jobService } from '@/services/jobService';
import { JobMarketQueryResponse } from '@/types/jobs';
import { Send, BookOpen, AlertCircle, HelpCircle, Database } from 'lucide-react';

const PRESET_QUERIES = [
  'What backend skills are most in demand in Bengaluru?',
  'What skills are commonly required alongside Python and Django?',
  'What roles are available for React and TypeScript developers?',
  'What are the core requirements for a Machine Learning Engineer?',
];

export const MarketQueryBox: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<JobMarketQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await jobService.queryJobMarket(queryText);
      setResult(response);
    } catch (err: any) {
      const detail =
        err.response?.data?.error ||
        err.response?.data?.details ||
        'Unable to query the GraphRAG intelligence layer. Please ensure backend services are active.';
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const getStrategyBadge = (strategy?: string) => {
    switch (strategy?.toLowerCase()) {
      case 'graph':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]">
            <ReiconGraph size={13} strokeWidth={2} />
            Neo4j Knowledge Graph
          </span>
        );
      case 'vector':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-sky-50 text-sky-800 border border-sky-200">
            <Database className="h-3.5 w-3.5" />
            Qdrant Semantic Vector
          </span>
        );
      case 'hybrid':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]">
            <KoboyoSparkle size={13} strokeWidth={2.2} />
            LangGraph Hybrid Strategy
          </span>
        );
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-[#E2E8E5] bg-white shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD] flex items-center justify-center shrink-0">
            <KoboyoBrain size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0A1A12]">
              GraphRAG Career Intelligence
            </h2>
            <p className="text-xs text-neutral-500">
              Query live placement trends, skill relationships, and role requirements grounded in Neo4j & Qdrant
            </p>
          </div>
        </div>
        {result?.strategy && <div>{getStrategyBadge(result.strategy)}</div>}
      </div>

      {/* Query input form */}
      <form onSubmit={onSubmit} className="flex gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Ask anything about placement trends, skill co-occurrences, or roles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="w-full h-11 px-4 rounded-xl text-sm border border-neutral-200 bg-[#F8FAF8] text-[#111827] placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-[#008855] focus:ring-2 focus:ring-[#008855]/15 transition-all shadow-xs"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="h-11 px-5 rounded-full text-xs font-semibold text-white bg-[#008855] hover:bg-[#007347] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 cursor-pointer shadow-sm shadow-[#008855]/20 shrink-0"
        >
          {isLoading ? (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span>Query</span>
        </button>
      </form>

      {/* Preset query chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs text-neutral-400 mr-1 flex items-center gap-1">
          <HelpCircle className="h-3.5 w-3.5 text-[#008855]" /> Examples:
        </span>
        {PRESET_QUERIES.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setQuery(preset);
              handleSearch(preset);
            }}
            className="text-xs bg-[#F8FAF8] hover:bg-[#EEF7F1] text-neutral-600 hover:text-[#004D2F] px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-[#008855]/40 transition-all text-left cursor-pointer"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-semibold">Query Failed</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State with animated spinner and pulse */}
      {isLoading && (
        <div className="p-6 rounded-xl border border-dashed border-[#D6E8DD] bg-[#F8FAF8] space-y-3 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-[#008855] border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-[#004D2F]">
              Agent synthesizing knowledge graph and vector evidence...
            </span>
          </div>
          <div className="h-3.5 bg-neutral-200 rounded-md w-3/4" />
          <div className="h-3.5 bg-neutral-200 rounded-md w-full" />
          <div className="h-3.5 bg-neutral-200 rounded-md w-5/6" />
        </div>
      )}

      {/* Synthesized Response Output */}
      {result && !isLoading && (
        <div className="p-5 rounded-xl border border-[#E2E8E5] bg-[#F8FAF8] space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ReiconTerminal size={14} className="text-[#008855]" />
              <DecryptedText text="Grounded Agent Synthesis" speed={20} maxIterations={8} />
            </span>
            {result.strategy && getStrategyBadge(result.strategy)}
          </div>

          <div className="prose prose-sm max-w-none text-sm text-[#111827] leading-relaxed whitespace-pre-line">
            {result.answer}
          </div>

          {/* Evidence Sources */}
          {result.evidence_sources && result.evidence_sources.length > 0 && (
            <div className="pt-3 border-t border-neutral-200">
              <div className="text-xs font-semibold text-neutral-500 mb-2 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-[#008855]" />
                Knowledge Sources ({result.evidence_sources.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.evidence_sources.map((src, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-neutral-200 bg-white text-xs space-y-1 shadow-2xs"
                  >
                    <div className="font-semibold text-[#004D2F] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#008855]" />
                      {src.type || 'Knowledge Evidence'}
                    </div>
                    <p className="text-neutral-600 line-clamp-2 text-[11px] leading-snug">
                      {src.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
