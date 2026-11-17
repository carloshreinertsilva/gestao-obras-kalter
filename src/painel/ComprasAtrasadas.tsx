import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Truck } from "lucide-react";
import { supabase } from "../supabase";
import { formatarDataSegura } from "../utils";
import {
  chaveObras,
  hojeLocalISO,
  montarAtrasos,
  textoDias,
  textoResumo,
  type CompraAberta,
  type ObraPainel,
  type ResumoAtrasos,
  type SmaMaterial,
} from "./calculoComprasAtrasadas";

export type { ObraPainel } from "./calculoComprasAtrasadas";

// Painel: compras e entregas atrasadas das obras em andamento que a pessoa ve (Pacote 4 / B8).
// O gestor nao tem a tela Compras (so a logistica); aqui ele ve, de todas as obras dele, o que ja passou da data.
// Leitura direta das tabelas que o robo espelha do ERP (a RLS deixa qualquer usuario ativo ler); a regra de
// atraso e a mesma da obra (calculoComprasAtrasadas.ts). Sem preco: so o que a aba Compras da obra ja mostra.

const PAGINA = 1000;
const OBRAS_INICIAIS = 5;
const ITENS_POR_OBRA = 3;

async function buscarPaginado<T>(consulta: (inicio: number, fim: number) => PromiseLike<{ data: unknown; error: unknown }>) {
  const todas: T[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await consulta(inicio, inicio + PAGINA - 1);
    if (error) throw error;
    const lote = (data as T[]) || [];
    todas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return todas;
}

export default function ComprasAtrasadas({ obras, onAbrirObra }: { obras: ObraPainel[]; onAbrirObra: (idObra: string) => void }) {
  const chave = chaveObras(obras);
  const [dados, setDados] = useState<{ chave: string; compras: CompraAberta[]; smas: SmaMaterial[] } | null>(null);
  const [todas, setTodas] = useState(false);

  useEffect(() => {
    const ids = chave ? chave.split(",") : [];
    if (ids.length === 0) {
      setDados(null);
      return;
    }
    let ativo = true;
    const hoje = hojeLocalISO();
    Promise.all([
      // compras de material ainda nao recebidas (todas: o pedido ligado a SMA tambem e usado)
      buscarPaginado<CompraAberta>((ini, fim) =>
        supabase
          .from("obra_compras_abertas")
          .select("id_obra, nr_solicitacao, codigo_material, descricao_material, situacao, nr_pedido, fornecedor, data_entrega, nr_sma, servico")
          .in("id_obra", ids)
          .eq("servico", false)
          .neq("situacao", "recebido")
          .order("id_obra")
          .order("nr_solicitacao")
          .range(ini, fim),
      ),
      // itens de SMA ativos com necessidade ja vencida (saldo a atender e conferido na conta)
      buscarPaginado<SmaMaterial>((ini, fim) =>
        supabase
          .from("obra_sma_materiais")
          .select("id_obra, nr_sma, sequencia, codigo_material, descricao_material, quantidade_solicitada, quantidade_atendida, situacao, data_necessidade, ordens_producao, urgente")
          .in("id_obra", ids)
          .or("situacao.eq.A,situacao.is.null")
          .lt("data_necessidade", hoje)
          .is("ordens_producao", null)
          .order("id")
          .range(ini, fim),
      ),
    ])
      .then(([compras, smas]) => {
        if (ativo) setDados({ chave, compras, smas });
      })
      .catch(() => {
        // falha: o cartao some (o resto do Painel segue); a aba Compras de cada obra continua disponivel
        if (ativo) setDados(null);
      });
    return () => {
      ativo = false;
    };
  }, [chave]);

  const resumo: ResumoAtrasos | null = useMemo(
    () => (dados && dados.chave === chave ? montarAtrasos(obras, dados.compras, dados.smas, hojeLocalISO()) : null),
    // obras so muda de verdade quando a chave muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados, chave],
  );

  if (!resumo || resumo.totalItens === 0) return null;
  const visiveis = todas ? resumo.obras : resumo.obras.slice(0, OBRAS_INICIAIS);

  return (
    <section aria-label="Compras e entregas atrasadas" className="bg-white rounded-xl border shadow-sm p-4 mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Truck size={15} className="text-[#2A6377]" aria-hidden="true" /> Compras e entregas atrasadas
        </h3>
        <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
          <AlertTriangle size={12} aria-hidden="true" /> {textoResumo(resumo)}
        </p>
      </div>

      <div className="space-y-3">
        {visiveis.map(({ obra, itens, piorAtraso }) => (
          <div key={obra.id} className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => onAbrirObra(obra.id)}
              className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 flex items-center gap-2"
              title="Abrir a obra"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-800 truncate">
                  {obra.codigo} · {obra.nome}
                </span>
                <span className="block text-xs text-slate-500">
                  {itens.length} {itens.length === 1 ? "item atrasado" : "itens atrasados"} · pior: {textoDias(piorAtraso)}
                </span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
            </button>
            <ul className="divide-y">
              {itens.slice(0, ITENS_POR_OBRA).map((i) => (
                <li key={i.chave}>
                  <button type="button" onClick={() => onAbrirObra(obra.id)} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-slate-800 truncate" title={i.descricao || undefined}>
                        {i.codigo_material && <span className="text-xs text-slate-500">{i.codigo_material} </span>}
                        {i.descricao || "Material sem descrição"}
                      </span>
                      <span className="block text-xs text-slate-500 break-words">
                        {i.urgente && <span className="font-semibold text-red-700">Urgente · </span>}
                        {i.nr_sma != null && <>SMA {i.nr_sma} · </>}
                        {i.nr_pedido ? <>Pedido {i.nr_pedido}{i.fornecedor ? ` · ${i.fornecedor}` : ""} · </> : null}
                        {i.situacao} · {i.tipo === "compra" ? "entrega prevista" : "necessidade"} {formatarDataSegura(i.data)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-red-700 whitespace-nowrap">{textoDias(i.dias)}</span>
                  </button>
                </li>
              ))}
              {itens.length > ITENS_POR_OBRA && (
                <li>
                  <button type="button" onClick={() => onAbrirObra(obra.id)} className="w-full text-left px-3 py-1.5 text-xs font-semibold text-[#2A6377] hover:bg-slate-50">
                    + {itens.length - ITENS_POR_OBRA} {itens.length - ITENS_POR_OBRA === 1 ? "item" : "itens"} — ver na obra
                  </button>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {resumo.obras.length > OBRAS_INICIAIS && (
        <button type="button" onClick={() => setTodas((v) => !v)} className="mt-3 text-sm font-semibold text-[#2A6377] hover:underline">
          {todas ? "Mostrar menos" : `Ver todas as obras (${resumo.obras.length})`}
        </button>
      )}
    </section>
  );
}
