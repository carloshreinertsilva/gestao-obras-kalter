import { useState, type Dispatch } from "react";
import EntradaArquivos from "../../EntradaArquivos";
import { textoProgresso } from "../../arquivosRegras";
import { MAX_MB_ANEXO, separarPorTipo } from "../../tiposArquivoAnexo";
import { useAviso } from "../../aviso";
import { formatarDataSegura, labelStatusDocumento, corIndicadorDocumento, classeStatusDocumento, formatarTamanhoArquivo } from "../../utils";
import { Plus, Save, Loader2, Trash2, FileText } from "lucide-react";
import type { DocumentoProjeto } from "../../types";

// Aba "documentos" do painel da obra. So exibicao: estado e funcoes ficam no App.tsx
// (passados por props com os mesmos nomes).
export interface PropsAbaDocumentos {
  abrirArquivoDocumento: (arquivo: any) => Promise<void>;
  // devolve true quando o arquivo subiu (o aviso de sucesso/erro de cada um continua sendo dado pelo App)
  anexarArquivoDocumento: (doc: any, arquivo: File | null) => Promise<boolean | void>;
  arquivosDocumentos: any;
  carregando: boolean;
  concluirDocumentoProjeto: (doc: any) => Promise<void>;
  deletarRegistroPMIS: (tabela: string, id: any) => Promise<void>;
  documentosProjeto: DocumentoProjeto[];
  excluirArquivoDocumento: (arquivo: any) => Promise<void>;
  iniciarDocumentoProjeto: (doc: any) => Promise<void>;
  novoDocumentoProjeto: any;
  podeEditarObraSelecionada: boolean;
  reabrirDocumentoProjeto: (doc: any) => Promise<void>;
  salvarDocumentoProjeto: () => Promise<void>;
  setNovoDocumentoProjeto: Dispatch<any>;
  uploadDocumentoId: string;
}

