// Verificacao em duas etapas (Pacote 4 / D2): aplicativo autenticador (TOTP do Supabase Auth).
//   TelaCodigoLogin        - depois da senha, antes de carregar o app (sessao aal1 com aplicativo ativado)
//   TelaAtivarObrigatoria  - quando a obrigatoriedade estiver ligada e a pessoa ainda nao ativou
//   JanelaDuasEtapas       - menu do usuario: ver situacao, ativar, desativar
// Segredo, QR e codigos ficam so no estado local do componente (somem ao fechar); nunca em localStorage/log.
// Regras puras em calculoDuasEtapas.ts.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { supabase } from "./supabase";
import { Modal } from "./Modal";
import { avisar } from "./aviso";
import {
  codigoCompleto,
  fatoresPendentes,
  fatoresVerificados,
  formatarChave,
  limparCodigo,
  mensagemErroMfa,
  podeDesativar,
} from "./calculoDuasEtapas";

const EMISSOR = "Kalter Gestão de Obras";
const APLICATIVOS = "Google Authenticator, Microsoft Authenticator ou outro aplicativo autenticador";
const AVISO_CELULAR = "Se você perder o celular, peça a um administrador para redefinir a sua verificação.";

/** Obrigatoriedade ligada para quem esta logado? Qualquer erro (funcao ainda nao criada, rede) = nao. */
export async function mfaExigidoParaMim(): Promise<boolean> {
  try {
    const { data, error } = await (supabase as any).rpc("mfa_exigido_para_mim");
    return !error && data === true;
  } catch {
    return false;
  }
}

// remove tentativas de ativacao abandonadas (fator "nao verificado"), para nao acumular
async function limparPendentes() {
  const { data } = await supabase.auth.mfa.listFactors();
  for (const f of fatoresPendentes(data?.all)) await supabase.auth.mfa.unenroll({ factorId: f.id });
}

