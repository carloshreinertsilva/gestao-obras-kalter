// Pecas de tela do modulo Exportacao, no mesmo visual do cadastro de obras (TelaCadastroObras.tsx).
import { useState, type ReactNode } from "react";
import { idDoCampo } from "./navegacao";
import { num } from "./numeros";
import { ler } from "./processo";
import type { Processo } from "./tipos";

export const classeCampo =
  "w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#2A6377] focus:ring-2 focus:ring-[#2A6377]/15 disabled:bg-slate-50 disabled:text-slate-400";
export const classeCelula =
  "w-full h-8 px-1.5 rounded border border-slate-300 bg-white text-[13px] text-slate-800 outline-none focus:border-[#2A6377] focus:ring-1 focus:ring-[#2A6377]/20 disabled:bg-slate-50 disabled:text-slate-400";
/** Valor estimado (catalogo/calculo): azul, como no programa local e na pre-visualizacao. */
export const classeEstimado = "!bg-[#ddebf7] !text-[#1f4e9a] italic";

export function Rotulo({ htmlFor, texto, obrigatorio, dica }: { htmlFor?: string; texto: string; obrigatorio?: boolean; dica?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 mb-1">
      <span className="text-xs font-semibold text-slate-600">
        {texto}
        {obrigatorio && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {dica && <span className="text-[10px] text-slate-400 truncate">{dica}</span>}
    </label>
  );
}

export function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="mb-4">
        <h4 className="text-sm font-bold text-slate-800">{titulo}</h4>
        {descricao && <p className="text-xs text-slate-500 mt-0.5">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

export function Titulo({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold text-slate-800">{titulo}</h3>
      {descricao && <p className="text-sm text-slate-500 mt-0.5">{descricao}</p>}
    </div>
  );
}

const TONS = {
  ok: "text-emerald-700",
  erro: "text-red-600",
  aviso: "text-amber-700",
  azul: "text-[#1f4e9a]",
  normal: "text-slate-800",
} as const;

export function Cartao({ rotulo, valor, sub, tom = "normal" }: { rotulo: string; valor: ReactNode; sub?: ReactNode; tom?: keyof typeof TONS }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className={`text-lg font-bold tabular-nums break-words ${TONS[tom]}`}>{valor}</p>
      {sub && <p className="text-[11px] text-slate-500 break-words">{sub}</p>}
    </div>
  );
}

const CAIXAS = {
  erro: "bg-red-50 border-red-200 text-red-700",
  aviso: "bg-amber-50 border-amber-200 text-amber-800",
  erp: "bg-violet-50 border-violet-200 text-violet-800",
  ok: "bg-emerald-50 border-emerald-200 text-emerald-800",
  info: "bg-slate-50 border-slate-200 text-slate-600",
} as const;

export function Aviso({ tom, children, acao }: { tom: keyof typeof CAIXAS; children: ReactNode; acao?: ReactNode }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm flex items-start gap-3 ${CAIXAS[tom]}`} role={tom === "erro" ? "alert" : undefined}>
      <div className="flex-1 min-w-0">{children}</div>
      {acao}
    </div>
  );
}

export function Botao({
  children,
  onClick,
  tipo = "secundario",
  desabilitado,
  titulo,
  tamanho = "normal",
}: {
  children: ReactNode;
  onClick?: () => void;
  tipo?: "primario" | "secundario" | "perigo";
  desabilitado?: boolean;
  titulo?: string;
  tamanho?: "normal" | "pequeno";
}) {
  const base = tamanho === "pequeno" ? "h-7 px-2.5 text-xs" : "h-10 px-4 text-sm";
  const cor =
    tipo === "primario"
      ? "bg-[#2A6377] hover:bg-[#21505f] text-white border-transparent"
      : tipo === "perigo"
        ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      title={titulo}
      className={`${base} rounded-lg border font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed ${cor}`}
    >
      {children}
    </button>
  );
}

/** "1,5" ou "1.234,5" ou "1234.5" -> numero (virgula = decimal; sem virgula, o ponto e decimal), como no programa local. */
export function lerNumero(texto: string): number {
  let s = texto.trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const x = parseFloat(s);
  return Number.isNaN(x) ? 0 : x;
}

export const fmtBR = (v: unknown, casas = 2): string =>
  num(v).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const dataBR = (iso?: string | null): string => (iso && iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso || "");

/** Campo numerico: mostra formatado (1.234,5) fora do foco e o texto digitado no foco; guarda o numero. */
export function CampoNumero({
  id,
  valor,
  onChange,
  casas = 6,
  placeholder,
  zeroVisivel = false,
  classe = classeCampo,
  estimado,
  titulo,
  desabilitado,
  rotuloAcessivel,
}: {
  id?: string;
  valor: unknown;
  onChange: (v: number) => void;
  casas?: number;
  placeholder?: string;
  zeroVisivel?: boolean;
  classe?: string;
  estimado?: boolean;
  titulo?: string;
  desabilitado?: boolean;
  rotuloAcessivel?: string;
}) {
  const [foco, setFoco] = useState(false);
  const [texto, setTexto] = useState("");
  const n = num(valor);
  const preenchido = n !== 0 || zeroVisivel;
  const mostrar = preenchido ? n.toLocaleString("pt-BR", { maximumFractionDigits: casas }) : "";
  return (
    <input
      id={id}
      inputMode="decimal"
      autoComplete="off"
      aria-label={rotuloAcessivel}
      title={titulo}
      disabled={desabilitado}
      placeholder={placeholder}
      value={foco ? texto : mostrar}
      onFocus={() => {
        setTexto(preenchido ? String(Number(n.toPrecision(12))).replace(".", ",") : "");
        setFoco(true);
      }}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(lerNumero(e.target.value));
      }}
      onBlur={() => setFoco(false)}
      className={`${classe} text-right tabular-nums ${estimado ? classeEstimado : ""}`}
    />
  );
}

type Opcao = string | [string, string];

/** Campo ligado a um caminho do processo ("importador.razao"): texto, numero, select, area ou data. */
export function CampoProcesso({
  proc,
  atualizar,
  caminho,
  rotulo,
  obrigatorio,
  dica,
  className,
  tipo = "texto",
  opcoes,
  lista,
  placeholder,
  linhas = 2,
  casas,
}: {
  proc: Processo;
  atualizar: (caminho: string, valor: unknown) => void;
  caminho: string;
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  className?: string;
  tipo?: "texto" | "numero" | "select" | "area" | "data";
  opcoes?: Opcao[];
  lista?: string;
  placeholder?: string;
  linhas?: number;
  casas?: number;
}) {
  const id = idDoCampo(caminho);
  const valor = ler(proc, caminho);
  const texto = valor == null ? "" : String(valor);
  let controle: ReactNode;
  if (tipo === "numero") {
    controle = <CampoNumero id={id} valor={valor} onChange={(v) => atualizar(caminho, v)} casas={casas} placeholder={placeholder} />;
  } else if (tipo === "select") {
    controle = (
      <select id={id} value={texto} onChange={(e) => atualizar(caminho, e.target.value)} className={classeCampo}>
        {(opcoes ?? []).map((o) => {
          const [v, t] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={v} value={v}>
              {t}
            </option>
          );
        })}
      </select>
    );
  } else if (tipo === "area") {
    controle = (
      <textarea id={id} rows={linhas} value={texto} placeholder={placeholder} onChange={(e) => atualizar(caminho, e.target.value)} className={`${classeCampo} h-auto py-2 resize-y`} />
    );
  } else {
    controle = (
      <input
        id={id}
        type={tipo === "data" ? "date" : "text"}
        value={texto}
        list={lista}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => atualizar(caminho, e.target.value)}
        className={classeCampo}
      />
    );
  }
  return (
    <div className={className}>
      <Rotulo htmlFor={id} texto={rotulo} obrigatorio={obrigatorio} dica={dica} />
      {controle}
    </div>
  );
}

export function ListasDeSugestoes() {
  return (
    <>
      <datalist id="dl-paises">
        {["BOLIVIA", "PARAGUAI", "ARGENTINA", "URUGUAI", "CHILE", "PERU", "COLOMBIA", "EQUADOR", "MEXICO", "ESTADOS UNIDOS", "AFRICA DO SUL"].map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <datalist id="dl-acordos">
        {[
          "ACE 36 - Mercosul / Bolívia",
          "ACE 18 - Mercosul",
          "ACE 35 - Mercosul / Chile",
          "ACE 58 - Mercosul / Peru",
          "ACE 72 - Mercosul / Colômbia",
          "ACE 59 - Mercosul / Equador e Venezuela",
          "Certificado de origem não preferencial",
        ].map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <datalist id="dl-entidades">
        <option value="FIESC - Federação das Indústrias de Santa Catarina" />
      </datalist>
      <datalist id="dl-embalagens">
        {[
          "ENGRADADO / CRATE / JAULA",
          "CAIXA DE MADEIRA / WOODEN BOX / CAJA DE MADERA",
          "PALLET / PALETA",
          "CAIXA DE PAPELÃO / CARTON BOX / CAJA DE CARTÓN",
          "SEM EMBALAGEM / UNPACKED / SIN EMBALAJE",
          "FARDO / BUNDLE / ATADO",
        ].map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>
    </>
  );
}
