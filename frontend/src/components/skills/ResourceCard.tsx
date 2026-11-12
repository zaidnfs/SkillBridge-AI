import React from 'react';
import { ExternalLink, Clock, BookOpen, Video, Code2, Compass } from 'lucide-react';
import { LearningResource } from '../../types/skills';

interface ResourceCardProps {
  resource: LearningResource;
}

const getPlatformBadgeStyle = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case 'youtube':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'freecodecamp':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'mdn':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'official_docs':
      return 'bg-cyan-50 text-cyan-800 border-cyan-200';
    case 'roadmap_sh':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'github':
      return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    case 'realpython':
      return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    default:
      return 'bg-neutral-50 text-neutral-700 border-neutral-200';
  }
};

const getDifficultyBadgeStyle = (difficulty: string): string => {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'bg-[#EEF7F1] text-[#004D2F] border-[#D6E8DD]';
    case 'intermediate':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'advanced':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    default:
      return 'bg-neutral-50 text-neutral-600 border-neutral-200';
  }
};

const getResourceTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'video':
      return <Video className="h-3 w-3 text-red-500" />;
    case 'interactive':
      return <Code2 className="h-3 w-3 text-emerald-600" />;
    case 'course':
      return <Compass className="h-3 w-3 text-indigo-600" />;
    default:
      return <BookOpen className="h-3 w-3 text-blue-600" />;
  }
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  return (
    <div className="group flex flex-col justify-between rounded-xl border border-[#E2E8E5] bg-white p-4 transition-all duration-200 hover:border-[#00A264] hover:shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${getPlatformBadgeStyle(
                resource.platform
              )}`}
            >
              {resource.platform_display || resource.platform}
            </span>

            <span
              className={`text-[10px] font-medium capitalize px-2 py-0.5 rounded border ${getDifficultyBadgeStyle(
                resource.difficulty
              )}`}
            >
              {resource.difficulty_display || resource.difficulty}
            </span>
          </div>

          <span className="text-[10px] font-semibold text-[#008855] bg-[#EEF7F1] px-1.5 py-0.5 rounded">
            Free
          </span>
        </div>

        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-[#0A1A12] hover:text-[#008855] transition-colors flex items-start justify-between gap-1.5"
        >
          <span>{resource.title}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100 group-hover:text-[#008855] transition-all mt-0.5" />
        </a>

        {resource.description && (
          <p className="mt-1.5 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
            {resource.description}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1">
          {getResourceTypeIcon(resource.resource_type)}
          <span className="capitalize">{resource.resource_type_display || resource.resource_type}</span>
        </span>

        {resource.estimated_hours ? (
          <span className="flex items-center gap-1 font-mono text-neutral-600">
            <Clock className="h-3 w-3 text-neutral-400" />
            {resource.estimated_hours}h
          </span>
        ) : null}
      </div>
    </div>
  );
};
