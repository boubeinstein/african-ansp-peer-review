"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  accept?: string;
  maxSize?: number;
  label?: string;
  helpText?: string;
  disabled?: boolean;
  uploadEndpoint?: string;
}

export function FileUpload({
  value,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxSize = 5,
  label,
  helpText,
  disabled,
  uploadEndpoint = "/api/upload/public",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File too large. Maximum ${maxSize}MB allowed.`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const { url } = await response.json();
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(undefined);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}

      {value ? (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <FileText className="w-5 h-5 text-green-600" />
          <span className="flex-1 text-sm text-green-800 truncate">
            File uploaded
          </span>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:underline"
          >
            View
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            isUploading
              ? "border-blue-300 bg-blue-50"
              : "border-slate-300 hover:border-slate-400",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-sm text-slate-600">Uploading...</span>
            </div>
          ) : (
            <div
              className={cn(
                "flex flex-col items-center gap-2",
                !disabled && "cursor-pointer"
              )}
              onClick={() => !disabled && inputRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-slate-400" />
              <span className="text-sm text-slate-600">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-slate-400">
                PDF, JPEG, PNG (max {maxSize}MB)
              </span>
            </div>
          )}
        </div>
      )}

      {helpText && !error && (
        <p className="text-xs text-slate-500">{helpText}</p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
