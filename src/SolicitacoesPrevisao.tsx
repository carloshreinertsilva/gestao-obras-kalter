import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { supabase } from "./supabase";
import { formatarMoeda } from "./utils";
import type { SolicitacaoPrevisao, Usuario } from "./types";

// Familia da obra como vem de obra_rentabilidade_familias (saldo de previsoes em aberto sincronizado do ERP)
export interface FamiliaPrevisao {
  codigo_projeto?: string;
  descricao?: string | null;
  previsoes_em_aberto?: number | string | null;
  previsoes_numeros?: string | null;
  eh_obra?: boolean;
}

interface ObraBasica {
  id: string;
  codigo_externo?: string | null;
  nome?: string | null;
}

// ---------------------------------------------------------------- utilitarios

const parseValorBR = (texto: string): number => {
  let t = (texto || "").replace(/R\$|\s/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const v = Number(t);
  return isNaN(v) ? NaN : Math.round(v * 100) / 100;
};

const dataHora = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const dataAAAAMMDD = (n?: number | string | null) => {
  const s = String(n || "");
  return s.length === 8 ? `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}` : s;
};

const sufixoFamilia = (codigo: string) => String(codigo || "").split(".").pop() || codigo;

const rotuloFamilia = (f: FamiliaPrevisao) => `${f.codigo_projeto} - ${f.descricao || ""}`;

// Impostos (970), despesas comerciais (980), seguros (990) e garantia (1000) nao podem ser movimentados
// pelos gestores: nao aparecem como origem nem destino (o banco tambem recusa).
const FAMILIAS_RESTRITAS = ["970", "980", "990", "1000"];
export const familiaRestrita = (codigo?: string) => FAMILIAS_RESTRITAS.includes(sufixoFamilia(codigo || ""));

export const podeSolicitarPrevisao = (usuario?: Usuario | null) =>
  ["admin", "engenheiro", "assistente"].includes(String(usuario?.perfil || ""));

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  simulando: { rotulo: "Simulando no ERP", classe: "bg-slate-100 text-slate-600 border-slate-200" },
  aguardando_aprovacao: { rotulo: "Aguardando aprovação", classe: "bg-amber-50 text-amber-700 border-amber-200" },
  aprovada: { rotulo: "Aprovada · gravando no ERP", classe: "bg-blue-50 text-blue-700 border-blue-200" },
  executada: { rotulo: "Gravada no ERP", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  recusada: { rotulo: "Recusada", classe: "bg-red-50 text-red-700 border-red-200" },
  erro: { rotulo: "Não foi possível", classe: "bg-red-50 text-red-700 border-red-200" },
  cancelada: { rotulo: "Cancelada", classe: "bg-slate-100 text-slate-500 border-slate-200" },
  desfeita: { rotulo: "Desfeita", classe: "bg-slate-100 text-slate-600 border-slate-200" },
};

// ---------------------------------------------------------------- modal de solicitacao

export function ModalSolicitarPrevisao({
  obra,
  familias,
  usuario,
  familiaInicial,
  onFechar,
  onEnviado,
}: {
  obra: ObraBasica;
  familias: FamiliaPrevisao[];
  usuario: Usuario | null;
  familiaInicial?: string;
  onFechar: () => void;
  onEnviado?: () => void;
}) {
  const lista = useMemo(
    () =>
      familias
        .filter((f) => !f.eh_obra && f.codigo_projeto && !familiaRestrita(f.codigo_projeto))
        .sort((a, b) =>
          String(a.codigo_projeto).localeCompare(String(b.codigo_projeto), "pt-BR", { numeric: true }),
        ),
    [familias],
  );
  // Origem so pode ser familia com saldo em aberto
  const listaOrigens = lista.filter((f) => Number(f.previsoes_em_aberto || 0) > 0.005);
  const saldo = (codigo: string) =>
    Number(lista.find((f) => f.codigo_projeto === codigo)?.previsoes_em_aberto || 0);

  const [tipo, setTipo] = useState<"aumento" | "transferencia">("aumento");
  const [destino, setDestino] = useState(familiaInicial && !familiaRestrita(familiaInicial) ? familiaInicial : "");
  const [disponivel, setDisponivel] = useState("");
  const [necessario, setNecessario] = useState("");
  const [valorAumento, setValorAumento] = useState("");
  const [origens, setOrigens] = useState<{ familia: string; valor: string }[]>([{ familia: "", valor: "" }]);
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Gestor costuma informar "disponivel X / necessario Y": o aumento e Y - X
  useEffect(() => {
    const d = parseValorBR(disponivel);
    const n = parseValorBR(necessario);
    if (disponivel.trim() && necessario.trim() && !isNaN(d) && !isNaN(n)) {
      const dif = Math.round((n - d) * 100) / 100;
      setValorAumento(dif > 0 ? dif.toFixed(2).replace(".", ",") : "");
    }
  }, [disponivel, necessario]);

  const totalTransferencia = origens.reduce((acc, o) => acc + (parseValorBR(o.valor) || 0), 0);
  const nomeErp = (usuario?.nome || "").trim().split(" ")[0].toUpperCase();
  const anoVencimento = new Date().getFullYear();

  // Conferencia na hora, por origem: familia sem saldo em aberto ou valor acima do saldo bloqueia o envio
  const problemaOrigem = (o: { familia: string; valor: string }) => {
    if (!o.familia) return "";
    const s = saldo(o.familia);
    if (s <= 0.005) return "Esta família não tem saldo em aberto para transferir.";
    const v = parseValorBR(o.valor);
    if (o.valor.trim() && !isNaN(v) && v > s + 0.001)
      return `Valor maior que o saldo disponível da família (${formatarMoeda(s)}).`;
    return "";
  };
  const origemBloqueada = tipo === "transferencia" && origens.some((o) => problemaOrigem(o));

  const validar = (): string => {
    if (!destino) return tipo === "aumento" ? "Escolha a família." : "Escolha a família de destino.";
    if (!justificativa.trim()) return "Informe a justificativa.";
    if (tipo === "aumento") {
      const v = parseValorBR(valorAumento);
      if (!(v > 0)) return "Informe o valor do aumento (maior que zero).";
      return "";
    }
    const usadas = new Set<string>();
    for (const o of origens) {
      if (!o.familia) return "Escolha a família de cada origem.";
      if (o.familia === destino) return "A origem não pode ser a mesma família do destino.";
      if (usadas.has(o.familia)) return `Família de origem repetida: ${o.familia}.`;
      usadas.add(o.familia);
      const problema = problemaOrigem(o);
      if (problema) return `${o.familia}: ${problema}`;
      const v = parseValorBR(o.valor);
      if (!(v > 0)) return `Informe o valor que sai de ${o.familia}.`;
      if (v > saldo(o.familia) + 0.001)
        return `O valor que sai de ${o.familia} (${formatarMoeda(v)}) é maior que o saldo em aberto da família (${formatarMoeda(saldo(o.familia))}).`;
    }
    return "";
  };

  const enviar = async () => {
    const msg = validar();
    setErro(msg);
    if (msg) return;
    setEnviando(true);
    try {
      const registro: any = {
        id_obra: obra.id,
        codigo_obra: obra.codigo_externo || "",
        tipo,
        familia_destino: destino,
        justificativa: justificativa.trim(),
        nome_solicitante: usuario?.nome || "",
      };
      if (tipo === "aumento") {
        registro.valor = parseValorBR(valorAumento);
        registro.disponivel_informado = disponivel.trim() ? parseValorBR(disponivel) : null;
        registro.necessario_informado = necessario.trim() ? parseValorBR(necessario) : null;
      } else {
        registro.valor = Math.round(totalTransferencia * 100) / 100;
        registro.origens = origens.map((o) => ({ familia: o.familia, valor: parseValorBR(o.valor).toFixed(2) }));
      }
      const { error } = await supabase.from("solicitacoes_previsao").insert([registro]);
      if (error) throw error;
      onEnviado?.();
      onFechar();
    } catch (e: any) {
      setErro(e.message || "Não foi possível enviar a solicitação.");
    } finally {
      setEnviando(false);
    }
  };

  const opcaoFamilia = (f: FamiliaPrevisao) => (
    <option key={f.codigo_projeto} value={f.codigo_projeto}>
      {rotuloFamilia(f)} · em aberto {formatarMoeda(f.previsoes_em_aberto)}
    </option>
  );

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wallet className="text-[#2A6377]" size={20} /> Solicitar previsão · Obra {obra.codigo_externo}
          </h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700">
            <X size={22} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="inline-flex rounded-lg border overflow-hidden text-sm">
            {(
              [
                ["aumento", "Aumento de previsão"],
                ["transferencia", "Transferência entre famílias"],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                onClick={() => {
                  setTipo(valor);
                  setErro("");
                }}
                className={`px-4 py-2 font-semibold transition ${tipo === valor ? "bg-[#2A6377] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              {tipo === "aumento" ? "Família" : "Para a família (destino)"}
            </label>
            <select
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">Selecione...</option>
              {lista.map(opcaoFamilia)}
            </select>
          </div>

          {tipo === "aumento" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Disponível (opcional)</label>
                <input
                  value={disponivel}
                  onChange={(e) => setDisponivel(e.target.value)}
                  placeholder="0,00"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Necessário (opcional)</label>
                <input
                  value={necessario}
                  onChange={(e) => setNecessario(e.target.value)}
                  placeholder="0,00"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor do aumento *</label>
                <input
                  value={valorAumento}
                  onChange={(e) => setValorAumento(e.target.value)}
                  placeholder="0,00"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-semibold"
                />
              </div>
              <p className="sm:col-span-3 text-[11px] text-slate-400 -mt-1">
                Preenchendo disponível e necessário, o aumento é calculado (necessário − disponível).
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-semibold">De (origens)</label>
              {origens.map((o, i) => {
                const problema = problemaOrigem(o);
                const semSaldo = Boolean(o.familia) && saldo(o.familia) <= 0.005;
                return (
                  <div key={i}>
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <select
                          value={o.familia}
                          onChange={(e) =>
                            setOrigens((prev) => prev.map((x, k) => (k === i ? { ...x, familia: e.target.value } : x)))
                          }
                          className={`w-full border rounded-lg px-3 py-2 text-sm bg-white ${semSaldo ? "border-red-400 bg-red-50" : ""}`}
                        >
                          <option value="">
                            {listaOrigens.length ? "Selecione a família de origem..." : "Nenhuma família com saldo em aberto"}
                          </option>
                          {listaOrigens.filter((f) => f.codigo_projeto !== destino).map(opcaoFamilia)}
                        </select>
                      </div>
                      <input
                        value={o.valor}
                        onChange={(e) =>
                          setOrigens((prev) => prev.map((x, k) => (k === i ? { ...x, valor: e.target.value } : x)))
                        }
                        placeholder="Valor"
                        disabled={semSaldo}
                        className={`w-32 border rounded-lg px-3 py-2 text-sm disabled:bg-slate-100 ${problema && !semSaldo ? "border-red-400 bg-red-50 text-red-700" : ""}`}
                      />
                      {origens.length > 1 && (
                        <button
                          onClick={() => setOrigens((prev) => prev.filter((_, k) => k !== i))}
                          className="p-2 text-slate-400 hover:text-red-600"
                          title="Remover origem"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {o.familia &&
                      (problema ? (
                        <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1">
                          <AlertTriangle size={13} className="shrink-0" /> {problema}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-500">
                          Saldo disponível: {formatarMoeda(saldo(o.familia))}
                        </p>
                      ))}
                  </div>
                );
              })}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setOrigens((prev) => [...prev, { familia: "", valor: "" }])}
                  className="text-xs font-semibold text-[#2A6377] flex items-center gap-1"
                >
                  <Plus size={14} /> Adicionar origem
                </button>
                <span className="text-sm text-slate-600">
                  Total: <b>{formatarMoeda(totalTransferencia)}</b>
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">Justificativa *</label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Por que a previsão é necessária?"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 border rounded-lg p-3 space-y-1">
            <p>A parcela nova vence em 30/12/{anoVencimento}.</p>
            <p>
              Depois de enviar, o sistema simula no ERP (em até 5 minutos) e envia para aprovação. Você acompanha o
              andamento aqui e recebe o resultado no sino.
            </p>
            {tipo === "transferencia" && destino && (
              <p>
                Observação no ERP: “Transferência para familia {sufixoFamilia(destino)} - Solicitação {nomeErp}”
              </p>
            )}
          </div>

          {erro && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {erro}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={enviando || origemBloqueada}
            title={origemBloqueada ? "Corrija as origens sem saldo suficiente para enviar" : undefined}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-[#2A6377] text-white hover:bg-[#1e4857] flex items-center gap-2 disabled:opacity-60"
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar solicitação
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- cartao de uma solicitacao

function PlanoErp({ plano }: { plano: any }) {
  if (!plano) return null;
  const baixas = plano.operacoes?.baixas || [];
  const nova = plano.operacoes?.nova_parcela;
  const antes = plano.totais_antes || {};
  const depois = plano.totais_depois_previstos || {};
  return (
    <div className="text-xs text-slate-600 bg-slate-50 border rounded-lg p-3 space-y-1.5">
      <p className="font-bold text-slate-700">Plano no ERP (simulado)</p>
      {baixas.map((b: any, i: number) => (
        <p key={i}>
          Baixa na previsão <b>{b.docto}</b> parcela {b.parcela} ({b.familia}, venc. {dataAAAAMMDD(b.vencto)}):{" "}
          {formatarMoeda(b.saldo_antes)} → {formatarMoeda(b.saldo_depois)}
          {b.desativa ? " (parcela zerada)" : ""}
        </p>
      ))}
      {nova &&
        (nova.previsao_criada ? (
          <p>
            <b>Previsão nova nº {nova.docto}</b> ({nova.projeto}), parcela 1, venc. {dataAAAAMMDD(nova.vencto)}:{" "}
            {formatarMoeda(nova.valor)}
          </p>
        ) : (
          <p>
            Nova parcela na previsão <b>{nova.docto}</b> (parcela {nova.parcela}), venc. {dataAAAAMMDD(nova.vencto)}:{" "}
            {formatarMoeda(nova.valor)}
          </p>
        ))}
      <p className="pt-1">
        Saldo em aberto:{" "}
        {baixas.length > 0 && (
          <>
            origem {formatarMoeda(antes.origem)} → {formatarMoeda(depois.origem)} ·{" "}
          </>
        )}
        destino {formatarMoeda(antes.destino)} → {formatarMoeda(depois.destino)} · obra {formatarMoeda(antes.obra)} →{" "}
        {formatarMoeda(depois.obra)}
      </p>
      {baixas[0]?.obs && <p>Observação no ERP: “{baixas[0].obs}”</p>}
      {plano.travas?.length > 0 && (
        <p className="text-amber-700">Atenção: previsão aberta no ERP por outro usuário ({plano.travas.join("; ")}).</p>
      )}
    </div>
  );
}

function PlanoDesfazer({ plano }: { plano: any }) {
  if (!plano) return null;
  const estornos = plano.operacoes?.estornos || [];
  const exc = plano.operacoes?.excluir_parcela;
  return (
    <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
      <p className="font-bold text-amber-800">Desfazer (simulado)</p>
      {estornos.map((e: any, i: number) => (
        <p key={i}>
          Estorno na previsão <b>{e.docto}</b> parcela {e.parcela}: {formatarMoeda(e.saldo_antes)} →{" "}
          {formatarMoeda(e.saldo_depois)}
          {e.reativa ? " (parcela reativada)" : ""}
        </p>
      ))}
      {exc && (
        <p>
          {exc.previsao_criada
            ? `Exclui a previsão ${exc.docto}, criada por esta solicitação`
            : `Exclui a parcela ${exc.parcela} da previsão ${exc.docto}`}{" "}
          ({formatarMoeda(exc.valor)})
        </p>
      )}
    </div>
  );
}

export function CartaoSolicitacao({
  s,
  usuario,
  mostrarObra = true,
  onAtualizar,
}: {
  s: SolicitacaoPrevisao;
  usuario: Usuario | null;
  mostrarObra?: boolean;
  onAtualizar: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const aprovador = Boolean(usuario?.aprova_previsao);
  const ehSolicitante = usuario?.id === s.id_solicitante;
  const st = STATUS[s.status] || STATUS.simulando;

  const acao = async (fn: string, params: any) => {
    setOcupado(true);
    setErro("");
    try {
      const { error } = await supabase.rpc(fn, params);
      if (error) throw error;
      setRecusando(false);
      onAtualizar();
    } catch (e: any) {
      setErro(e.message || "Não foi possível concluir a ação.");
      onAtualizar();
    } finally {
      setOcupado(false);
    }
  };

  const botao = (rotulo: string, onClick: () => void, estilo: string, Icone: any) => (
    <button
      onClick={onClick}
      disabled={ocupado}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 ${estilo}`}
    >
      <Icone size={14} /> {rotulo}
    </button>
  );

  const resultado = s.resultado?.nova_parcela;

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 flex flex-wrap items-center gap-x-2">
            <span>{s.tipo === "aumento" ? "Aumento" : "Transferência"}</span>
            <span className="text-[#2A6377]">{formatarMoeda(s.valor)}</span>
            <ArrowRight size={14} className="text-slate-400" />
            <span>{s.familia_destino}</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {mostrarObra && <>Obra {s.codigo_obra} · </>}
            {s.tipo === "transferencia"
              ? "De " + s.origens.map((o) => `${o.familia} (${formatarMoeda(o.valor)})`).join(", ")
              : s.disponivel_informado != null || s.necessario_informado != null
                ? `Disponível ${formatarMoeda(s.disponivel_informado)} · necessário ${formatarMoeda(s.necessario_informado)}`
                : "Suplemento de previsão"}
          </p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-bold ${st.classe}`}>
          {st.rotulo}
        </span>
      </div>

      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{s.justificativa}</p>

      {s.mensagem && (
        <div
          className={`text-xs rounded-lg p-2.5 border ${s.status === "erro" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-800"}`}
        >
          {s.mensagem}
        </div>
      )}

      {["aguardando_aprovacao", "aprovada"].includes(s.status) && <PlanoErp plano={s.plano} />}

      {resultado && (
        <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2.5">
          Gravado no ERP: previsão <b>{resultado.docto}</b>, parcela <b>{resultado.parcela}</b>
          {resultado.previsao_criada ? " (previsão nova)" : ""}, venc. {dataAAAAMMDD(resultado.vencto)}.
          {s.plano?.operacoes?.baixas?.[0]?.obs && <> Observação: “{s.plano.operacoes.baixas[0].obs}”.</>}
        </div>
      )}

      {s.desfazer_status === "aguardando_confirmacao" && <PlanoDesfazer plano={s.desfazer_plano} />}
      {s.desfazer_mensagem && (
        <div className="text-xs rounded-lg p-2.5 border bg-amber-50 border-amber-200 text-amber-800">
          {s.desfazer_mensagem}
        </div>
      )}

      <div className="text-[11px] text-slate-400 space-y-0.5 border-t pt-2">
        <p>
          Solicitado por <b className="text-slate-500">{s.nome_solicitante}</b> em {dataHora(s.created_at)}
        </p>
        {s.simulado_em && <p>Simulado no ERP em {dataHora(s.simulado_em)}</p>}
        {s.decidido_em && (
          <p>
            {s.status === "recusada" ? "Recusado" : "Aprovado"} por <b className="text-slate-500">{s.nome_aprovador}</b>{" "}
            em {dataHora(s.decidido_em)}
            {s.motivo_recusa ? ` · motivo: ${s.motivo_recusa}` : ""}
          </p>
        )}
        {s.executado_em && <p>Gravado no ERP em {dataHora(s.executado_em)}</p>}
        {s.desfeito_em && <p>Desfeito no ERP em {dataHora(s.desfeito_em)}</p>}
      </div>

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {recusando && (
        <div className="flex gap-2">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo da recusa"
            className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
          />
          {botao("Confirmar recusa", () => acao("recusar_solicitacao_previsao", { p_id: s.id, p_motivo: motivo }), "bg-red-600 text-white hover:bg-red-700", XCircle)}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        {aprovador && s.status === "aguardando_aprovacao" && (
          <>
            {botao("Recusar", () => setRecusando((v) => !v), "border border-red-200 text-red-700 hover:bg-red-50", XCircle)}
            {botao(
              "Aprovar e gravar no ERP",
              () => acao("aprovar_solicitacao_previsao", { p_id: s.id, p_codigo: s.codigo_plano }),
              "bg-emerald-600 text-white hover:bg-emerald-700",
              CheckCircle2,
            )}
          </>
        )}
        {(ehSolicitante || aprovador) && ["simulando", "aguardando_aprovacao", "erro"].includes(s.status) &&
          botao("Cancelar solicitação", () => acao("cancelar_solicitacao_previsao", { p_id: s.id }), "border text-slate-600 hover:bg-slate-50", X)}
        {(ehSolicitante || aprovador) && s.status === "erro" &&
          botao("Simular de novo", () => acao("reenviar_solicitacao_previsao", { p_id: s.id }), "border text-[#2A6377] hover:bg-slate-50", RotateCcw)}
        {aprovador && s.status === "executada" && (!s.desfazer_status || s.desfazer_status === "erro") &&
          botao("Desfazer no ERP", () => acao("pedir_desfazer_previsao", { p_id: s.id }), "border border-amber-300 text-amber-800 hover:bg-amber-50", RotateCcw)}
        {aprovador && s.desfazer_status === "aguardando_confirmacao" && (
          <>
            {botao("Manter", () => acao("cancelar_desfazer_previsao", { p_id: s.id }), "border text-slate-600 hover:bg-slate-50", X)}
            {botao(
              "Confirmar desfazer",
              () => acao("confirmar_desfazer_previsao", { p_id: s.id, p_codigo: s.desfazer_codigo }),
              "bg-amber-600 text-white hover:bg-amber-700",
              RotateCcw,
            )}
          </>
        )}
        {s.desfazer_status === "simulando" && <span className="text-xs text-slate-500">Simulando o desfazer no ERP...</span>}
        {s.desfazer_status === "confirmado" && <span className="text-xs text-slate-500">Desfazendo no ERP...</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- lista / historico

const FILTROS: [string, string, string[] | null][] = [
  ["pendentes", "Aguardando aprovação", ["aguardando_aprovacao"]],
  ["andamento", "Em andamento", ["simulando", "aguardando_aprovacao", "aprovada"]],
  ["concluidas", "Gravadas", ["executada", "desfeita"]],
  ["outras", "Recusadas / canceladas", ["recusada", "erro", "cancelada"]],
  ["todas", "Todas", null],
];

export function PainelSolicitacoes({
  usuario,
  idObra,
  titulo,
  recarregar,
  destaque,
  onLimparDestaque,
}: {
  usuario: Usuario | null;
  idObra?: string;
  titulo?: string;
  recarregar?: number;
  // solicitacao aberta pelo endereco /previsoes/<id> (link do e-mail de aprovacao)
  destaque?: string | null;
  onLimparDestaque?: () => void;
}) {
  const [lista, setLista] = useState<SolicitacaoPrevisao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState(usuario?.aprova_previsao && !idObra ? "pendentes" : "todas");
  const [busca, setBusca] = useState("");

  const buscar = useCallback(async () => {
    let q = supabase.from("solicitacoes_previsao").select("*").order("created_at", { ascending: false }).limit(300);
    if (idObra) q = q.eq("id_obra", idObra);
    const { data, error } = await q;
    if (!error && data) setLista(data as SolicitacaoPrevisao[]);
    setCarregando(false);
  }, [idObra]);

  useEffect(() => {
    buscar();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") buscar();
    }, 30000);
    return () => clearInterval(t);
  }, [buscar, recarregar]);

  const contagem = (sts: string[] | null) => (sts ? lista.filter((s) => sts.includes(s.status)).length : lista.length);
  const termo = busca.trim().toLowerCase();
  const destacada = destaque ? lista.find((s) => s.id === destaque) : undefined;
  const visiveis = lista.filter((s) => {
    if (destacada && s.id === destacada.id) return false;
    const sts = FILTROS.find((f) => f[0] === filtro)?.[2];
    if (sts && !sts.includes(s.status)) return false;
    if (!termo) return true;
    return [s.codigo_obra, s.familia_destino, s.nome_solicitante, s.justificativa, ...s.origens.map((o) => o.familia)]
      .join(" ")
      .toLowerCase()
      .includes(termo);
  });

  return (
    <div className="space-y-3">
      {destaque && !carregando && (
        <div className="rounded-2xl border-2 border-[#2A6377]/40 bg-[#2A6377]/5 p-3 space-y-2 max-w-3xl">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-[#2A6377]">Solicitação aberta pelo link</p>
            {onLimparDestaque && (
              <button onClick={onLimparDestaque} className="text-xs font-semibold text-slate-500 hover:text-[#2A6377]">
                Fechar
              </button>
            )}
          </div>
          {destacada ? (
            <CartaoSolicitacao s={destacada} usuario={usuario} mostrarObra={!idObra} onAtualizar={buscar} />
          ) : (
            <p className="text-sm text-slate-500 bg-white border rounded-xl p-4">
              Solicitação não encontrada. Ela pode ter sido cancelada ou você não tem acesso a ela.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        {titulo && <h3 className="font-bold text-lg">{titulo}</h3>}
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar obra, família, solicitante..."
            className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none bg-white"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map(([id, rotulo, sts]) => (
          <button
            key={id}
            onClick={() => setFiltro(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${filtro === id ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {rotulo} ({contagem(sts)})
          </button>
        ))}
      </div>
      {carregando ? (
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Carregando...
        </p>
      ) : visiveis.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white border rounded-xl p-6 text-center">Nenhuma solicitação aqui.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
          {visiveis.map((s) => (
            <CartaoSolicitacao key={s.id} s={s} usuario={usuario} mostrarObra={!idObra} onAtualizar={buscar} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- aba Previsoes (dentro da obra)

export function AbaPrevisoes({ obra, usuario }: { obra: ObraBasica; usuario: Usuario | null }) {
  const [familias, setFamilias] = useState<FamiliaPrevisao[]>([]);
  const [modal, setModal] = useState<{ aberto: boolean; familia?: string }>({ aberto: false });
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    if (!obra?.id) return;
    supabase
      .from("obra_rentabilidade_familias")
      .select("codigo_projeto, descricao, previsoes_em_aberto, previsoes_numeros, eh_obra")
      .eq("id_obra", obra.id)
      .then(({ data }) => setFamilias((data as FamiliaPrevisao[]) || []));
  }, [obra?.id, recarregar]);

  const lista = familias
    .filter((f) => !f.eh_obra)
    .sort((a, b) => String(a.codigo_projeto).localeCompare(String(b.codigo_projeto), "pt-BR", { numeric: true }));
  const comSaldo = lista.filter((f) => Math.abs(Number(f.previsoes_em_aberto || 0)) >= 0.005);
  const total = lista.reduce((acc, f) => acc + Number(f.previsoes_em_aberto || 0), 0);
  const pode = podeSolicitarPrevisao(usuario);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg">Previsões em aberto por família</h3>
            <p className="text-xs text-slate-400 mt-1">
              Saldo das previsões de contas a pagar do ERP. Total em aberto: <b>{formatarMoeda(total)}</b>.
            </p>
          </div>
          {pode && (
            <button
              onClick={() => setModal({ aberto: true })}
              className="shrink-0 bg-[#2A6377] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1e4857]"
            >
              <Plus size={16} /> Solicitar previsão
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2.5 text-left">Família</th>
                <th className="px-3 py-2.5 text-right">Em aberto</th>
                <th className="px-3 py-2.5 text-center">Nº Previsão</th>
                {pode && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {comSaldo.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    Nenhuma previsão em aberto nesta obra.
                  </td>
                </tr>
              ) : (
                comSaldo.map((f) => (
                  <tr key={f.codigo_projeto} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-700">{rotuloFamilia(f)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-blue-700 whitespace-nowrap">
                      {formatarMoeda(f.previsoes_em_aberto)}
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold text-slate-700">{f.previsoes_numeros || ""}</td>
                    {pode && (
                      <td className="px-3 py-2.5 text-right">
                        {familiaRestrita(f.codigo_projeto) ? (
                          <span
                            className="text-[11px] text-slate-400 whitespace-nowrap"
                            title="Impostos, despesas comerciais, seguros e garantia não são movimentados por solicitação"
                          >
                            Não movimentável
                          </span>
                        ) : (
                          <button
                            onClick={() => setModal({ aberto: true, familia: f.codigo_projeto })}
                            className="text-xs font-semibold text-[#2A6377] hover:underline whitespace-nowrap"
                          >
                            Solicitar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PainelSolicitacoes usuario={usuario} idObra={obra.id} titulo="Solicitações desta obra" recarregar={recarregar} />

      {modal.aberto && (
        <ModalSolicitarPrevisao
          obra={obra}
          familias={lista}
          usuario={usuario}
          familiaInicial={modal.familia}
          onFechar={() => setModal({ aberto: false })}
          onEnviado={() => setRecarregar((n) => n + 1)}
        />
      )}
    </div>
  );
}
