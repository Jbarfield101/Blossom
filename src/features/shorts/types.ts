type ShortSpec = {
  id: string;
  title: string;
  script: string;
  audio_path?: string;
  visual_path?: string;
  export_path?: string;
  status: "draft" | "rendering" | "done" | "failed";
  created_at: string;
};

export type { ShortSpec };
