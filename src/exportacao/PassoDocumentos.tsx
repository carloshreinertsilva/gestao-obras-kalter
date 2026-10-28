// Passo 11: documentos finais. O pedido vai para a fila do robo (ate 5 minutos), que confere de novo a revisao e a aprovacao e
// gera o Excel; aqui aparecem os rascunhos e os finais ja gerados, com o botao de baixar.
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import type { DocumentoLista } from "./tipos";
import { Aviso, Botao, Titulo } from "./ui";

const dataHora = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");
const tamanho = (b?: number | null) => (b ? (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`) : "");

interface Props {
  docs: DocumentoLista[];
  aprovado: boolean;
  bloqueado: boolean;
  ocupado: boolean;
  mensagem: { tom: "ok" | "aviso" | "erro"; texto: string } | null;
  onGerarFinal: () => void;
  onBaixar: (d: DocumentoLista) => void;
  onIrPara: (passo: "revisao" | "previa") => void;
}

export function PassoDocumentos({ docs, aprovado, bloqueado, ocupado, mensagem, onGerarFinal, onBaixar, onIrPara }: Props) {
  const liberado = aprovado && !bloqueado;
  const pendenteFinal = docs.some((d) => d.tipo === "final" && d.situacao === "pendente");
  return (
    <div className="space-y-4">
      <Titulo titulo="Documentos" descricao="O Excel final só sai sem erros e com a pré-visualização aprovada. O robô gera em até 5 minutos e o arquivo aparece na lista abaixo." />
      {!liberado && (
        <Aviso tom="aviso">
          {bloqueado ? (
            <>
              Ainda há erros a corrigir. Veja em{" "}
              <button type="button" className="underline font-semibold" onClick={() => onIrPara("revisao")}>
                Revisão e ajustes
              </button>
              .
            </>
          ) : (
            <>
              Falta aprovar (ou houve alteração depois da aprovação). Aprove em{" "}
              <button type="button" className="underline font-semibold" onClick={() => onIrPara("previa")}>
                Pré-visualização
              </button>
              .
            </>
          )}
        </Aviso>
      )}
      {mensagem && <Aviso tom={mensagem.tom}>{mensagem.texto}</Aviso>}
      <div>
        <Botao tipo="primario" desabilitado={!liberado || ocupado || pendenteFinal} onClick={onGerarFinal}>
          <FileSpreadsheet size={15} /> Gerar documentos finais
        </Botao>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[620px] border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="text-left font-semibold px-3 py-2">Documento</th>
              <th className="text-left font-semibold px-3 py-2">Pedido por</th>
              <th className="text-left font-semibold px-3 py-2">Situação</th>
              <th className="text-left font-semibold px-3 py-2">Arquivo</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2">
                  <b>{d.tipo === "final" ? "Final" : "Rascunho"}</b>
                  <div className="text-[11px] text-slate-400">{dataHora(d.created_at)}</div>
                </td>
                <td className="px-3 py-2 text-slate-600">{d.nome_pedido_por}</td>
                <td className="px-3 py-2">
                  {d.situacao === "pendente" && (
                    <span className="inline-flex items-center gap-1.5 text-amber-700">
                      <Loader2 size={13} className="animate-spin" /> Na fila do robô
                    </span>
                  )}
                  {d.situacao === "gerado" && <span className="text-emerald-700">Gerado {dataHora(d.gerado_em)}</span>}
                  {d.situacao === "erro" && <span className="text-red-600">Não gerado: {d.erro}</span>}
                </td>
                <td className="px-3 py-2">
                  {d.situacao === "gerado" && d.nome_arquivo && (
                    <Botao tamanho="pequeno" onClick={() => onBaixar(d)}>
                      <Download size={13} /> Baixar
                      <span className="font-normal text-slate-500">
                        {d.nome_arquivo} {tamanho(d.tamanho) && `· ${tamanho(d.tamanho)}`}
                      </span>
                    </Botao>
                  )}
                </td>
              </tr>
            ))}
            {!docs.length && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                  Nenhum documento pedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
