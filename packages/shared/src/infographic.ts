import { Base64 } from "js-base64";

export const INFOGRAPHIC_SCHEMA_VERSION = 1 as const;
const MARKER = "edgeever-infographic-v1";
const COMMENT = /<!--\s*edgeever-infographic-v1:([A-Za-z0-9_-]+)\s*-->/;

export type InfographicDocument = {
  schemaVersion: typeof INFOGRAPHIC_SCHEMA_VERSION;
  // AntV Infographic's native source, separate from the visual diagram IR.
  syntax: string;
};

export const createDefaultInfographicDocument = (): InfographicDocument => ({
  schemaVersion: INFOGRAPHIC_SCHEMA_VERSION,
  syntax: "",
});

export const infographicFallbackMarkdown = (document: InfographicDocument) =>
  document.syntax.trim() ? `\`\`\`infographic\n${document.syntax.trim()}\n\`\`\`` : "";

export const serializeInfographicDocument = (document: InfographicDocument) => {
  const fallback = infographicFallbackMarkdown(document);
  const marker = `<!-- ${MARKER}:${Base64.encodeURI(JSON.stringify(document))} -->`;
  return fallback ? `${fallback}\n\n${marker}` : marker;
};

export const hasInfographicDocumentMarker = (markdown: string | null | undefined) =>
  Boolean(markdown?.includes(`<!-- ${MARKER}:`));

export const stripInfographicDocumentMarker = (markdown: string) =>
  markdown.replace(/<!--\s*edgeever-infographic-v1:[\s\S]*?-->/g, "").trim();

export const parseInfographicDocument = (markdown: string | null | undefined): InfographicDocument | null => {
  const encoded = markdown?.match(COMMENT)?.[1];
  if (!encoded || encoded.length > 2_000_000) return null;
  try {
    const value: unknown = JSON.parse(Base64.decode(encoded));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const document = value as Record<string, unknown>;
    if (document.schemaVersion !== INFOGRAPHIC_SCHEMA_VERSION || typeof document.syntax !== "string" || document.syntax.length > 200_000) return null;
    return { schemaVersion: INFOGRAPHIC_SCHEMA_VERSION, syntax: document.syntax };
  } catch {
    return null;
  }
};

export const getInfographicSummary = (markdown: string | null | undefined) => ({
  infographic: Boolean(parseInfographicDocument(markdown)),
});
