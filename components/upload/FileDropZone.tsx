'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Upload, FileCheck, X } from 'lucide-react';

interface FileDropZoneProps {
  label: string;
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function isValidGeoTiff(fileName: string): boolean {
  return /\.(tif|tiff)$/i.test(fileName);
}

export function FileDropZone({
  label,
  file,
  onFileSelect,
  onFileRemove,
  disabled = false,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const processFile = (selectedFile: File) => {
    setValidationError(null);
    if (!isValidGeoTiff(selectedFile.name)) {
      setValidationError('Only .tif or .tiff files are supported.');
      return;
    }
    if (selectedFile.size > 60 * 1024 * 1024) {
      setValidationError(`File exceeds the 60 MB maximum limit (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }
    onFileSelect(selectedFile);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const chosenFile = e.target.files?.[0];
    if (chosenFile) {
      processFile(chosenFile);
    }
    // Reset input value so re-selecting the same file name works
    e.target.value = '';
  };

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink">{label}</span>

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`border border-dashed rounded-[2px] p-6 min-h-[160px] flex flex-col items-center justify-center text-center transition-colors cursor-pointer select-none ${
          isDragOver
            ? 'border-teal bg-teal-faint'
            : file
            ? 'border-solid border-hairline bg-transparent'
            : 'border-hairline hover:border-ink bg-transparent'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".tif,.tiff"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {file ? (
          <div className="flex flex-col items-center gap-2 max-w-full">
            <div className="w-8 h-8 rounded-[2px] border border-hairline flex items-center justify-center text-teal">
              <FileCheck className="w-4 h-4 text-teal" strokeWidth={1.5} />
            </div>
            <div className="max-w-full px-2 text-center">
              <p className="font-data text-sm font-semibold text-ink truncate max-w-xs sm:max-w-sm">
                {file.name}
              </p>
              <p className="font-data text-xs text-teal mt-0.5">
                {formatFileSize(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setValidationError(null);
                onFileRemove();
              }}
              className="mt-1 flex items-center gap-1 text-xs text-text-secondary hover:text-rust transition-colors py-1 px-2 border border-transparent hover:border-hairline rounded-[2px]"
            >
              <X className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-[2px] border border-hairline flex items-center justify-center text-text-secondary">
              <Upload className="w-4 h-4 text-text-secondary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                Drag & drop or click to choose
              </p>
              <p className="font-data text-xs text-text-secondary mt-1">
                .tif or .tiff format (up to 60 MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {validationError && (
        <p className="text-xs text-rust font-sans mt-0.5">
          {validationError}
        </p>
      )}
    </div>
  );
}
