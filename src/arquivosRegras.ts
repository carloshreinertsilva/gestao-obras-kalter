// Regras puras da entrada de arquivos (Pacote 3, C7): o que o componente EntradaArquivos aceita ou recusa,
// nome do print colado e tirar repetidos. Separado do componente para ter teste (vitest) sem navegador.

export interface ArquivoBasico {
  name: string;
  type: string;
  size: number;
  lastModified?: number;
}

export interface Recusa<T extends ArquivoBasico = ArquivoBasico> {
  arquivo: T;
  motivo: "tipo" | "tamanho";
}

const EXT_IMAGEM = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "heic", "heif", "avif"];

const extensao = (nome: string) => {
  const p = String(nome || "").lastIndexOf(".");
  return p >= 0 ? nome.slice(p + 1).toLowerCase() : "";
};

// celular as vezes entrega foto sem tipo (type ""): deduz pela extensao para nao recusar foto valida
const tipoEfetivo = (a: ArquivoBasico) => {
  const t = String(a.type || "").toLowerCase();
  if (t) return t;
  const ext = extensao(a.name);
  if (EXT_IMAGEM.includes(ext)) return `image/${ext === "jpg" ? "jpeg" : ext}`;
  if (ext === "pdf") return "application/pdf";
  return "";
};

const itensAccept = (accept?: string) =>
  String(accept || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** Mesmo criterio do atributo accept do navegador: ".pdf", "image/*", "application/pdf". Sem accept = aceita tudo. */
export function aceitaArquivo(arquivo: ArquivoBasico, accept?: string): boolean {
  const itens = itensAccept(accept);
  if (!itens.length) return true;
  const ext = extensao(arquivo.name);
  const tipo = tipoEfetivo(arquivo);
  return itens.some((item) => {
    if (item.startsWith(".")) return ext === item.slice(1);
    if (item.endsWith("/*")) return tipo.startsWith(item.slice(0, -1));
    return tipo === item;
  });
}

/** O accept deixa entrar imagem? (decide se mostra "Tirar foto" e se aceita print colado) */
export function acceptPermiteImagem(accept?: string): boolean {
  const itens = itensAccept(accept);
  if (!itens.length) return true;
  return itens.some(
    (item) => item.startsWith("image/") || (item.startsWith(".") && EXT_IMAGEM.includes(item.slice(1))),
  );
}

const dois = (n: number) => String(n).padStart(2, "0");

/** Nome do print colado: print-AAAAMMDD-HHMMSS.<ext> (hora local, como a pessoa ve no relogio). */
export function nomePrint(data: Date, tipo = "image/png", sufixo = 0): string {
  const ext = tipo === "image/jpeg" ? "jpg" : (tipo.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "") || "png";
  const base =
    `print-${data.getFullYear()}${dois(data.getMonth() + 1)}${dois(data.getDate())}` +
    `-${dois(data.getHours())}${dois(data.getMinutes())}${dois(data.getSeconds())}`;
  return `${base}${sufixo > 0 ? `-${sufixo + 1}` : ""}.${ext}`;
}

/** Imagem colada costuma vir sem nome ou como "image.png": nesse caso ganha nome de print. Arquivo copiado do
 *  Explorer mantem o nome original. */
export function precisaNomeDePrint(nome: string): boolean {
  const n = String(nome || "").trim().toLowerCase();
  return !n || /^image\.(png|jpe?g|gif|webp|bmp)$/.test(n) || /^imagem\.(png|jpe?g)$/.test(n);
}

const chave = (a: ArquivoBasico) => `${a.name}|${a.size}|${a.type}|${a.lastModified ?? ""}`;

/** Tira repetidos (mesmo nome, tamanho, tipo e data): o colar traz o mesmo arquivo em files e em items. */
export function semDuplicados<T extends ArquivoBasico>(arquivos: T[]): T[] {
  const vistos = new Set<string>();
  return arquivos.filter((a) => {
    const k = chave(a);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/** Separa aceitos e recusados (fora do accept ou acima de maxMb), sem repetidos. */
export function separarArquivos<T extends ArquivoBasico>(
  arquivos: T[],
  opcoes: { accept?: string; maxMb?: number },
): { aceitos: T[]; recusados: Recusa<T>[] } {
  const aceitos: T[] = [];
  const recusados: Recusa<T>[] = [];
  const limite = opcoes.maxMb && opcoes.maxMb > 0 ? opcoes.maxMb * 1024 * 1024 : Infinity;
  for (const a of semDuplicados(arquivos)) {
    if (!aceitaArquivo(a, opcoes.accept)) recusados.push({ arquivo: a, motivo: "tipo" });
    else if (a.size > limite) recusados.push({ arquivo: a, motivo: "tamanho" });
    else aceitos.push(a);
  }
  return { aceitos, recusados };
}

// ".pdf,image/*" -> "PDF ou imagem"; usado no aviso de recusa
export function descreverAccept(accept?: string): string {
  const nomes: string[] = [];
  for (const item of itensAccept(accept)) {
    let n = "";
    if (item.startsWith("image/") || (item.startsWith(".") && EXT_IMAGEM.includes(item.slice(1)))) n = "imagem";
    else if (item === ".pdf" || item === "application/pdf") n = "PDF";
    else if (item === ".xml" || item.endsWith("/xml")) n = "XML";
    else if ([".doc", ".docx"].includes(item)) n = "Word";
    else if ([".xls", ".xlsx", ".csv"].includes(item)) n = "Excel";
    else n = item.startsWith(".") ? item.slice(1).toUpperCase() : item;
    if (!nomes.includes(n)) nomes.push(n);
  }
  if (nomes.length <= 1) return nomes[0] || "";
  return `${nomes.slice(0, -1).join(", ")} ou ${nomes[nomes.length - 1]}`;
}

/** Texto do aviso de recusa: diz QUAIS arquivos ficaram de fora e por que. */
export function textoRecusa(recusados: Recusa[], opcoes: { accept?: string; maxMb?: number }): string {
  if (!recusados.length) return "";
  const porTipo = recusados.filter((r) => r.motivo === "tipo").map((r) => r.arquivo.name || "arquivo sem nome");
  const porTamanho = recusados.filter((r) => r.motivo === "tamanho").map((r) => r.arquivo.name || "arquivo sem nome");
  const partes: string[] = [];
  if (porTipo.length) {
    const aceitos = descreverAccept(opcoes.accept);
    partes.push(
      `${porTipo.length === 1 ? "Arquivo não aceito" : "Arquivos não aceitos"}: ${porTipo.join(", ")}` +
        (aceitos ? ` (aqui só ${aceitos}).` : "."),
    );
  }
  if (porTamanho.length) {
    partes.push(
      `${porTamanho.length === 1 ? "Arquivo maior" : "Arquivos maiores"} que ${opcoes.maxMb} MB: ${porTamanho.join(", ")}.`,
    );
  }
  return partes.join(" ");
}

/** "Enviando 2 de 5…" (so quando ha mais de um). */
export function textoProgresso(atual: number, total: number): string {
  return total > 1 ? `Enviando ${atual} de ${total}…` : "Enviando…";
}
