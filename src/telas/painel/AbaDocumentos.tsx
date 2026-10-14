import type { Dispatch } from "react";
import { formatarDataSegura, labelStatusDocumento, corIndicadorDocumento, classeStatusDocumento, formatarTamanhoArquivo } from "../../utils";
import { Plus, Save, Loader2, Trash2, FileText } from "lucide-react";
import type { DocumentoProjeto } from "../../types";

// Aba "documentos" do painel da obra. So exibicao: estado e funcoes ficam no App.tsx
// (passados por props com os mesmos nomes).
export interface PropsAbaDocumentos {
  abrirArquivoDocumento: (arquivo: any) => Promise<void>;
  anexarArquivoDocumento: (doc: any, arquivo: File | null) => Promise<void>;
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
  return (
    <div className="space-y-6">
      {podeEditarObraSelecionada && (
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Plus size={18} /> Novo Documento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              placeholder="Item"
              value={novoDocumentoProjeto.item}
              onChange={(e) =>
                setNovoDocumentoProjeto({
                  ...novoDocumentoProjeto,
                  item: e.target.value,
                })
              }
              className="md:col-span-2 border rounded-lg p-3 outline-none focus:border-[#2A6377]"
            />
            <input
              placeholder="Detalhes"
              value={novoDocumentoProjeto.detalhes}
              onChange={(e) =>
                setNovoDocumentoProjeto({
                  ...novoDocumentoProjeto,
                  detalhes: e.target.value,
                })
              }
              className="md:col-span-2 border rounded-lg p-3 outline-none focus:border-[#2A6377]"
            />
            <button
              onClick={salvarDocumentoProjeto}
              disabled={carregando}
              className="bg-[#2A6377] text-white rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <Save size={16} /> Salvar
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Novos documentos entram como “Não Elaborado” e indicador
            vermelho. Use os botões da lista para iniciar ou concluir.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-w-full">
        <div className="p-4 border-b">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <FileText size={18} className="text-[#2A6377]" />{" "}
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
                          <p className="text-xs text-slate-400 italic">
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
                                  className="text-left flex-1 min-w-0 hover:text-[#2A6377]"
                                >
                                  <p className="font-medium text-xs truncate">
                                    {arquivo.nome_arquivo}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
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
                          <label
                            className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${uploadDocumentoId === doc.id ? "bg-slate-200 text-slate-500" : "bg-[#2A6377]/10 text-[#2A6377] hover:bg-[#2A6377]/20"}`}
                          >
                            {uploadDocumentoId === doc.id ? (
                              <Loader2
                                className="animate-spin"
                                size={14}
                              />
                            ) : (
                              <Plus size={14} />
                            )}{" "}
                            Anexar arquivo
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                              disabled={uploadDocumentoId === doc.id}
                              onChange={(e) => {
                                const arquivo =
                                  e.target.files?.[0] || null;
                                anexarArquivoDocumento(doc, arquivo);
                                e.currentTarget.value = "";
                              }}
                            />
                          </label>
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
