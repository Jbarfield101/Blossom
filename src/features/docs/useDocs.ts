import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface DocMeta {
  doc_id: string;
  title?: string;
  pages?: number;
  created?: string;
}

export interface SearchResult {
  doc_id: string;
  page: number;
  snippet: string;
  score: number;
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

  async function searchDocs(query: string): Promise<SearchResult[]> {
    try {
      const hits = await invoke<
        { doc_id: string; page_range: [number, number]; text: string; score: number }[]
      >("pdf_search", { query });
      return hits.map((hit) => ({
        doc_id: hit.doc_id,
        page: hit.page_range[0],
        snippet: hit.text,
        score: hit.score,
      }));
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Failed to search docs: ${err.message}`);
      }
      return [];
    }
  }

  return { docs, refresh, addDoc, removeDoc, searchDocs, ingestDoc };
}

export type { DocMeta, SearchResult };

