import { useEffect, useState } from "react";
import { Edit2, Plus, Save, User } from "lucide-react";
import { supabase } from "../supabase";
import { perfisUsuario } from "../constants";
import { labelPerfilUsuario } from "../utils";
import type { Usuario } from "../types";
import { ErroCarga, confirmar } from "../Dialogos";
import { mensagemErro } from "../erros";

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
    cadastra_materiais: false,
    revisa_fiscal_material: false,
    recebe_copia_material: false,
    login_erp: "",
  });
  const [salvando, setSalvando] = useState(false);
  // quem esta com a verificacao em duas etapas ligada (so admin recebe a lista) e o e-mail de quem esta logado:
  // o botao "Redefinir verificação" serve para quem perdeu/trocou o celular e nao vale para a propria pessoa
  const [comMfa, setComMfa] = useState<Set<string>>(new Set());
  const [meuEmail, setMeuEmail] = useState("");
  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) setMeuEmail((data.session?.user?.email || "").toLowerCase());
    });
    (supabase as any).rpc("mfa_usuarios_com_fator").then(({ data, error }: any) => {
      if (ativo && !error) setComMfa(new Set((data ?? []).map((r: any) => String(r.id_usuario))));
    });
    return () => {
      ativo = false;
    };
  }, []);
  const redefinirMfa = async (user: Usuario) => {
    const ok = await confirmar({
      titulo: "Redefinir verificação em duas etapas?",
      texto: `${user.nome} vai voltar a entrar só com a senha e poderá ativar de novo pelo menu. Use quando a pessoa perdeu ou trocou de celular.`,
      rotuloConfirmar: "Redefinir verificação",
      perigo: true,
    });
    if (!ok) return;
    const { error } = await (supabase as any).rpc("mfa_redefinir_usuario", { p_id_usuario: user.id });
    if (error) return onAviso(mensagemErro(error, "Não foi possível redefinir a verificação."), "erro");
    onAviso(`Verificação em duas etapas de ${user.nome} redefinida.`, "sucesso");
    setComMfa((atual) => {
      const novo = new Set(atual);
      novo.delete(String(user.id));
      return novo;
    });
  };
  // erro junto do campo (id -> texto); so aparece enquanto o campo continua invalido
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});
  const attrsCampo = (id: string, invalido: boolean) => {
    const comErro = invalido && Boolean(errosCampo[id]);
    return {
      "aria-required": true as const,
      "aria-invalid": comErro ? (true as const) : undefined,
      "aria-describedby": comErro ? `${id}-erro` : undefined,
    };
  };
  const erroCampo = (id: string, invalido: boolean) =>
    invalido && errosCampo[id] ? (
      <p id={`${id}-erro`} className="mt-1 text-xs text-red-600">
        {errosCampo[id]}
      </p>
    ) : null;
  // logins do ERP espelhados pelo robo (sync_romaneios.py)
  const [loginsErp, setLoginsErp] = useState<string[]>([]);
  const [erroLogins, setErroLogins] = useState("");
  const carregarLogins = () =>
    supabase
      .from("usuarios_erp")
      .select("login")
      .order("login")
      .then(({ data, error }) => {
        if (error) return setErroLogins(mensagemErro(error, "Erro ao buscar os usuários do ERP."));
        setErroLogins("");
        setLoginsErp(((data as { login: string }[]) || []).map((r) => r.login));
      });
  useEffect(() => {
    carregarLogins();
  }, []);

  const nomeUsuarioPorId = (id: any) => listaUsuarios.find((u) => u.id === id)?.nome || "";

  async function salvarUsuario(e: any) {
    e.preventDefault();
    // validacao propria (form com noValidate): o erro aparece junto do campo, em portugues
    const faltando: Record<string, string> = {};
    if (!novoUsuario.nome.trim()) faltando["eq-nome"] = "Informe o nome.";
    if (!novoUsuario.email.trim()) faltando["eq-email"] = "Informe o e-mail.";
    else if (!/^\S+@\S+\.\S+$/.test(novoUsuario.email.trim())) faltando["eq-email"] = "Informe um e-mail válido.";
    if (novoUsuario.perfil === "assistente" && !novoUsuario.id_engenheiro_vinculado)
      faltando["eq-engenheiro"] = "Escolha o engenheiro vinculado.";
    setErrosCampo(faltando);
    const primeiro = Object.keys(faltando)[0];
    if (primeiro) {
      onAviso("Preencha os campos obrigatórios (*).", "erro");
      setTimeout(() => document.getElementById(primeiro)?.focus(), 0);
      return;
    }
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
        cadastra_materiais: Boolean(novoUsuario.cadastra_materiais),
        revisa_fiscal_material: Boolean(novoUsuario.revisa_fiscal_material),
        recebe_copia_material: Boolean(novoUsuario.recebe_copia_material),
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
        onAviso("Colaborador cadastrado com sucesso!");
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
        cadastra_materiais: false,
        revisa_fiscal_material: false,
        recebe_copia_material: false,
        login_erp: "",
      });
      onAtualizar();
    } catch (error: any) {
      onAviso(mensagemErro(error, "Não foi possível salvar o usuário."), "erro");
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
      cadastra_materiais: Boolean(usuario.cadastra_materiais),
      revisa_fiscal_material: Boolean(usuario.revisa_fiscal_material),
      recebe_copia_material: Boolean(usuario.recebe_copia_material),
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
      cadastra_materiais: false,
      revisa_fiscal_material: false,
      recebe_copia_material: false,
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
          noValidate
          className="bg-white p-4 md:p-6 rounded-xl shadow-sm border h-fit max-w-full"
        >
          <h3 className="text-lg font-bold mb-4 border-b pb-2">
            {novoUsuario.id ? "Editar Colaborador" : "Novo Colaborador"}
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            <span className="text-red-500" aria-hidden="true">*</span> obrigatório
          </p>
          <div className="space-y-4 max-w-full">
            <div>
              <label htmlFor="eq-nome" className="block text-sm mb-1 max-w-full">
                Nome<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <input
                id="eq-nome"
                {...attrsCampo("eq-nome", !novoUsuario.nome.trim())}
                type="text"
                value={novoUsuario.nome}
                onChange={(e) =>
                  setNovoUsuario({ ...novoUsuario, nome: e.target.value })
                }
                className={`w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full${errosCampo["eq-nome"] && (!novoUsuario.nome.trim()) ? " !border-red-500" : ""}`}
              />
              {erroCampo("eq-nome", !novoUsuario.nome.trim())}
            </div>
            <div>
              <label htmlFor="eq-email" className="block text-sm mb-1 max-w-full">
                E-mail<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
              </label>
              <input
                id="eq-email"
                {...attrsCampo("eq-email", !novoUsuario.email.trim() || !/^\S+@\S+\.\S+$/.test(novoUsuario.email.trim()))}
                type="email"
                value={novoUsuario.email}
                onChange={(e) =>
                  setNovoUsuario({
                    ...novoUsuario,
                    email: e.target.value,
                  })
                }
                className={`w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full${errosCampo["eq-email"] && (!novoUsuario.email.trim() || !/^\S+@\S+\.\S+$/.test(novoUsuario.email.trim())) ? " !border-red-500" : ""}`}
              />
              {erroCampo("eq-email", !novoUsuario.email.trim() || !/^\S+@\S+\.\S+$/.test(novoUsuario.email.trim()))}
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
                <label htmlFor="eq-engenheiro" className="block text-sm mb-1 max-w-full">
                  Engenheiro vinculado<span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                </label>
                <select
                  id="eq-engenheiro"
                  {...attrsCampo("eq-engenheiro", !novoUsuario.id_engenheiro_vinculado)}
                  value={novoUsuario.id_engenheiro_vinculado}
                  onChange={(e) =>
                    setNovoUsuario({
                      ...novoUsuario,
                      id_engenheiro_vinculado: e.target.value,
                    })
                  }
                  className={`w-full border rounded-lg p-3 outline-none focus:border-[#2A6377] max-w-full${errosCampo["eq-engenheiro"] && (!novoUsuario.id_engenheiro_vinculado) ? " !border-red-500" : ""}`}
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
              {erroCampo("eq-engenheiro", !novoUsuario.id_engenheiro_vinculado)}
                <p className="text-xs text-slate-500 mt-1">
                  O assistente passa a ter o mesmo acesso às obras deste engenheiro.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Previsões</p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.aprova_previsao)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, aprova_previsao: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Aprova previsões</b>
                <span className="block text-xs text-slate-500">
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
                <span className="block text-xs text-slate-500">
                  Cópia informativa de cada solicitação nova (sem aprovar) e cópia das aprovações e recusas.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Faturamento</p>
            <div>
              <label className="block text-sm font-bold mb-1">Usuário no ERP</label>
              <select
                value={novoUsuario.login_erp || ""}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, login_erp: e.target.value })}
                className="border rounded-lg px-3 py-2 w-full bg-white text-sm"
              >
                <option value="">Sem vínculo</option>
                {novoUsuario.login_erp && !loginsErp.includes(novoUsuario.login_erp) && (
                  <option value={novoUsuario.login_erp}>
                    {novoUsuario.login_erp}
                    {erroLogins ? "" : " (não encontrado no ERP)"}
                  </option>
                )}
                {loginsErp.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              {erroLogins && (
                <ErroCarga compacto mensagem="Não foi possível carregar os usuários do ERP." detalhe={erroLogins} onTentar={carregarLogins} />
              )}
              <span className="block text-xs text-slate-500 mt-1">
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
                <span className="block text-xs text-slate-500">
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
                <span className="block text-xs text-slate-500">
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
                <span className="block text-xs text-slate-500">
                  Recebe por e-mail (com a NF anexada) as NFs de prestadores de serviço que os gestores encaminham, para lançar e pagar; e os lembretes de vencimento.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.cadastra_materiais)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, cadastra_materiais: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Responsável pelo cadastro de materiais</b>
                <span className="block text-xs text-slate-500">
                  Revisa as solicitações de material novo (descrição, unidade, classe/tipo), aprova para o fiscal, devolve ou recusa apontando o item que já existe.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.revisa_fiscal_material)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, revisa_fiscal_material: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Revisão fiscal de materiais</b>
                <span className="block text-xs text-slate-500">
                  Revisa NCM, tipo do item e % de IPI dos materiais aprovados pelo cadastro e cria o item no ERP.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.recebe_copia_material)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, recebe_copia_material: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Recebe cópia dos avisos de material</b>
                <span className="block text-xs text-slate-500">
                  Acompanha as solicitações de material: recebe o aviso de cada pedido novo, da ida para a revisão fiscal e do item cadastrado no ERP.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Sistema</p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(novoUsuario.recebe_alerta_sistema)}
                onChange={(e) => setNovoUsuario({ ...novoUsuario, recebe_alerta_sistema: e.target.checked })}
                className="mt-0.5 accent-[#2A6377]"
              />
              <span>
                <b>Recebe alertas do sistema</b>
                <span className="block text-xs text-slate-500">
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
                    <span className="text-[11px] ml-2 px-2 py-0.5 bg-gray-200 rounded uppercase inline-block">
                      {labelPerfilUsuario(user.perfil ?? "")}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 truncate max-w-full">
                    {user.email}
                    {user.login_erp && <span className="text-slate-500"> · ERP {user.login_erp}</span>}
                  </p>
                  {(user.aprova_previsao || user.recebe_copia_previsao || user.aprova_faturamento || user.recebe_copia_faturamento || user.recebe_nf_terceiros || user.recebe_alerta_sistema || user.cadastra_materiais || user.revisa_fiscal_material || user.recebe_copia_material) && (
                    <p className="flex flex-wrap gap-1 mt-1">
                      {user.aprova_previsao && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aprova previsões
                        </span>
                      )}
                      {user.recebe_copia_previsao && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border">
                          Cópia das previsões
                        </span>
                      )}
                      {user.aprova_faturamento && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          Aprova faturamento
                        </span>
                      )}
                      {user.aprova_faturamento && !user.login_erp && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          Sem usuário do ERP
                        </span>
                      )}
                      {user.recebe_copia_faturamento && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border">
                          Cópia do faturamento
                        </span>
                      )}
                      {user.recebe_alerta_sistema && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          Alertas do sistema
                        </span>
                      )}
                      {user.recebe_nf_terceiros && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                          NFs de terceiros
                        </span>
                      )}
                      {user.cadastra_materiais && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Cadastro de materiais
                        </span>
                      )}
                      {user.revisa_fiscal_material && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Fiscal de materiais
                        </span>
                      )}
                      {user.recebe_copia_material && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border">
                          Cópia dos materiais
                        </span>
                      )}
                    </p>
                  )}
                  {user.perfil === "assistente" && (
                    <p className="text-xs text-[#2A6377] font-bold truncate max-w-full">
                      Assistente de:{" "}
                      {nomeUsuarioPorId(user.id_engenheiro_vinculado) ||
                        "não definido"}
                    </p>
                  )}
                  {comMfa.has(String(user.id)) && (
                    <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Duas etapas ligada
                      </span>
                      {(user.email || "").toLowerCase() !== meuEmail && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            redefinirMfa(user);
                          }}
                          className="text-red-700 underline hover:text-red-900"
                        >
                          Redefinir verificação
                        </button>
                      )}
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
