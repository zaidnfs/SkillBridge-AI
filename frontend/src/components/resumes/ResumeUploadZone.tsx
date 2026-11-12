import React, { useState, useRef } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ReiconAtsDoc } from '@/components/icons/Reicon';
import { resumeService } from '@/services/resumeService';
import { ResumeSummary } from '@/types/resumes';

interface ResumeUploadZoneProps {
  onUploadSuccess: (resume: ResumeSummary) => void;
}

export const ResumeUploadZone: React.FC<ResumeUploadZoneProps> = ({ onUploadSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileProcess = async (file: File) => {
    // Client-side validations
    const allowedExtensions = ['.pdf', '.docx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setUploadError(`Unsupported file format. Please upload a .pdf or .docx document.`);
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      setUploadError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 5MB maximum limit.`
      );
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const summary = await resumeService.uploadResume(file);
      onUploadSuccess(summary);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.file?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to upload and parse resume. Please ensure the file is valid.';
      setUploadError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload resume file dropzone. Supports PDF and DOCX documents up to 5 megabytes."
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative flex flex-col items-center justify-center p-8 sm:p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#008855] ${
          isDragging
            ? 'border-[#008855] bg-[#EEF7F1] scale-[1.01]'
            : 'border-[#D6E8DD] bg-[#F8FAF8] hover:bg-[#EEF7F1]/60 hover:border-[#008855]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          aria-label="Resume file input (.pdf, .docx)"
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="h-12 w-12 rounded-xl bg-[#EEF7F1] text-[#008855] border border-[#D6E8DD] flex items-center justify-center mb-3">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <ReiconAtsDoc size={24} strokeWidth={2} />
          )}
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-[#0A1A12]">
            {isUploading ? 'Parsing Technical Skills via NER...' : 'Click or drag your resume to upload'}
          </p>
          <p className="text-xs text-neutral-500">
            Supports PDF and DOCX files up to 5MB
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-white text-neutral-600 border border-neutral-200">
            PDF
          </span>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-white text-neutral-600 border border-neutral-200">
            DOCX
          </span>
        </div>
      </div>

      {uploadError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
};