function Erro({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm font-medium">
      <AlertTriangle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

function CampoCodigo({ valor, onMudar, id }: { valor: string; onMudar: (v: string) => void; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        Código de 6 dígitos do aplicativo
      </label>
      <div className="relative">
        <KeyRound size={18} className="absolute left-3 top-3 text-slate-400" aria-hidden="true" />
        <input
          id={id}
          data-foco-inicial
          autoFocus
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          value={valor}
          onChange={(e) => onMudar(limparCodigo(e.target.value))}
          className="w-full border rounded-lg py-3 pl-10 pr-3 outline-none focus:border-[#2A6377] tracking-[0.4em] font-mono text-lg"
        />
      </div>
    </div>
  );
}

// moldura das telas de antes do app (mesmo visual do login e do "Definir nova senha")
function CartaoEntrada({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-100 items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
        <div className="bg-[#2A6377] p-6 md:p-8 text-center flex flex-col items-center justify-center border-b border-[#1e4857]">
          <img src="/logo.png" alt="Kalter Logo" className="max-h-16 w-auto object-contain" />
          <p className="text-white/80 font-medium tracking-wide uppercase text-xs mt-2">Gestão de Obras</p>
        </div>
        <div className="p-6 md:p-8 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------ login

/** Pede o codigo depois da senha. Ao confirmar, o Supabase troca a sessao para aal2 e o App segue sozinho. */
export function TelaCodigoLogin({ email, onSair }: { email?: string; onSair: () => void }) {
  const [idFator, setIdFator] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    supabase.auth.mfa.listFactors().then(async ({ data, error }) => {
      if (!vivo) return;
      if (error) return setErro(mensagemErroMfa(error));
      const fator = fatoresVerificados(data?.all)[0];
      // aplicativo removido por um administrador depois que a sessao foi salva: renova a sessao e o App reavalia
      if (!fator) return void supabase.auth.refreshSession();
      setIdFator(fator.id);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const confirmar = async (e: FormEvent) => {
    e.preventDefault();
    if (!idFator) return;
    if (!codigoCompleto(codigo)) return setErro("Digite os 6 números que aparecem no aplicativo.");
    setEnviando(true);
    setErro("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: idFator, code: limparCodigo(codigo) });
    setEnviando(false);
    if (error) {
      setCodigo("");
      setErro(mensagemErroMfa(error));
    }
  };

  return (
    <CartaoEntrada>
      <form onSubmit={confirmar} className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#2A6377]" aria-hidden="true" /> Digite o código do aplicativo
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {email ? <>A conta <b>{email}</b> usa verificação em duas etapas. </> : null}
            Abra o aplicativo autenticador no celular e digite o código de 6 números de “{EMISSOR}”.
          </p>
        </div>
        <Erro texto={erro} />
        <CampoCodigo id="mfa-codigo-login" valor={codigo} onMudar={setCodigo} />
        <button
          type="submit"
          disabled={enviando || !idFator}
          className="w-full bg-[#2A6377] hover:bg-[#1e4857] text-white p-3 rounded-lg font-bold flex justify-center items-center disabled:opacity-50"
        >
          {enviando || !idFator ? <Loader2 className="animate-spin" size={18} aria-label="Aguarde" /> : "Confirmar"}
        </button>
        <p className="text-xs text-slate-500">{AVISO_CELULAR}</p>
        <button type="button" onClick={onSair} className="w-full text-slate-500 text-sm font-medium">
          Sair
        </button>
      </form>
    </CartaoEntrada>
  );
}

/** Obrigatoriedade ligada e a pessoa ainda nao ativou: so entra no app depois de ativar. */
export function TelaAtivarObrigatoria({ onSair }: { onSair: () => void }) {
  return (
    <CartaoEntrada>
      <div>
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck size={20} className="text-[#2A6377]" aria-hidden="true" /> Ative a verificação em duas etapas
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Para o seu perfil, a verificação em duas etapas é obrigatória. Ative agora para continuar usando o sistema.
        </p>
      </div>
      {/* ao confirmar, a sessao vira aal2 e o App libera sozinho (evento do Supabase) */}
      <AtivarDuasEtapas onConcluido={() => undefined} onCancelar={onSair} rotuloCancelar="Sair" />
    </CartaoEntrada>
  );
}

// ------------------------------------------------------------------------------------ ativar

function AtivarDuasEtapas({
  onConcluido,
  onCancelar,
  rotuloCancelar = "Cancelar",
}: {
  onConcluido: () => void;
  onCancelar: () => void;
  rotuloCancelar?: string;
}) {
  const [fator, setFator] = useState<{ id: string; qr: string; chave: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [verChave, setVerChave] = useState(false);
  const idCriado = useRef<string | null>(null);
  const concluido = useRef(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await limparPendentes();
        if (!vivo) return;
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          issuer: EMISSOR,
          // nome interno (nao aparece no aplicativo); precisa ser unico por pessoa
          friendlyName: `Aplicativo ${Date.now().toString(36)}`,
        });
        if (error) throw error;
        if (!vivo) {
          // a janela fechou enquanto criava: nao deixa o fator pendurado
          await supabase.auth.mfa.unenroll({ factorId: data.id });
          return;
        }
        idCriado.current = data.id;
        setFator({ id: data.id, qr: data.totp.qr_code, chave: data.totp.secret });
      } catch (e) {
        if (vivo) setErro(mensagemErroMfa(e));
      }
    })();
    return () => {
      vivo = false;
      // fechou no meio: remove o fator "nao verificado"
      if (idCriado.current && !concluido.current) void supabase.auth.mfa.unenroll({ factorId: idCriado.current });
    };
  }, []);

  const confirmar = async (e: FormEvent) => {
    e.preventDefault();
    if (!fator) return;
    if (!codigoCompleto(codigo)) return setErro("Digite os 6 números que aparecem no aplicativo.");
    setEnviando(true);
    setErro("");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: limparCodigo(codigo) });
    setEnviando(false);
    if (error) {
      setCodigo("");
      return setErro(mensagemErroMfa(error));
    }
    concluido.current = true;
    setFator(null); // tira o segredo da tela/memoria
    onConcluido();
  };

  return (
    <form onSubmit={confirmar} className="space-y-4">
      <ol className="text-sm text-slate-600 space-y-1 list-decimal pl-5">
        <li>
          Instale no celular um aplicativo autenticador ({APLICATIVOS}).
        </li>
        <li>No aplicativo, toque em “+” e leia o QR code abaixo (ou digite a chave).</li>
        <li>Digite o código de 6 números que o aplicativo mostrar.</li>
      </ol>
      <Erro texto={erro} />
      {!fator && !erro && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={18} aria-hidden="true" /> Preparando…
        </div>
      )}
      {fator && (
        <>
          <div className="flex justify-center">
            <img
              src={fator.qr}
              alt="QR code para cadastrar o sistema no aplicativo autenticador"
              className="w-48 h-48 border rounded-lg bg-white p-2"
            />
          </div>
          <div className="text-center">
            {verChave ? (
              <p className="text-xs text-slate-500">
                Chave para digitar no aplicativo:
                <span className="block mt-1 font-mono text-sm text-slate-800 break-all select-all">{formatarChave(fator.chave)}</span>
              </p>
            ) : (
              <button type="button" onClick={() => setVerChave(true)} className="text-xs text-[#2A6377] font-medium underline">
                Não consegue ler o QR code? Mostrar a chave para digitar
              </button>
            )}
          </div>
          <CampoCodigo id="mfa-codigo-ativar" valor={codigo} onMudar={setCodigo} />
        </>
      )}
      <p className="text-xs text-slate-500">{AVISO_CELULAR}</p>
      <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="px-4 py-2 rounded-lg border text-slate-600 hover:bg-slate-50 text-sm font-medium"
        >
          {rotuloCancelar}
        </button>
        <button
          type="submit"
          disabled={!fator || enviando}
          className="px-4 py-2 rounded-lg bg-[#2A6377] hover:bg-[#1e4857] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {enviando && <Loader2 className="animate-spin" size={16} aria-hidden="true" />} Ativar
        </button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------------------------ menu do usuario

type Situacao =
  | { tipo: "carregando" }
  | { tipo: "erro"; texto: string }
  | { tipo: "desligada"; exigido: boolean }
  | { tipo: "ligada"; exigido: boolean; idFator: string; desde: string };

export function JanelaDuasEtapas({ onFechar }: { onFechar: () => void }) {
  const [situacao, setSituacao] = useState<Situacao>({ tipo: "carregando" });
  const [modo, setModo] = useState<"ver" | "ativar" | "desativar">("ver");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    setSituacao({ tipo: "carregando" });
    const [{ data, error }, exigido] = await Promise.all([supabase.auth.mfa.listFactors(), mfaExigidoParaMim()]);
    if (error) return setSituacao({ tipo: "erro", texto: mensagemErroMfa(error) });
    const f = fatoresVerificados(data?.all)[0];
    setSituacao(
      f
        ? { tipo: "ligada", exigido, idFator: f.id, desde: new Date(f.created_at).toLocaleDateString("pt-BR") }
        : { tipo: "desligada", exigido },
    );
  };

  useEffect(() => {
    void carregar();
  }, []);

  const desativar = async (e: FormEvent) => {
    e.preventDefault();
    if (situacao.tipo !== "ligada") return;
    if (!codigoCompleto(codigo)) return setErro("Digite os 6 números que aparecem no aplicativo.");
    setEnviando(true);
    setErro("");
    try {
      // confere o codigo antes (quem pegou o computador aberto nao desliga sem o celular)
      const v = await supabase.auth.mfa.challengeAndVerify({ factorId: situacao.idFator, code: limparCodigo(codigo) });
      if (v.error) throw v.error;
      const u = await supabase.auth.mfa.unenroll({ factorId: situacao.idFator });
      if (u.error) throw u.error;
      await supabase.auth.refreshSession(); // a sessao salva passa a saber que nao ha mais aplicativo
      avisar.sucesso("Verificação em duas etapas desativada.");
      setCodigo("");
      setModo("ver");
      await carregar();
    } catch (e2) {
      setCodigo("");
      setErro(mensagemErroMfa(e2));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Verificação em duas etapas" onFechar={onFechar} largura="md">
      <div className="space-y-4 text-sm">
        <p className="text-slate-600">
          Além da senha, o sistema pede um código de 6 números que muda a cada 30 segundos no aplicativo autenticador do seu
          celular. Mesmo que alguém descubra a sua senha, não consegue entrar sem o celular.
        </p>

        {situacao.tipo === "carregando" && (
          <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
            <Loader2 className="animate-spin" size={18} aria-hidden="true" /> Carregando…
          </div>
        )}
        {situacao.tipo === "erro" && <Erro texto={situacao.texto} />}

        {situacao.tipo === "desligada" && modo === "ver" && (
          <>
            <div className="rounded-xl border p-3 flex items-start gap-3">
              <Smartphone size={20} className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-slate-800">Situação: desligada</p>
                <p className="text-slate-500">Você entra só com a senha.</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Aplicativos: {APLICATIVOS}.</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModo("ativar")}
                className="px-4 py-2 rounded-lg bg-[#2A6377] hover:bg-[#1e4857] text-white font-bold"
              >
                Ativar
              </button>
            </div>
          </>
        )}

        {situacao.tipo === "desligada" && modo === "ativar" && (
          <AtivarDuasEtapas
            onConcluido={() => {
              avisar.sucesso("Verificação em duas etapas ativada. Nos próximos acessos o sistema vai pedir o código.");
              setModo("ver");
              void carregar();
            }}
            onCancelar={() => setModo("ver")}
          />
        )}

        {situacao.tipo === "ligada" && (
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-emerald-800">Situação: ligada</p>
                <p className="text-emerald-700">Ativada em {situacao.desde}. O sistema pede o código a cada novo acesso.</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">{AVISO_CELULAR}</p>
            {!podeDesativar({ exigido: situacao.exigido }) ? (
              <p className="text-xs text-slate-500">Para o seu perfil ela é obrigatória e não pode ser desligada.</p>
            ) : modo !== "desativar" ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setErro("");
                    setModo("desativar");
                  }}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 font-medium"
                >
                  Desativar
                </button>
              </div>
            ) : (
              <form onSubmit={desativar} className="space-y-3 border-t pt-3">
                <p className="text-slate-600">Para desativar, digite o código que aparece agora no aplicativo.</p>
                <Erro texto={erro} />
                <CampoCodigo id="mfa-codigo-desativar" valor={codigo} onMudar={setCodigo} />
                <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCodigo("");
                      setModo("ver");
                    }}
                    className="px-4 py-2 rounded-lg border text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {enviando && <Loader2 className="animate-spin" size={16} aria-hidden="true" />} Desativar
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
