import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Check, Sliders, Zap } from 'lucide-react';
import { interviewService } from '@/services/interviewService';
import { RoleSuggestion, InterviewDifficulty, CreateSessionPayload } from '@/types/interview';
import { KoboyoBrain } from '@/components/icons/Koboyo';
import { AIThinkingOrb } from '@/components/shared/AIThinkingOrb';
import { AILoadingState } from '@/components/shared/AILoadingState';
import { BorderBeam } from 'border-beam';
import { cn } from '@/lib/utils';

interface InterviewSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (payload: CreateSessionPayload) => Promise<void>;
  isLoading: boolean;
  initialRole?: string;
  initialSkills?: string[];
}

const DEFAULT_ROLES = [
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'DevOps Engineer',
  'Software Engineer',
];

export const InterviewSetupModal: React.FC<InterviewSetupModalProps> = ({
  isOpen,
  onClose,
  onStartSession,
  isLoading,
  initialRole,
  initialSkills,
}) => {
  const [selectedRole, setSelectedRole] = useState('Backend Developer');
  const [customRole, setCustomRole] = useState('');
  const [suggestedRoles, setSuggestedRoles] = useState<RoleSuggestion[]>([]);
  const [targetSkills, setTargetSkills] = useState<string[]>(['Python', 'Django', 'PostgreSQL']);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [numQuestions, setNumQuestions] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('intermediate');
  const [hasAppliedInitialPrefill, setHasAppliedInitialPrefill] = useState(false);

  useEffect(() => {
    if (isOpen && (initialRole || (initialSkills && initialSkills.length > 0)) && !hasAppliedInitialPrefill) {
      if (initialRole) {
        const matchedDefault = DEFAULT_ROLES.find(
          (r) => r.toLowerCase() === initialRole.toLowerCase()
        );
        if (matchedDefault) {
          setSelectedRole(matchedDefault);
          setCustomRole('');
        } else {
          setCustomRole(initialRole);
        }
      }
      if (initialSkills && initialSkills.length > 0) {
        setTargetSkills(initialSkills.slice(0, 10));
      }
      setHasAppliedInitialPrefill(true);
    }
  }, [isOpen, initialRole, initialSkills, hasAppliedInitialPrefill]);

  // Fetch role and skill recommendations from knowledge graph
  useEffect(() => {
    let mounted = true;
    interviewService
      .getSuggestedRoles()
      .then((res) => {
        if (mounted && res.roles && res.roles.length > 0) {
          setSuggestedRoles(res.roles);
        }
      })
      .catch(() => {
        // graceful offline fallback
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Update suggested skills whenever role selection changes
  useEffect(() => {
    if (hasAppliedInitialPrefill && initialSkills && initialSkills.length > 0) {
      return;
    }
    const activeRole = customRole.trim() || selectedRole;
    const match = suggestedRoles.find(
      (r) => r.role_title.toLowerCase() === activeRole.toLowerCase()
    );
    if (match && match.top_skills.length > 0) {
      setTargetSkills(match.top_skills);
    } else if (selectedRole === 'Backend Developer') {
      setTargetSkills(['Python', 'Django', 'PostgreSQL', 'Docker']);
    } else if (selectedRole === 'Frontend Developer') {
      setTargetSkills(['React', 'TypeScript', 'Tailwind CSS', 'Next.js']);
    } else if (selectedRole === 'Full Stack Developer') {
      setTargetSkills(['React', 'Node.js', 'Python', 'PostgreSQL']);
    } else if (selectedRole === 'Data Scientist') {
      setTargetSkills(['Python', 'Pandas', 'Machine Learning', 'SQL']);
    } else if (selectedRole === 'DevOps Engineer') {
      setTargetSkills(['Docker', 'Kubernetes', 'CI/CD', 'Linux']);
    }
  }, [selectedRole, customRole, suggestedRoles]);

  if (!isOpen) return null;

  const handleToggleSkill = (skill: string) => {
    if (targetSkills.includes(skill)) {
      setTargetSkills(targetSkills.filter((s) => s !== skill));
    } else {
      setTargetSkills([...targetSkills, skill]);
    }
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSkillInput.trim();
    if (clean && !targetSkills.includes(clean)) {
      setTargetSkills([...targetSkills, clean]);
      setNewSkillInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalRole = customRole.trim() || selectedRole;
    await onStartSession({
      role_title: finalRole,
      target_skills: targetSkills,
      difficulty,
      num_questions: numQuestions,
    });
  };

  const activeRoleName = customRole.trim() || selectedRole;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-50 duration-200">
      <BorderBeam colorVariant="forest" size="md" className="w-full max-w-2xl rounded-3xl">
        <div className="relative w-full bg-white border border-[#D5E5DC] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EAF2ED] bg-[#F8FAF9]">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-[#EEF7F1] border border-[#D6E8DD] text-[#008855] flex items-center justify-center shrink-0">
              <KoboyoBrain size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0A1A12]">Configure Mock Interview</h2>
              <p className="text-xs text-neutral-500">
                Grounded in live Knowledge Graph skill demand and role criteria
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-8 w-8 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form or Loading Synthesis Stage */}
        {isLoading ? (
          <div className="p-8 sm:p-12">
            <AILoadingState
              state="connecting"
              size="lg"
              title="Synthesizing Tailored Interview Questions"
              description={`CarrierGraph AI is traversing the competency knowledge graph for ${activeRoleName} and formulating targeted interview questions...`}
              stages={[
                { label: `Mapping ${targetSkills.length} competencies (${targetSkills.slice(0, 3).join(', ')}...)` },
                { label: `Querying GraphRAG semantic nodes for difficulty: ${difficulty}` },
                { label: `Generating context-aware question rubrics (${numQuestions} questions)` },
              ]}
              activeStageIndex={1}
              card={false}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Target Role Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#004D2F] uppercase tracking-wider mb-2">
                1. Select Target Job Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEFAULT_ROLES.map((role) => {
                  const isSelected = selectedRole === role && !customRole;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role);
                        setCustomRole('');
                      }}
                      className={cn(
                        'px-3.5 py-2.5 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer',
                        isSelected
                          ? 'bg-[#EEF7F1] border-[#008855] text-[#004D2F] shadow-2xs'
                          : 'bg-white border-[#E0EBE4] text-[#0A1A12] hover:bg-[#F8FAF9]'
                      )}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>

              {/* Custom Role write-in */}
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Or enter custom role (e.g. AI Research Engineer, Rust Systems Dev)..."
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D5E5DC] bg-[#FAFCFB] focus:bg-white focus:outline-none focus:border-[#008855] focus:ring-1 focus:ring-[#008855]"
                />
              </div>
            </div>

            {/* Target Competencies */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[#004D2F] uppercase tracking-wider">
                  2. Focus Skills & Competencies ({targetSkills.length})
                </label>
                <span className="text-[11px] text-neutral-400">Click to toggle or add new</span>
              </div>

              <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-[#FAFCFB] border border-[#EAF2ED]">
                {targetSkills.map((skill) => (
                  <span
                    key={skill}
                    onClick={() => handleToggleSkill(skill)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-[#D6E8DD] text-[#004D2F] cursor-pointer hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
                    title="Click to remove"
                  >
                    <Check size={12} className="text-[#008855]" />
                    <span>{skill}</span>
                  </span>
                ))}

                {/* Add new skill inline */}
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="+ Add skill..."
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSkill(e);
                      }
                    }}
                    className="px-2 py-0.5 text-xs rounded-md border-none bg-transparent placeholder:text-neutral-400 focus:outline-none focus:ring-0 w-24"
                  />
                  {newSkillInput && (
                    <button
                      type="button"
                      onClick={handleAddCustomSkill}
                      className="p-1 rounded bg-[#008855] text-white hover:bg-[#007044] cursor-pointer"
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Difficulty & Question Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#004D2F] uppercase tracking-wider mb-2">
                  3. Interview Difficulty
                </label>
                <div className="flex gap-1.5 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
                  {(['entry', 'intermediate', 'senior'] as InterviewDifficulty[]).map((level) => {
                    const isSelected = difficulty === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={cn(
                          'flex-1 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all cursor-pointer',
                          isSelected
                            ? 'bg-white text-[#008855] shadow-2xs font-bold'
                            : 'text-neutral-600 hover:text-neutral-900'
                        )}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#004D2F] uppercase tracking-wider mb-2">
                  4. Question Count
                </label>
                <div className="flex gap-1.5 p-1 rounded-xl bg-neutral-100 border border-neutral-200">
                  {[3, 5, 7].map((num) => {
                    const isSelected = numQuestions === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNumQuestions(num)}
                        className={cn(
                          'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                          isSelected
                            ? 'bg-white text-[#008855] shadow-2xs font-bold'
                            : 'text-neutral-600 hover:text-neutral-900'
                        )}
                      >
                        {num} Questions
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-4 border-t border-[#EAF2ED] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || (!selectedRole && !customRole)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#008855] hover:bg-[#007044] shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap size={15} />
                <span>Start Interview</span>
              </button>
            </div>
          </form>
        )}
        </div>
      </BorderBeam>
    </div>
  );
};
