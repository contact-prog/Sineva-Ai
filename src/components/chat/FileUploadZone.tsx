import { useCallback, useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Video, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'document' | 'other';
}

interface FileUploadZoneProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (index: number) => void;
  compact?: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10;

export function FileUploadZone({ onFilesSelected, uploadedFiles, onRemoveFile, compact = false }: FileUploadZoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);

  const getFileType = (file: File): UploadedFile['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (
      file.type.includes('pdf') ||
      file.type.includes('document') ||
      file.type.includes('text') ||
      file.type.includes('sheet')
    ) return 'document';
    return 'other';
  };

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    
    // Check total count
    if (uploadedFiles.length + filesArray.length > MAX_FILES) {
      toast({
        title: "Too many files",
        description: `Maximum ${MAX_FILES} files allowed`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: UploadedFile[] = [];

    for (const file of filesArray) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 20MB limit`,
          variant: "destructive",
        });
        continue;
      }

      const fileType = getFileType(file);
      const uploadedFile: UploadedFile = { file, type: fileType };

      // Create preview for images
      if (fileType === 'image') {
        uploadedFile.preview = URL.createObjectURL(file);
      }

      validFiles.push(uploadedFile);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [uploadedFiles.length, onFilesSelected, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input
    e.target.value = '';
  }, [processFiles]);

  const getFileIcon = (type: UploadedFile['type']) => {
    switch (type) {
      case 'image': return ImageIcon;
      case 'video': return Video;
      case 'document': return FileText;
      default: return File;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload-compact"
        />
        <label htmlFor="file-upload-compact">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            asChild
          >
            <div>
              <Upload className="h-4 w-4" />
            </div>
          </Button>
        </label>
        
        {uploadedFiles.length > 0 && (
          <div className="flex gap-1">
            {uploadedFiles.map((file, idx) => {
              const Icon = getFileIcon(file.type);
              return (
                <div
                  key={idx}
                  className="relative group"
                >
                  {file.preview ? (
                    <div className="w-8 h-8 rounded border border-border overflow-hidden">
                      <img src={file.preview} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded border border-border flex items-center justify-center bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                  )}
                  <button
                    onClick={() => onRemoveFile(idx)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-all",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-border hover:border-primary/50"
        )}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center cursor-pointer"
        >
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium mb-1">
            Drop files or click to upload
          </p>
          <p className="text-xs text-muted-foreground">
            Images, videos, documents (max 20MB, up to 10 files)
          </p>
        </label>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {uploadedFiles.map((file, idx) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={idx}
                className="relative group border border-border rounded-lg p-3 hover:border-primary/50 transition-all"
              >
                {file.preview ? (
                  <div className="w-full h-24 rounded overflow-hidden mb-2">
                    <img src={file.preview} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-24 rounded bg-muted flex items-center justify-center mb-2">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <p className="text-xs font-medium truncate">{file.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.file.size / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={() => onRemoveFile(idx)}
                  className="absolute top-2 right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4 text-destructive-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
