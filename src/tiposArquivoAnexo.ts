// Tipos de arquivo dos anexos da obra e dos documentos do projeto (Pacote 4, D6).
// Regra: aceita qualquer arquivo de trabalho (PDF, Office, imagens, video, CAD, compactados, e-mail...) e BARRA por
// extensao o que executa ou abre como pagina (executavel, script, atalho, HTML, SVG). Lista de extensoes permitidas
// nao serve aqui: barraria desenho/arquivo legitimo de programa que a gente nao previu.
// MESMA lista do banco: public.arquivo_extensao_bloqueada (sql p4_d6_buckets.sql) - mudar nos dois lugares.

export const MAX_MB_ANEXO = 25; // igual ao limite do bucket (file_size_limit) e ao que o app ja usava

export const EXTENSOES_BLOQUEADAS = [
  "exe", "msi", "msix", "msp", "appx", "appxbundle", "bat", "cmd", "com", "scr", "pif", "cpl", "dll", "sys", "drv",
  "ps1", "psm1", "psd1", "vbs", "vbe", "js", "jse", "mjs", "wsf", "wsh", "hta", "jar", "apk", "app", "deb", "rpm",
  "sh", "bash", "run", "lnk", "url", "reg", "inf", "gadget", "application", "msc", "scf",
  "html", "htm", "xhtml", "shtml", "mht", "mhtml", "svg", "svgz", "php", "asp", "aspx", "jsp",
  "iso", "img", "vhd", "vhdx",
];

// Tipos (Content-Type) que o bucket aceita. Arquivo com outro tipo, mas extensao liberada, vai como
// application/octet-stream (o bucket aceita) - assim um desenho ou planilha de programa menos comum nao falha no envio.
export const TIPOS_ACEITOS_BUCKET = [
  "application/pdf", "text/plain", "text/csv", "text/xml", "application/xml", "application/json", "application/rtf",
  "text/rtf", "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel.sheet.macroenabled.12", "application/vnd.ms-excel.sheet.binary.macroenabled.12",
  "application/vnd.ms-word.document.macroenabled.12", "application/vnd.ms-powerpoint.presentation.macroenabled.12",
  "application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation", "application/vnd.ms-project",
  "application/vnd.visio", "application/vnd.ms-visio.drawing", "application/vnd.ms-xpsdocument",
  "message/rfc822", "application/vnd.ms-outlook",
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff", "image/heic", "image/heif", "image/avif",
  "video/mp4", "video/quicktime", "video/3gpp", "video/webm", "video/x-msvideo", "video/x-matroska",
  "audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg", "audio/wav", "audio/x-m4a", "audio/webm",
  "application/zip", "application/x-zip-compressed", "application/x-rar-compressed", "application/vnd.rar",
  "application/x-rar", "application/x-7z-compressed", "application/gzip", "application/x-tar",
  "application/acad", "application/x-acad", "application/autocad_dwg", "application/dwg", "application/x-dwg",
  "image/vnd.dwg", "image/x-dwg", "application/dxf", "application/x-dxf", "image/vnd.dxf", "image/x-dxf",
  "model/vnd.dwf", "application/x-dwf", "model/ifc", "application/x-step", "model/step",
  "model/stl", "application/sla", "application/vnd.ms-pki.stl", "application/vnd.sketchup.skp",
  "application/x-zip", "application/x-compressed",
  "application/vnd.google-earth.kml+xml", "application/vnd.google-earth.kmz",
  "application/octet-stream",
];

/** Extensao em minusculas, sem o ponto ("" se nao tiver). */
export function extensaoArquivo(nome: string): string {
  const n = String(nome || "");
  const barra = Math.max(n.lastIndexOf("/"), n.lastIndexOf("\\"));
  const base = n.slice(barra + 1);
  const p = base.lastIndexOf(".");
  return p > 0 || (p === 0 && base.length > 1) ? base.slice(p + 1).toLowerCase() : "";
}

export function arquivoBloqueado(nome: string): boolean {
  return EXTENSOES_BLOQUEADAS.includes(extensaoArquivo(nome));
}

/** Separa os arquivos permitidos dos bloqueados e monta o aviso ("Tipo de arquivo não permitido: .exe"). */
export function separarPorTipo<T extends { name: string }>(arquivos: T[]): { permitidos: T[]; bloqueados: T[]; aviso: string } {
  const permitidos = arquivos.filter((a) => !arquivoBloqueado(a.name));
  const bloqueados = arquivos.filter((a) => arquivoBloqueado(a.name));
  return { permitidos, bloqueados, aviso: textoTipoNaoPermitido(bloqueados) };
}

export function textoTipoNaoPermitido(bloqueados: { name: string }[]): string {
  if (!bloqueados.length) return "";
  const exts = [...new Set(bloqueados.map((a) => `.${extensaoArquivo(a.name)}`))];
  const nomes = bloqueados.map((a) => a.name).join(", ");
  return exts.length === 1
    ? `Tipo de arquivo não permitido: ${exts[0]} (${nomes}).`
    : `Tipos de arquivo não permitidos: ${exts.join(", ")} (${nomes}).`;
}

/** Content-Type para enviar ao Storage: o do navegador se o bucket aceita; senao octet-stream (extensao ja conferida). */
export function tipoParaEnvio(arquivo: { type: string }): string {
  const t = String(arquivo.type || "").toLowerCase().split(";")[0].trim();
  return t && TIPOS_ACEITOS_BUCKET.includes(t) ? t : "application/octet-stream";
}
