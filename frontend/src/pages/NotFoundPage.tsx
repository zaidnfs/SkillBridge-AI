import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F3F5F4] text-[#0A1A12] font-sans antialiased">
      <div className="h-16 w-16 rounded-2xl bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD] flex items-center justify-center mb-4 shadow-xs">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-[#0A1A12]">
        404 — Page Not Found
      </h1>
      <p className="text-sm text-neutral-500 mt-2 max-w-md leading-relaxed">
        The career intelligence view you are looking for does not exist or has been shifted in our knowledge graph.
      </p>
      <Link
        to="/"
        className="mt-6 h-10 px-6 rounded-full text-xs font-semibold text-white bg-[#008855] hover:bg-[#007347] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-[#008855]/20 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </Link>
    </div>
  );
};