export default function AbaDocumentos({
  abrirArquivoDocumento,
  anexarArquivoDocumento,
  arquivosDocumentos,
  carregando,
  concluirDocumentoProjeto,
  deletarRegistroPMIS,
  documentosProjeto,
  excluirArquivoDocumento,
  iniciarDocumentoProjeto,
  novoDocumentoProjeto,
  podeEditarObraSelecionada,
  reabrirDocumentoProjeto,
  salvarDocumentoProjeto,
  setNovoDocumentoProjeto,
  uploadDocumentoId,
}: PropsAbaDocumentos) {
  // varios arquivos: chama a funcao do App (um arquivo por vez) em sequencia. Ela mesma avisa sucesso/erro de cada um
  // e nao devolve se deu certo, entao aqui so mostra o andamento.
  const [lote, setLote] = useState<{ idDoc: string; atual: number; total: number } | null>(null);
  const [faltaItem, setFaltaItem] = useState(false);
  const aviso = useAviso();
  const anexarVarios = async (doc: any, todos: File[]) => {
    // executavel/script/pagina nao sobe (o banco tambem recusa); o resto segue
    const { permitidos: arquivos, aviso: textoBloqueio } = separarPorTipo(todos);
    if (textoBloqueio) aviso.erro(textoBloqueio);
    if (!arquivos.length) return;
    try {
      for (const [k, arquivo] of arquivos.entries()) {
        setLote({ idDoc: doc.id, atual: k + 1, total: arquivos.length });
        await anexarArquivoDocumento(doc, arquivo);
      }
    } finally {
      setLote(null);
    }
  };

  return (
    <div className="space-y-6">
      {podeEditarObraSelecionada && (
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Plus size={18} /> Novo Documento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <input
                placeholder="Item *"
                aria-label="Item (obrigatório)"
                aria-invalid={faltaItem || undefined}
                aria-describedby={faltaItem ? "doc-novo-item-erro" : undefined}
                value={novoDocumentoProjeto.item}
                onChange={(e) => {
                  if (e.target.value.trim()) setFaltaItem(false);
                  setNovoDocumentoProjeto({
                    ...novoDocumentoProjeto,
                    item: e.target.value,
                  });
                }}
                className={`w-full border rounded-lg p-3 outline-none focus:border-petroleo ${faltaItem ? "border-red-400" : ""}`}
              />
              {faltaItem && (
                <p id="doc-novo-item-erro" className="mt-1 text-xs font-semibold text-red-600">
                  Informe o item do documento.
                </p>
              )}
            </div>
            <input
              placeholder="Detalhes"
              value={novoDocumentoProjeto.detalhes}
              onChange={(e) =>
                setNovoDocumentoProjeto({
                  ...novoDocumentoProjeto,
                  detalhes: e.target.value,
                })
              }
              className="md:col-span-2 border rounded-lg p-3 outline-none focus:border-petroleo"
            />
            <button
              onClick={() => {
                if (!String(novoDocumentoProjeto.item || "").trim()) return setFaltaItem(true);
                salvarDocumentoProjeto();
              }}
              disabled={carregando}
              className="bg-petroleo text-white rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <Save size={16} /> Salvar
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            * obrigatório. Novos documentos entram como “Não Elaborado” e indicador
            vermelho. Use os botões da lista para iniciar ou concluir.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FileText size={18} className="text-petroleo" />{" "}
            Documentos do Projeto
          </h3>
        </div>
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Detalhes</th>
                <th className="p-3">Status</th>
                <th className="p-3">Indicador</th>
                <th className="p-3">Conclusão</th>
                <th className="p-3 text-left">Anexos</th>
                {podeEditarObraSelecionada && <th className="p-3">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {documentosProjeto.length === 0 ? (
                <tr>
                  <td
                    colSpan={podeEditarObraSelecionada ? 7 : 6}
                    className="p-6 text-center text-slate-500"
                  >
                    Nenhum documento cadastrado.
                  </td>
                </tr>
              ) : (
                documentosProjeto.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-t hover:bg-slate-50 align-top"
                  >
                    <td className="p-3 font-bold">{doc.item}</td>
                    <td className="p-3 text-slate-600 max-w-[260px]">
                      {doc.detalhes}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${classeStatusDocumento(doc.status ?? "")}`}
                      >
                        {labelStatusDocumento(doc.status ?? "")}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block w-5 h-5 rounded-full border-2 border-slate-800 ${corIndicadorDocumento(doc.status ?? "")}`}
                      ></span>
                    </td>
                    <td className="p-3 text-center text-slate-700">
                      {doc.data_conclusao
                        ? formatarDataSegura(doc.data_conclusao)
                        : "-"}
                    </td>
                    <td className="p-3 min-w-[280px]">
                      <div className="space-y-2">
                        {(arquivosDocumentos[doc.id] || []).length ===
                        0 ? (
                          <p className="text-xs text-slate-500 italic">
                            Nenhum anexo.
                          </p>
                        ) : (
                          (arquivosDocumentos[doc.id] || []).map(
                            (arquivo: any) => (
                              <div
                                key={arquivo.id}
                                className="flex items-center justify-between gap-2 bg-white border rounded-lg p-2 shadow-sm"
                              >
                                <button
                                  onClick={() =>
                                    abrirArquivoDocumento(arquivo)
                                  }
                                  className="text-left flex-1 min-w-0 hover:text-petroleo"
                                >
                                  <p className="font-medium text-xs truncate">
                                    {arquivo.nome_arquivo}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatarTamanhoArquivo(
                                      arquivo.tamanho_bytes,
                                    )}{" "}
                                    •{" "}
                                    {formatarDataSegura(
                                      arquivo.created_at,
                                    )}
                                  </p>
                                </button>
                                {podeEditarObraSelecionada && (
                                  <button
                                    onClick={() =>
                                      excluirArquivoDocumento(arquivo)
                                    }
                                    className="text-red-400 hover:text-red-600 shrink-0"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ),
                          )
                        )}
                        {podeEditarObraSelecionada && (
                          <>
                            <EntradaArquivos
                              rotulo="Anexar arquivos"
                              // sem accept: a lista antiga (.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg) barrava
                              // .xlsm e desenhos ja usados; agora so barra executavel/script/pagina
                              maxMb={MAX_MB_ANEXO}
                              // uma linha por documento: colar iria para a ultima linha da tabela, nao para a que a
                              // pessoa esta olhando
                              colar={false}
                              desabilitado={
                                uploadDocumentoId === doc.id ||
                                lote?.idDoc === doc.id
                              }
                              onArquivos={(arquivos) => anexarVarios(doc, arquivos)}
                            />
                            {(lote?.idDoc === doc.id ||
                              uploadDocumentoId === doc.id) && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Loader2 className="animate-spin" size={12} aria-hidden="true" />
                                {lote?.idDoc === doc.id
                                  ? textoProgresso(lote.atual, lote.total)
                                  : "Enviando…"}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    {podeEditarObraSelecionada && (
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-2">
                          {doc.status === "nao_elaborado" && (
                            <button
                              onClick={() =>
                                iniciarDocumentoProjeto(doc)
                              }
                              className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold hover:bg-amber-200 transition w-24"
                            >
                              Iniciar
                            </button>
                          )}
                          {doc.status === "em_andamento" && (
                            <button
                              onClick={() =>
                                concluirDocumentoProjeto(doc)
                              }
                              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition w-24"
                            >
                              Concluir
                            </button>
                          )}
                          {doc.status === "concluido" && (
                            <button
                              onClick={() =>
                                reabrirDocumentoProjeto(doc)
                              }
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition w-24"
                            >
                              Reabrir
                            </button>
                          )}
                          {doc.status !== "concluido" &&
                            doc.status !== "em_andamento" && (
                              <button
                                onClick={() =>
                                  concluirDocumentoProjeto(doc)
                                }
                                className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition w-24"
                              >
                                Concluir
                              </button>
                            )}
                          <button
                            onClick={() =>
                              deletarRegistroPMIS(
                                "documentos_projeto",
                                doc.id,
                              )
                            }
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
