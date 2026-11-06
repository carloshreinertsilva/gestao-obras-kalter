import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Briefcase, CheckSquare, FileInput, Package, Receipt, Search, Truck, Wallet, type LucideIcon } from "lucide-react";
import { supabase } from "./supabase";

// Busca global (06/11/2026, item 27): Ctrl+K (ou a lupa) procura obra, solicitacao de faturamento, NF de terceiros,
// frete, material, previsao e tarefa e abre direto pela rota (src/rotas.ts). Poucas linhas por tipo (egress).
interface Resultado {
  tipo: string;
  icone: LucideIcon;
  titulo: string;
  detalhe?: string;
  caminho: string;
}

const semAcento = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const LIMITE = 5;

async function buscarNoBanco(termo: string): Promise<Resultado[]> {
  const t = termo.trim();
  const numero = /^\d+$/.test(t) ? Number(t) : null;
  const like = `%${t.replace(/[%_,()]/g, " ")}%`;
  const consultas: PromiseLike<Resultado[]>[] = [];

  consultas.push(
    supabase
      .from("solicitacoes_faturamento")
      .select("id, numero, codigo_obra, status")
      .or(numero !== null ? `numero.eq.${numero},codigo_obra.eq.${t}` : `codigo_obra.ilike.${like}`)
      .order("numero", { ascending: false })
      .limit(LIMITE)
      .then(({ data }) =>
        (data || []).map((s: any) => ({
          tipo: "Faturamento",
          icone: Receipt,
          titulo: `SF ${s.numero} · obra ${s.codigo_obra}`,
          detalhe: String(s.status || "").replace(/_/g, " "),
          caminho: `/faturamento/${s.id}`,
        })),
      ),
  );
  consultas.push(
    supabase
      .from("nfs_terceiros")
      .select("id, numero, numero_nf, fornecedor, codigo_obra, status")
      .or(numero !== null ? `numero.eq.${numero},numero_nf.eq.${t}` : `fornecedor.ilike.${like}`)
      .order("numero", { ascending: false })
      .limit(LIMITE)
      .then(({ data }) =>
        (data || []).map((n: any) => ({
          tipo: "NF de terceiros",
          icone: FileInput,
          titulo: `NF ${n.numero_nf || "-"} · ${n.fornecedor || ""}`,
          detalhe: `obra ${n.codigo_obra || "-"} · ${String(n.status || "")}`,
          caminho: `/nfs-terceiros/${n.id}`,
        })),
      ),
  );
  consultas.push(
    supabase
      .from("fretes")
      .select("id, numero, codigo_obra, transportadora_nome, status")
      .or(numero !== null ? `numero.eq.${numero},codigo_obra.eq.${t}` : `transportadora_nome.ilike.${like}`)
      .order("numero", { ascending: false })
      .limit(LIMITE)
      .then(({ data }) =>
        (data || []).map((f: any) => ({
          tipo: "Frete",
          icone: Truck,
          titulo: `Frete ${f.numero} · obra ${f.codigo_obra || "-"}`,
          detalhe: [f.transportadora_nome, String(f.status || "").replace(/_/g, " ")].filter(Boolean).join(" · "),
          caminho: `/fretes/${f.id}`,
        })),
      ),
  );
  consultas.push(
    supabase
      .from("solicitacoes_material")
      .select("id, numero, descricao, status, codigo_edit")
      .or(numero !== null ? `numero.eq.${numero}` : `descricao.ilike.${like},codigo_edit.ilike.${like}`)
      .order("numero", { ascending: false })
      .limit(LIMITE)
      .then(({ data }) =>
        (data || []).map((m: any) => ({
          tipo: "Material",
          icone: Package,
          titulo: `Material nº ${m.numero} · ${m.descricao}`,
          detalhe: [m.codigo_edit, m.status].filter(Boolean).join(" · "),
          caminho: `/materiais/${m.id}`,
        })),
      ),
  );
  consultas.push(
    supabase
      .from("solicitacoes_previsao")
      .select("id, codigo_obra, familia_destino, status, valor")
      .or(numero !== null ? `codigo_obra.eq.${t}` : `familia_destino.ilike.${like},nome_solicitante.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(LIMITE)
      .then(({ data }) =>
        (data || []).map((p: any) => ({
          tipo: "Previsão",
          icone: Wallet,
          titulo: `Previsão · obra ${p.codigo_obra} · família ${p.familia_destino || "-"}`,
          detalhe: String(p.status || "").replace(/_/g, " "),
          caminho: `/previsoes/${p.id}`,
        })),
      ),
  );
  if (t.length >= 3)
    consultas.push(
      supabase
        .from("tarefas")
        .select("id, titulo, status, obras(codigo_externo)")
        .ilike("titulo", like)
        .in("status", ["pendente", "em_andamento"])
        .order("created_at", { ascending: false })
        .limit(LIMITE)
        .then(({ data }) =>
          (data || []).map((x: any) => ({
            tipo: "Tarefa",
            icone: CheckSquare,
            titulo: x.titulo,
            detalhe: `obra ${x.obras?.codigo_externo || "-"} · ${String(x.status).replace(/_/g, " ")}`,
            caminho: `/tarefas?tarefa=${x.id}`,
          })),
        ),
    );
  const listas = await Promise.all(consultas.map((p) => Promise.resolve(p).catch(() => [] as Resultado[])));
  return listas.flat();
}

export function BuscaGlobal({
  aberta,
  onFechar,
  obras,
  onNavegar,
}: {
  aberta: boolean;
  onFechar: () => void;
  obras: { id: string; codigo_externo?: string | null; nome?: string | null }[];
  onNavegar: (caminho: string) => void;
}) {
  const [termo, setTermo] = useState("");
  const [doBanco, setDoBanco] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberta) return;
    setTermo("");
    setDoBanco([]);
    setAtivo(0);
    setTimeout(() => campo.current?.focus(), 0);
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return;
    const t = termo.trim();
    if (t.length < 2) {
      setDoBanco([]);
      return;
    }
    setBuscando(true);
    const h = window.setTimeout(async () => {
      const r = await buscarNoBanco(t);
      setDoBanco(r);
      setBuscando(false);
    }, 300);
    return () => window.clearTimeout(h);
  }, [termo, aberta]);

  const resultados = useMemo(() => {
    const t = semAcento(termo.trim());
    const deObras: Resultado[] = t
      ? obras
          .filter((o) => semAcento(`${o.codigo_externo || ""} ${o.nome || ""}`).includes(t))
          .slice(0, 8)
          .map((o) => ({
            tipo: "Obra",
            icone: Briefcase,
            titulo: `${o.codigo_externo} · ${o.nome}`,
            caminho: `/obras/${encodeURIComponent(String(o.codigo_externo || ""))}`,
          }))
      : [];
    return [...deObras, ...doBanco];
  }, [termo, obras, doBanco]);

  useEffect(() => setAtivo(0), [resultados.length]);

  if (!aberta) return null;

  const abrir = (r: Resultado) => {
    onFechar();
    onNavegar(r.caminho);
  };

  return createPortal(
    <div
      data-confirmacao="1"
      className="fixed inset-0 z-[160] bg-slate-900/50 flex items-start justify-center p-0 md:p-6 md:pt-[12vh]"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div role="dialog" aria-modal="true" aria-label="Busca" className="bg-white w-full md:max-w-xl md:rounded-xl shadow-2xl flex flex-col max-h-full md:max-h-[70vh]">
        <div className="flex items-center gap-2 px-4 border-b">
          <Search size={18} className="text-slate-500 shrink-0" aria-hidden="true" />
          <input
            ref={campo}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onFechar();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setAtivo((a) => Math.min(a + 1, resultados.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setAtivo((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && resultados[ativo]) {
                e.preventDefault();
                abrir(resultados[ativo]);
              }
            }}
            placeholder="Buscar obra, SF, NF, frete, material, previsão ou tarefa…"
            aria-label="Buscar"
            className="flex-1 py-4 text-base outline-none bg-transparent"
          />
          <button type="button" onClick={onFechar} className="text-sm text-slate-500 hover:text-slate-700 px-2 py-1 rounded border">
            Esc
          </button>
        </div>
        <div className="overflow-y-auto" role="listbox" aria-label="Resultados">
          {termo.trim().length < 2 ? (
            <p className="p-4 text-sm text-slate-500">Digite pelo menos 2 letras ou o número (SF, NF, frete, material, obra).</p>
          ) : resultados.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{buscando ? "Buscando…" : "Nada encontrado."}</p>
          ) : (
            resultados.map((r, i) => {
              const I = r.icone;
              return (
                <button
                  key={`${r.tipo}-${r.caminho}`}
                  type="button"
                  role="option"
                  aria-selected={i === ativo}
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => abrir(r)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b last:border-b-0 ${i === ativo ? "bg-[#2A6377]/10" : "hover:bg-slate-50"}`}
                >
                  <I size={18} className="text-[#2A6377] shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800 truncate">{r.titulo}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {r.tipo}
                      {r.detalhe ? ` · ${r.detalhe}` : ""}
                    </span>
                  </span>
                </button>
              );
            })
          )}
          {buscando && resultados.length > 0 && <p className="px-4 py-2 text-xs text-slate-500">Buscando mais…</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
