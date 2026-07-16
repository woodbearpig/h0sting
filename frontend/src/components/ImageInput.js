import { useRef, useState } from "react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2 } from "lucide-react";

export const ImageInput = ({ value, onChange, testId, allowUrl = true, previewClassName = "max-h-40 w-full" }) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const isData = (value || "").startsWith("data:");

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        data-testid={testId}
        className={`cursor-pointer border-2 border-dashed rounded-md p-4 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-black/30 hover:border-black"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Upload className="h-4 w-4" /> Drag &amp; drop an image, or click to upload
          </div>
        )}
      </div>

      {allowUrl && (
        <Input
          placeholder="…or paste an image URL"
          value={isData ? "" : (value || "")}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId ? `${testId}-url` : undefined}
        />
      )}

      {value && (
        <div className="relative inline-block">
          <img src={value} alt="preview" className={`${previewClassName} rounded border-2 border-black object-cover`} />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 border-2 border-white"
            data-testid={testId ? `${testId}-clear` : undefined}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};
