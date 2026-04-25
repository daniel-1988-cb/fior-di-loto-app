export type ClientDocument = {
  id: string;
  client_id: string;
  nome: string;
  tipo: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  note: string | null;
  created_at: string;
};

export const VALID_DOCUMENT_TIPI = [
  "consenso",
  "identita",
  "contratto",
  "foto",
  "altro",
] as const;

export type DocumentTipo = (typeof VALID_DOCUMENT_TIPI)[number];

export const DOCUMENT_TIPO_LABEL: Record<DocumentTipo, string> = {
  consenso: "Consenso",
  identita: "Documento identità",
  contratto: "Contratto",
  foto: "Foto",
  altro: "Altro",
};
