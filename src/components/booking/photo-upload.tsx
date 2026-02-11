"use client";

import { useCallback, useState } from "react";
import { Upload, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MAX_FILES = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type PhotoFile = {
  file: File;
  preview: string;
};

export function PhotoUpload({
  files,
  onChange,
}: {
  files: PhotoFile[];
  onChange: (files: PhotoFile[]) => void;
}) {
  const [dragActive, setDragActive] = useState(false);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const validFiles = Array.from(newFiles).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      );
      const remaining = MAX_FILES - files.length;
      const toAdd = validFiles.slice(0, remaining).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      onChange([...files, ...toAdd]);
    },
    [files, onChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      const updated = [...files];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      onChange(updated);
    },
    [files, onChange]
  );

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {files.length < MAX_FILES && (
        <label
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            dragActive
              ? "border-ring bg-accent/20"
              : "border-border hover:border-ring/50 active:border-ring/50"
          )}
        >
          <Upload className="mb-2 size-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drag and drop images, or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPG, WEBP up to 5MB
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleChange}
          />
        </label>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((photo, index) => (
            <div key={photo.preview} className="group relative aspect-square">
              <img
                src={photo.preview}
                alt={photo.file.name}
                className="size-full rounded-lg object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-1 top-1 size-6 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                onClick={() => removeFile(index)}
              >
                <X className="size-3" />
              </Button>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {photo.file.name}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {files.length} of {MAX_FILES} photos added
      </p>
    </div>
  );
}

export type { PhotoFile };
