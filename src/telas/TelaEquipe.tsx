import { useEffect, useState } from "react";
import { Edit2, Plus, Save, User } from "lucide-react";
import { supabase } from "../supabase";
import { perfisUsuario } from "../constants";
import { labelPerfilUsuario } from "../utils";
import type { Usuario } from "../types";

// Cadastros -> Equipe (so admin): cadastro e edicao de colaboradores, perfil,
// engenheiro vinculado do assistente e indicadores de previsao.
interface Props {
  listaUsuarios: Usuario[];
  onAtualizar: () => void;
  onAviso: (mensagem: string, tipo?: string) => void;
}

export default function TelaEquipe({ listaUsuarios, onAtualizar, onAviso }: Props) {
  const [novoUsuario, setNovoUsuario] = useState<any>({
    id: null,
    nome: "",
    email: "",
    perfil: "engenheiro",
    id_engenheiro_vinculado: "",
    aprova_previsao: false,
    recebe_copia_previsao: false,
    aprova_faturamento: false,
    recebe_copia_faturamento: false,
    recebe_nf_terceiros: false,
    recebe_alerta_sistema: false,
    login_erp: "",
  });
  const [salvando, setSalvando] = useState(false);
  // logins do ERP espelhados pelo robo (sync_romaneios.py)
  const [loginsErp, setLoginsErp] = useState<string[]>([]);
  useEffect(() => {
    supabase
      .from("usuarios_erp")
      .select("login")
      .order("login")
      .then(({ data }) => setLoginsErp(((data as { login: string }[]) || []).map((r) => r.login)));
  }, []);

  const nomeUsuarioPorId = (id: any) => listaUsuarios.find((u) => u.id === id)?.nome || "";

  async function salvarUsuario(e: any) {
    e.preventDefault();
    setSalvando(true);
    try {
      const dadosUsuario = {
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        perfil: novoUsuario.perfil,
        id_engenheiro_vinculado:
          novoUsuario.perfil === "assistente"
            ? novoUsuario.id_engenheiro_vinculado || null
            : null,
        aprova_previsao: Boolean(novoUsuario.aprova_previsao),
        recebe_copia_previsao: Boolean(novoUsuario.recebe_copia_previsao),
        aprova_faturamento: Boolean(novoUsuario.aprova_faturamento),
        recebe_copia_faturamento: Boolean(novoUsuario.recebe_copia_faturamento),
        recebe_nf_terceiros: Boolean(novoUsuario.recebe_nf_terceiros),
        recebe_alerta_sistema: Boolean(novoUsuario.recebe_alerta_sistema),
        login_erp: novoUsuario.login_erp || null,
      };

      if (novoUsuario.id) {
        const { error } = await supabase
          .from("usuarios")
          .update(dadosUsuario)
          .eq("id", novoUsuario.id);
        if (error) throw error;
        onAviso("Colaborador atualizado!");
      } else {
        const { error } = await supabase.from("usuarios").insert([dadosUsuario]);
        if (error) throw error;
        onAviso("Registado com sucesso!");
      }
      setNovoUsuario({
        id: null,
        nome: "",
        email: "",
        perfil: "engenheiro",
        id_engenheiro_vinculado: "",
        aprova_previsao: false,
        recebe_copia_previsao: false,
        aprova_faturamento: false,
        recebe_copia_faturamento: false,
        recebe_nf_terceiros: false,
        recebe_alerta_sistema: false,
        login_erp: "",
      });
      onAtualizar();
    } catch (error: any) {
      onAviso(error.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  const editarUsuario = (usuario: any) => {
    setNovoUsuario({
      id: usuario.id,
      nome: usuario.nome || "",
      email: usuario.email || "",
      perfil: usuario.perfil || "engenheiro",
      id_engenheiro_vinculado: usuario.id_engenheiro_vinculado || "",
      aprova_previsao: Boolean(usuario.aprova_previsao),
      recebe_copia_previsao: Boolean(usuario.recebe_copia_previsao),
      aprova_faturamento: Boolean(usuario.aprova_faturamento),
      recebe_copia_faturamento: Boolean(usuario.recebe_copia_faturamento),
      recebe_nf_terceiros: Boolean(usuario.recebe_nf_terceiros),
      recebe_alerta_sistema: Boolean(usuario.recebe_alerta_sistema),
      login_erp: usuario.login_erp || "",
    });
    setTimeout(() => {
      document
        .getElementById("form-cadastro-colaborador")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const cancelarEdicaoUsuario = () => {
    setNovoUsuario({
      id: null,
      nome: "",
      email: "",
      perfil: "engenheiro",
      id_engenheiro_vinculado: "",
      aprova_previsao: false,
      recebe_copia_previsao: false,
      aprova_faturamento: false,
      recebe_copia_faturamento: false,
      recebe_nf_terceiros: false,
      recebe_alerta_sistema: false,
      login_erp: "",
    });
  };

  return (
    <div className="animate-in fade-in dash-main-wrapper max-w-4xl">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-slate-800">
        Cadastros &rarr; Equipe
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <form
          id="form-cadastro-colaborador"
          onSubmit={salvarUsuario}
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border h-fit max-w-full"
        >
          <h3 className="text-lg font-bold mb-4 border-b pb-2">
            {novoUsuario.id ? "Editar Colaborador" : "Novo Colaborador"}
          </h3>
          <div className="space-y-4 max-w-full">
            <div>
              <label className="block text-sm mb-1 max-w-full">
                Nome
              </label>
              <input
                required
                type="text"
                value={novoUsuario.nome}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, nome: e.target.value })
                }
                className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 max-w-full">
                E-mail
              </label>
              <input
                required
                type="email"
                value={novoUsuario.email}
                onChange={(e) =>
                  setNovoUsuario({
                    ...novoUsuario,
                    email: e.target.value,
                  })
                }
                className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 max-w-full">
                Perfil
              </label>
              <select
                value={novoUsuario.perfil}
                onChange={(e) =>
                  setNovoUsuario({
                    ...novoUsuario,
                    perfil: e.target.value,
                  })
                }
                className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full"
              >
                {perfisUsuario.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {novoUsuario.perfil === "assistente" && (
              <div>
                <label className="block text-sm mb-1 max-w-full">
                  Engenheiro vinculado
                </label>
                <select
                  required
                  value={novoUsuario.id_engenheiro_vinculado}
                  onChange={(e) =>
                    setNovoUsuario({
                      ...novoUsuario,
                      id_engenheiro_vinculado: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full"
                >
                  <option value="">Selecione…</option>
                  {listaUsuarios
                    .filter((u) => u.perfil === "engenheiro" && u.id !== novoUsuario.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  O assistente passa a ter o mesmo acesso às obras deste engenheiro.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Previsões</p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.aprova_previsao)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, aprova_previsao: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Aprova previsões</b>
                <span className="block text-[11px] text-slate-400">
                  Recebe o e-mail com as solicitações para aprovar e pode aprovar ou recusar no app (a aprovação grava no ERP).
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.recebe_copia_previsao)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, recebe_copia_previsao: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Recebe cópia das previsões</b>
                <span className="block text-[11px] text-slate-400">
                  Cópia informativa de cada solicitação nova (sem aprovar) e cópia das aprovações e recusas.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Faturamento</p>
            <div>
              <label className="block text-sm font-bold mb-1">Usuário no ERP</label>
              <select
                value={novoUsuario.login_erp || ""}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, login_erp: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full bg-white text-sm"
              >
                <option value="">Sem vínculo</option>
                {novoUsuario.login_erp && !loginsErp.includes(novoUsuario.login_erp) && (
                  <option value={novoUsuario.login_erp}>{novoUsuario.login_erp} (não encontrado no ERP)</option>
                )}
                {loginsErp.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <span className="block text-[11px] text-slate-400 mt-1">
                Gravado no romaneio que o app gera no ERP quando este usuário aprova um faturamento de produto (obrigatório para quem aprova).
              </span>
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.aprova_faturamento)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, aprova_faturamento: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Aprova faturamento (logística)</b>
                <span className="block text-[11px] text-slate-400">
                  Recebe as solicitações de faturamento para conferir itens, pesos, volumes e transportadora, e aprova ou devolve.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.recebe_copia_faturamento)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, recebe_copia_faturamento: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Recebe cópia do faturamento</b>
                <span className="block text-[11px] text-slate-400">
                  Cópia de todas as etapas das solicitações de faturamento (envio, aprovação, devolução, NF emitida).
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.recebe_nf_terceiros)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, recebe_nf_terceiros: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Recebe NFs de terceiros</b>
                <span className="block text-[11px] text-slate-400">
                  Recebe por e-mail (com a NF anexada) as NFs de prestadores de serviço que os gestores encaminham, para lançar e pagar; e os lembretes de vencimento.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Sistema</p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.recebe_alerta_sistema)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, recebe_alerta_sistema: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Recebe alertas do sistema</b>
                <span className="block text-[11px] text-slate-400">
                  Aviso (e-mail e push) quando o robô do servidor para ou falha, a fila de e-mails trava ou o backup diário não é feito; e quando volta ao normal.
                </span>
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-6">
            {novoUsuario.id && (
              <button
                type="button"
                onClick={cancelarEdicaoUsuario}
                className="text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg font-medium border"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={salvando}
              className="bg-[#2A6377] text-white px-6 py-2 rounded-lg font-medium w-full sm:w-auto disabled:opacity-50"
            >
              {novoUsuario.id ? (
                <>
                  <Save size={18} className="inline mr-2" /> Salvar
                  alterações
                </>
              ) : (
                <>
                  <Plus size={18} className="inline mr-2" /> Adicionar
                </>
              )}
            </button>
          </div>
        </form>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border max-w-full">
          <h3 className="text-lg font-bold mb-4 border-b pb-2">
            Registados
          </h3>
          <div className="space-y-3 max-w-full">
            {listaUsuarios.map((user) => (
              <div
                key={user.id}
                onClick={() => editarUsuario(user)}
                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg max-w-full cursor-pointer hover:border-[#2A6377] transition group"
              >
                <div
                  className={`p-2 rounded-full text-white shrink-0 ${user.perfil === "admin" ? "bg-[#2A6377]" : "bg-[#2A6377]/60"}`}
                >
                  <User size={16} />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="font-bold text-sm truncate max-w-full">
                    {user.nome}{" "}
                    <span className="text-[10px] ml-2 px-2 py-0.5 bg-gray-200 rounded uppercase inline-block">
                      {labelPerfilUsuario(user.perfil ?? "")}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 truncate max-w-full">
                    {user.email}
                    {user.login_erp && <span className="text-slate-400"> · ERP {user.login_erp}</span>}
                  </p>
                  {(user.aprova_previsao || user.recebe_copia_previsao || user.aprova_faturamento || user.recebe_copia_faturamento || user.recebe_nf_terceiros || user.recebe_alerta_sistema) && (
                    <p className="flex flex-wrap gap-1 mt-1">
                      {user.aprova_previsao && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aprova previsões
                        </span>
                      )}
                      {user.recebe_copia_previsao && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border">
                          Cópia das previsões
                        </span>
                      )}
                      {user.aprova_faturamento && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          Aprova faturamento
                        </span>
                      )}
                      {user.aprova_faturamento && !user.login_erp && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          Sem usuário do ERP
                        </span>
                      )}
                      {user.recebe_copia_faturamento && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border">
                          Cópia do faturamento
                        </span>
                      )}
                      {user.recebe_alerta_sistema && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          Alertas do sistema
                        </span>
                      )}
                      {user.recebe_nf_terceiros && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                          NFs de terceiros
                        </span>
                      )}
                    </p>
                  )}
                  {user.perfil === "assistente" && (
                    <p className="text-[11px] text-[#2A6377] font-bold truncate max-w-full">
                      Assistente de:{" "}
                      {nomeUsuarioPorId(user.id_engenheiro_vinculado) ||
                        "não definido"}
                    </p>
                  )}
                </div>
                <Edit2
                  size={14}
                  className="text-slate-300 group-hover:text-[#2A6377] shrink-0 transition"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
