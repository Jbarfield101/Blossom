import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface DocMeta {
  doc_id: string;
  title?: string;
  pages?: number;
  created?: string;
}

export function useDocs() {
  const [docs, setDocs] = useState<DocMeta[]>([]);

  async function refresh() {
    try {
      const list = await invoke<DocMeta[]>("pdf_list");
      setDocs(list);
    } catch {
      setDocs([]);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function ingestDoc(docId: string) {
    await invoke("pdf_ingest", { docId });
  }

  async function addDoc(path: string, ingest = false) {
    const meta = await invoke<DocMeta>("pdf_add", { path });
    if (ingest) {
      await ingestDoc(meta.doc_id);
    }
    refresh();
    return meta;
  }

  async function removeDoc(docId: string) {
    await invoke("pdf_remove", { docId });
    refresh();
  }

  async function searchDocs(query: string) {
    return invoke("pdf_search", { query });
  }

  return { docs, refresh, addDoc, removeDoc, searchDocs, ingestDoc };
}

export type { DocMeta };

