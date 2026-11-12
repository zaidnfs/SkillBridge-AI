import React, { useEffect, useState, useMemo } from 'react';
import {
  GraduationCap,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Compass,
} from 'lucide-react';
import {
  LearningResource,
  ResourceDifficulty,
  SkillRecommendationResponse,
} from '../../types/skills';
import { skillService } from '../../services/skillService';
import { ResourceCard } from './ResourceCard';

interface SkillGapRecommendationsProps {
  missingSkills: string[];
}

export const SkillGapRecommendations: React.FC<SkillGapRecommendationsProps> = ({
  missingSkills,
}) => {
  const [data, setData] = useState<SkillRecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<ResourceDifficulty | undefined>(
    undefined
  );
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!missingSkills || missingSkills.length === 0) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    skillService
      .getRecommendations({
        skills: missingSkills,
        difficulty: selectedDifficulty,
        max_per_skill: 4,
      })
      .then((res) => {
        if (isMounted) {
          setData(res);
          // Expand all skills by default
          const initialExpanded: Record<string, boolean> = {};
          missingSkills.forEach((skill) => {
            initialExpanded[skill.toLowerCase()] = true;
          });
          setExpandedSkills(initialExpanded);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load skill recommendations:', err);
          setError('Unable to load learning recommendations. Please try again.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [missingSkills, selectedDifficulty]);

  const toggleSkill = (skill: string) => {
    const key = skill.toLowerCase();
    setExpandedSkills((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const totalResources = data?.total_resources_found ?? 0;

  if (!missingSkills || missingSkills.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#E2E8E5] bg-white shadow-xs p-6 space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF7F1] text-[#008855]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-[#0A1A12] tracking-tight">
              Bridge Your Skill Gaps
            </h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#008855] bg-[#EEF7F1] px-2 py-0.5 rounded-full border border-[#D6E8DD]">
              <Sparkles className="h-3 w-3" />
              Curated Free Resources
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            Hand-picked tutorials, interactive exercises, and official guides to help you qualify for this role.
          </p>
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-1.5 self-start sm:self-center bg-neutral-100/70 p-1 rounded-xl text-xs">
          {(
            [
              { label: 'All Levels', value: undefined },
              { label: 'Beginner', value: 'beginner' as ResourceDifficulty },
              { label: 'Intermediate', value: 'intermediate' as ResourceDifficulty },
              { label: 'Advanced', value: 'advanced' as ResourceDifficulty },
            ] as const
          ).map((filter) => {
            const isActive = selectedDifficulty === filter.value;
            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => setSelectedDifficulty(filter.value)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-white text-[#0A1A12] shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-500 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#008855]" />
          <p className="text-xs">Finding curated free learning materials for your skill gaps...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Recommendations grouped by skill */}
      {!loading && !error && data && (
        <div className="space-y-5">
          {missingSkills.map((skillName) => {
            // Find key in recommendations (case-insensitive)
            const matchedKey = Object.keys(data.recommendations).find(
              (k) => k.toLowerCase() === skillName.toLowerCase()
            );
            const resources = matchedKey ? data.recommendations[matchedKey] : [];
            const isExpanded = expandedSkills[skillName.toLowerCase()] ?? true;

            return (
              <div
                key={skillName}
                className="rounded-xl border border-neutral-200/80 bg-neutral-50/40 overflow-hidden transition-colors"
              >
                {/* Skill Header Accordion Toggle */}
                <button
                  type="button"
                  onClick={() => toggleSkill(skillName)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-sm text-[#0A1A12] capitalize">
                      {skillName}
                    </span>
                    {resources.length > 0 ? (
                      <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#EEF7F1] text-[#004D2F] border border-[#D6E8DD]">
                        {resources.length} {resources.length === 1 ? 'Resource' : 'Resources'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400 italic">
                        No direct match in library
                      </span>
                    )}
                  </div>

                  <div className="text-neutral-400 hover:text-neutral-600 transition-colors">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Resource Cards Grid */}
                {isExpanded && (
                  <div className="p-4 pt-0">
                    {resources.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        {resources.map((resource) => (
                          <ResourceCard key={resource.id} resource={resource} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-500 bg-white space-y-2">
                        <Compass className="h-5 w-5 mx-auto text-neutral-400" />
                        <p>No pre-indexed free course yet for &ldquo;{skillName}&rdquo;.</p>
                        <a
                          href={`https://roadmap.sh/search?q=${encodeURIComponent(skillName)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-[#008855] hover:underline font-medium"
                        >
                          Explore roadmap for {skillName} on roadmap.sh &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {totalResources === 0 && (
            <div className="p-6 text-center text-xs text-neutral-500 italic">
              No learning resources found matching the selected filter. Try choosing &ldquo;All Levels&rdquo;.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
