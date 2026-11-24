import { useEffect, useId, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "./supabase";
import { formatarDataSegura, formatarMoeda } from "./utils";
import { Moldura } from "./Dialogos";
import { mensagemErro } from "./erros";
import { agruparPedidos, efetivo, pedidosDoFornecedor, type CteSefaz, type PedidoAberto } from "./calculoCteTransito";

// Identificacao manual de um CT-e em transito (2026-11-24): quando o robo nao liga o frete a uma obra (ou so sugere),
// logistica/admin/coordenador dizem o tipo do frete, o pedido e a obra - ou que o frete nao e de obra.
// Grava em fretes_ctes_identificacao pelas funcoes frete_cte_identificar / frete_cte_desfazer_identificacao (p21).
// Nada vai para o ERP; o robo nao sobrescreve.

interface ObraOpcao {
  id: string;
  codigo: string;
  nome: string;
  andamento: boolean;
}
interface Apoio {
  obras: ObraOpcao[];
  pedidos: PedidoAberto[];
}

const TIPOS: { id: CteSefaz["sentido"]; rotulo: string; ajuda: string }[] = [
  { id: "compra", rotulo: "Compra", ajuda: "material que a Kalter comprou" },
  { id: "venda", rotulo: "Venda", ajuda: "envio da Kalter para o cliente ou obra" },
  { id: "outro", rotulo: "Outro", ajuda: "transferência, devolução, conserto…" },
];
const CAMPO = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6377]/40 focus:border-[#2A6377] disabled:bg-slate-100";
const ROTULO = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1";
const PAGINA = 1000;
// mesmos estilos dos botoes de Dialogos.tsx
const BOTAO_SECUNDARIO = "px-4 py-2.5 md:py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition";
const BOTAO_PRIMARIO =
  "px-4 py-2.5 md:py-2 rounded-lg text-sm font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed bg-[#2A6377] hover:bg-[#1f4b5a]";

// obras do app + pedidos de compra em aberto (para conferir o numero digitado e sugerir os do fornecedor)
async function buscarApoio(): Promise<Apoio> {
  const { data: o } = await supabase.from("obras").select("id, codigo_externo, nome, status").not("codigo_externo", "is", null).limit(PAGINA);
  const obras: ObraOpcao[] = ((o as { id: string; codigo_externo: string; nome: string | null; status: string }[]) || [])
    .map((x) => ({ id: x.id, codigo: x.codigo_externo, nome: x.nome || "", andamento: x.status === "em_andamento" }))
    .sort((a, b) => Number(b.andamento) - Number(a.andamento) || a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
  const linhas: Parameters<typeof agruparPedidos>[0] = [];
  for (let pagina = 0; pagina < 5; pagina++) {
    const { data, error } = await supabase
      .from("obra_compras_abertas")
      .select("nr_pedido, fornecedor, id_obra, valor")
      .not("nr_pedido", "is", null)
      .order("nr_pedido")
      .order("nr_solicitacao")
      .range(pagina * PAGINA, (pagina + 1) * PAGINA - 1);
    if (error || !data) break;
    linhas.push(...(data as typeof linhas));
    if (data.length < PAGINA) break;
  }
  return { obras, pedidos: agruparPedidos(linhas, new Map(obras.map((x) => [x.id, x.codigo]))) };
}

export function IdentificarCte({ cte, onFechar, onSalvo }: { cte: CteSefaz; onFechar: () => void; onSalvo: () => void }) {
  const atual = efetivo(cte);
  const [sentido, setSentido] = useState<CteSefaz["sentido"]>(cte.manual?.sentido || cte.sentido);
  const [pedido, setPedido] = useState(cte.manual?.pedido != null ? String(cte.manual.pedido) : "");
  const [obra, setObra] = useState(cte.manual?.codigo_obra || (atual.codigos_obra.length === 1 && cte.ligacao !== "pedido_aberto" ? atual.codigos_obra[0] : ""));
  const [foraDeObra, setForaDeObra] = useState(!!cte.manual?.fora_de_obra);
  const [observacao, setObservacao] = useState(cte.manual?.observacao || "");
  const [apoio, setApoio] = useState<Apoio | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const idPedido = useId();
  const idObra = useId();
  const idObs = useId();

  useEffect(() => {
    let vivo = true;
    buscarApoio().then((a) => vivo && setApoio(a));
    return () => {
      vivo = false;
    };
  }, []);

  const numeroPedido = /^\d{1,12}$/.test(pedido.trim()) ? Number(pedido.trim()) : null;
  const encontrado = useMemo(() => (numeroPedido ? apoio?.pedidos.find((p) => p.pedido === numeroPedido) || null : null), [apoio, numeroPedido]);
  const sugestoes = useMemo(() => {
    if (!apoio || sentido !== "compra") return [];
    const doRobo = apoio.pedidos.filter((p) => cte.pedidos.includes(p.pedido));
    const doNome = pedidosDoFornecedor(cte.remetente_nome, apoio.pedidos).filter((p) => !cte.pedidos.includes(p.pedido));
    return [...doRobo, ...doNome].slice(0, 8);
  }, [apoio, sentido, cte.pedidos, cte.remetente_nome]);

  // pedido de uma obra so: ja preenche a obra
  const usarPedido = (texto: string, p?: PedidoAberto | null) => {
    setPedido(texto);
    const achado = p ?? (/^\d{1,12}$/.test(texto.trim()) ? apoio?.pedidos.find((x) => x.pedido === Number(texto.trim())) : null);
    if (achado?.codigos_obra.length === 1) {
      setObra(achado.codigos_obra[0]);
      setForaDeObra(false);
    }
  };

  const pedidoInvalido = sentido === "compra" && pedido.trim() !== "" && numeroPedido === null;
  const podeSalvar = !salvando && !pedidoInvalido && (foraDeObra || !!obra);

  const salvar = async () => {
    if (!podeSalvar) return;
    setSalvando(true);
    setErro("");
    const { error } = await supabase.rpc("frete_cte_identificar", {
      p_chave: cte.chave,
      p_sentido: sentido,
      p_pedido: sentido === "compra" ? numeroPedido : null,
      p_codigo_obra: foraDeObra ? null : obra,
      p_fora_de_obra: foraDeObra,
      p_observacao: observacao,
    });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error, "Não foi possível salvar a identificação."));
    onSalvo();
  };

  const desfazer = async () => {
    setSalvando(true);
    setErro("");
    const { error } = await supabase.rpc("frete_cte_desfazer_identificacao", { p_chave: cte.chave });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error, "Não foi possível desfazer a identificação."));
    onSalvo();
  };

  return (
    <Moldura
      titulo={`Identificar o frete · CT-e ${cte.numero}`}
      onCancelar={onFechar}
      rodape={
        <>
          {cte.manual && (
            <button type="button" className={`${BOTAO_SECUNDARIO} mr-auto`} onClick={desfazer} disabled={salvando}>
              Desfazer identificação
            </button>
          )}
          <button type="button" className={BOTAO_SECUNDARIO} onClick={onFechar}>
            Cancelar
          </button>
          <button type="button" className={BOTAO_PRIMARIO} onClick={salvar} disabled={!podeSalvar}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </>
      }
    >
      <div className="text-sm text-slate-600 bg-slate-50 border rounded-lg p-3 mb-4">
        <p className="font-semibold text-slate-800">
          {cte.transportadora_nome || cte.transportadora_cnpj} · {formatarMoeda(cte.valor)} · {formatarDataSegura(cte.emitido_em)}
        </p>
        <p className="mt-0.5">
          De <span className="font-semibold">{cte.remetente_nome || "?"}</span> ({cte.origem_nome || "?"}) para{" "}
          <span className="font-semibold">{cte.destinatario_nome || "?"}</span> ({cte.destino_nome || "?"})
        </p>
        {cte.ligacao === "nf_lancada" && !cte.codigos_obra.length && (
          <p className="mt-1 text-amber-700">A NF-e deste frete já entrou no ERP sem projeto — costuma ser compra para estoque.</p>
        )}
        {cte.manual && (
          <p className="mt-1 text-xs text-slate-500">
            Identificado por {cte.manual.nome_usuario || "alguém"} em {formatarDataSegura(cte.manual.identificado_em.slice(0, 10))}.
          </p>
        )}
      </div>

      <fieldset className="mb-4">
        <legend className={ROTULO}>Tipo do frete</legend>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={sentido === t.id}
              onClick={() => setSentido(t.id)}
              className={`rounded-lg border px-2 py-2 text-left ${sentido === t.id ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              <span className="block text-sm font-semibold">{t.rotulo}</span>
              <span className={`block text-[11px] leading-tight ${sentido === t.id ? "text-white/80" : "text-slate-500"}`}>{t.ajuda}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {sentido === "compra" && (
        <div className="mb-4">
          <label htmlFor={idPedido} className={ROTULO}>
            Pedido de compra (opcional)
          </label>
          <input
            id={idPedido}
            value={pedido}
            onChange={(e) => usarPedido(e.target.value)}
            inputMode="numeric"
            placeholder="Número do pedido"
            className={CAMPO}
          />
          {pedidoInvalido && <p className="text-xs text-red-600 mt-1">Digite só o número do pedido.</p>}
          {!apoio && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Loader2 className="animate-spin" size={12} /> Carregando os pedidos em aberto…
            </p>
          )}
          {apoio && numeroPedido !== null && encontrado && (
            <p className="text-xs text-emerald-700 mt-1">
              {encontrado.fornecedor} · obra {encontrado.codigos_obra.join(", ") || "?"} · {formatarMoeda(encontrado.valor)} em aberto
            </p>
          )}
          {apoio && numeroPedido !== null && !encontrado && (
            <p className="text-xs text-amber-700 mt-1">
              Este pedido não está entre as compras em aberto das obras do app. Confira o número e escolha a obra abaixo.
            </p>
          )}
          {sugestoes.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1">Pedidos em aberto que parecem ser deste fornecedor:</p>
              <div className="flex flex-wrap gap-1.5">
                {sugestoes.map((p) => (
                  <button
                    key={p.pedido}
                    type="button"
                    onClick={() => usarPedido(String(p.pedido), p)}
                    aria-pressed={numeroPedido === p.pedido}
                    title={`${p.fornecedor} · ${formatarMoeda(p.valor)} em aberto`}
                    className={`px-2.5 py-1 rounded-full text-xs border ${
                      numeroPedido === p.pedido ? "bg-[#2A6377] text-white border-[#2A6377]" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {p.pedido} · obra {p.codigos_obra.join(", ") || "?"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor={idObra} className={ROTULO}>
          Obra
        </label>
        <select id={idObra} value={foraDeObra ? "" : obra} onChange={(e) => setObra(e.target.value)} disabled={foraDeObra || !apoio} className={CAMPO}>
          <option value="">{apoio ? "Escolha a obra…" : "Carregando…"}</option>
          {/* obra ja gravada que nao veio na lista (ex.: sem permissao de leitura) continua selecionavel */}
          {obra && apoio && !apoio.obras.some((o) => o.codigo === obra) && <option value={obra}>{obra}</option>}
          {apoio?.obras.map((o) => (
            <option key={o.id} value={o.codigo}>
              {o.codigo} — {o.nome}
              {o.andamento ? "" : " (encerrada)"}
            </option>
          ))}
        </select>
        {encontrado && encontrado.codigos_obra.length > 1 && !foraDeObra && (
          <p className="text-xs text-slate-500 mt-1">O pedido {encontrado.pedido} atende as obras {encontrado.codigos_obra.join(", ")}: escolha a deste frete.</p>
        )}
        <label className="flex items-center gap-2 mt-2 text-sm text-slate-700">
          <input type="checkbox" checked={foraDeObra} onChange={(e) => setForaDeObra(e.target.checked)} className="rounded" />
          Este frete não é de obra (estoque, administrativo, conserto…)
        </label>
      </div>

      <div>
        <label htmlFor={idObs} className={ROTULO}>
          Observação (opcional)
        </label>
        <input id={idObs} value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={300} className={CAMPO} />
      </div>

      {erro && (
        <p role="alert" className="text-sm text-red-600 mt-3">
          {erro}
        </p>
      )}
    </Moldura>
  );
}
