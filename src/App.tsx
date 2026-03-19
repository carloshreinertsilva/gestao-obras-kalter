import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Home, Briefcase, Calendar, CheckSquare, AlertCircle, 
  HardHat, Plus, Save, Clock, AlertTriangle, CheckCircle2,
  User, Loader2, Play, Check, Trash2, Users, Edit2, X, LogOut, Mail, KeyRound, Copy, CheckCheck, Bell, Send, CalendarPlus, Menu
} from 'lucide-react';

export default function App() {
  const [sessao, setSessao] = useState<any>(null);
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null); 
  const [carregandoAuth, setCarregandoAuth] = useState<boolean>(true);
  const [erroLogin, setErroLogin] = useState<string>(''); 
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [modoAuth, setModoAuth] = useState<string>('login'); 
  const [emailAuth, setEmailAuth] = useState<string>('');
  const [senhaAuth, setSenhaAuth] = useState<string>('');
  const [nomeAuth, setNomeAuth] = useState<string>(''); 
  const [telaAtiva, setTelaAtiva] = useState<string>('dashboard'); 
  const [carregando, setCarregando] = useState<boolean>(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const [resumoReal, setResumoReal] = useState<any>({ obrasAtivas: 0, tarefasAtrasadas: 0 });
  const [dadosGrafico, setDadosGrafico] = useState<any[]>([]);
  const [listaUsuarios, setListaUsuarios] = useState<any[]>([]);
  const [novoUsuario, setNovoUsuario] = useState<any>({ nome: '', email: '', perfil: 'engenheiro' });
  const [novaObra, setNovaObra] = useState<any>({ id: null, codigo_externo: '', nome: '', data_inicio: '', data_previsao_fim: '', id_responsavel: '' });
  const [erroObra, setErroObra] = useState<string>(''); 
  const [obrasLista, setObrasLista] = useState<any[]>([]);
  const [reuniaoForm, setReuniaoForm] = useState<any>({ id_obra: '', data_reuniao: new Date().toISOString().split('T')[0], clima_semana: 'ensolarado', resumo_geral: '' });
  const [novaOcorrencia, setNovaOcorrencia] = useState<any>({ tipo: 'avanco', descricao: '' });
  const [listaOcorrencias, setListaOcorrencias] = useState<any[]>([]);
  const [novaTarefa, setNovaTarefa] = useState<any>({ titulo: '', data_vencimento: '', id_responsavel: '' });
  const [listaTarefas, setListaTarefas] = useState<any[]>([]);
  const [historicoObra, setHistoricoObra] = useState<any[]>([]);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState<boolean>(false);
  const [detalhesHistorico, setDetalhesHistorico] = useState<any>(null);
  const [ataGerada, setAtaGerada] = useState<string>(''); 
  const [modalAtaAberto, setModalAtaAberto] = useState<boolean>(false);
  const [obrasNaAtaAtual, setObrasNaAtaAtual] = useState<any[]>([]); 
  const [tarefasKanban, setTarefasKanban] = useState<any[]>([]);
  const [filtroObraKanban, setFiltroObraKanban] = useState<string>('todas');
  const [minhasNotificacoes, setMinhasNotificacoes] = useState<any[]>([]);
  const [painelNotificacaoAberto, setPainelNotificacaoAberto] = useState<boolean>(false);
  
  // NOVO: Estado para controlar o Menu Gaveta no Celular
  const [menuMobileAberto, setMenuMobileAberto] = useState<boolean>(false);

  const formatarDataSegura = (dataStr: any) => {
    if (!dataStr) return 'Sem prazo';
    try { const d = new Date(dataStr); if (isNaN(d.getTime())) return 'Data Inválida'; return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) { return 'Data Inválida'; }
  };

  const mostrarAviso = (mensagem: string, tipo: string = 'sucesso') => {
    const id = Date.now(); setToasts(prev => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const agendarNoOutlookWeb = (tarefa: any) => {
    if (!tarefa.data_vencimento) {
      mostrarAviso("Esta tarefa não tem prazo definido para ser agendada.", "erro");
      return;
    }
    const emailResponsavel = listaUsuarios.find((u: any) => u.id === tarefa.id_responsavel)?.email || '';
    const nomeObra = tarefa.obras?.nome || 'Geral';
    const codigoObra = tarefa.obras?.codigo_externo || '';
    const dataVenc = tarefa.data_vencimento; 
    const dataInicial = `${dataVenc}T11:00:00Z`; 
    const dataFinal = `${dataVenc}T12:00:00Z`;   

    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      startdt: dataInicial,
      enddt: dataFinal,
      subject: `Kalter: ${tarefa.titulo}`,
      body: `Obra: ${codigoObra} - ${nomeObra}\n\nGerado pelo Sistema Kalter Gestão de Obras`,
      to: emailResponsavel
    });

    const url = `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSessao(session); if (session) buscarPerfilUsuario(session.user.email); else setCarregandoAuth(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSessao(session); if (session) buscarPerfilUsuario(session.user?.email); else { setUsuarioAtual(null); setCarregandoAuth(false); }});
    return () => subscription.unsubscribe();
  }, []);

  const buscarPerfilUsuario = async (email: any) => {
    try { const { data } = await supabase.from('usuarios').select('*').eq('email', email).single(); if (data) setUsuarioAtual(data);
    } catch (error) { console.error(error); } finally { setCarregandoAuth(false); }
  };

  const processarAuth = async (e: any) => {
    e.preventDefault(); setCarregandoAuth(true); setErroLogin(''); setMensagemSucesso('');
    try {
      if (modoAuth === 'login') { const { error } = await supabase.auth.signInWithPassword({ email: emailAuth, password: senhaAuth }); if (error) throw error;
      } else if (modoAuth === 'cadastro') {
        if (!nomeAuth) throw new Error("Preencha o seu nome.");
        const { data, error } = await supabase.auth.signUp({ email: emailAuth, password: senhaAuth }); if (error) throw error;
        if (data.user) await supabase.from('usuarios').insert([{ nome: nomeAuth, email: emailAuth, perfil: 'engenheiro' }]);
        setMensagemSucesso("Conta criada! Pode entrar."); setModoAuth('login'); setSenhaAuth('');
      } else if (modoAuth === 'recuperar') {
        const { error } = await supabase.auth.resetPasswordForEmail(emailAuth, { redirectTo: window.location.origin }); if (error) throw error;
        setMensagemSucesso("Instruções enviadas."); setModoAuth('login');
      }
    } catch (error: any) {
      if (error.message.includes("Invalid login credentials")) setErroLogin("E-mail ou senha incorretos."); else setErroLogin(error.message);
    } finally { setCarregandoAuth(false); }
  };

  const fazerLogout = async () => { await supabase.auth.signOut(); setTelaAtiva('dashboard'); setEmailAuth(''); setSenhaAuth(''); };
  const isAdmin = usuarioAtual?.perfil === 'admin';

  useEffect(() => {
    async function buscarNotificacoes() {
      if (!usuarioAtual) return;
      try { const { data } = await supabase.from('tarefas').select('id, titulo, data_vencimento, obras(nome, codigo_externo)').eq('id_responsavel', usuarioAtual.id).eq('status', 'pendente').order('created_at', { ascending: false }); if (data) setMinhasNotificacoes(data);
      } catch (error) { console.error(error); }
    } buscarNotificacoes();
  }, [usuarioAtual, telaAtiva]); 

  const buscarUsuarios = async () => {
    try { const { data } = await supabase.from('usuarios').select('id, nome, email, perfil').eq('ativo', true); setListaUsuarios(data || []);
    } catch (error) { console.error(error); }
  };

  const buscarObras = async () => {
    if (!usuarioAtual) return;
    try {
      let query = supabase.from('obras').select('id, codigo_externo, nome, data_inicio, data_previsao_fim, id_responsavel, usuarios(nome)').eq('status', 'em_andamento').order('created_at', { ascending: false });
      if (!isAdmin) query = query.eq('id_responsavel', usuarioAtual.id);
      const { data } = await query; if (data) { setObrasLista(data); if (data.length > 0 && !reuniaoForm.id_obra) setReuniaoForm((prev: any) => ({ ...prev, id_obra: data[0].id })); }
    } catch (error) { console.error(error); }
  };

  useEffect(() => { if (sessao && usuarioAtual) { buscarUsuarios(); buscarObras(); } }, [telaAtiva, sessao, usuarioAtual]);

  useEffect(() => {
    async function buscarDadosDashboard() {
      if (telaAtiva !== 'dashboard' || !usuarioAtual) return;
      try {
        let queryObras = supabase.from('obras').select('*', { count: 'exact', head: true }).eq('status', 'em_andamento');
        let idsMinhasObras: any[] = [];
        if (!isAdmin) {
          queryObras = queryObras.eq('id_responsavel', usuarioAtual.id);
          const { data: obrasUsuario } = await supabase.from('obras').select('id').eq('id_responsavel', usuarioAtual.id); idsMinhasObras = obrasUsuario?.map(o => o.id) || [];
        }
        let queryTarefas = supabase.from('tarefas').select('*', { count: 'exact', head: true }).neq('status', 'concluida').lt('data_vencimento', new Date().toISOString());
        let queryGrafico = supabase.from('tarefas').select('status, obras!inner(nome)');
        if (!isAdmin) {
          if (idsMinhasObras.length > 0) { const condicao = `id_responsavel.eq.${usuarioAtual.id},id_obra.in.(${idsMinhasObras.join(',')})`; queryTarefas = queryTarefas.or(condicao); queryGrafico = queryGrafico.or(condicao);
          } else { queryTarefas = queryTarefas.eq('id_responsavel', usuarioAtual.id); queryGrafico = queryGrafico.eq('id_responsavel', usuarioAtual.id); }
        }
        const [{ count: obrasCount }, { count: atrasadasCount }] = await Promise.all([queryObras, queryTarefas]);
        setResumoReal({ obrasAtivas: obrasCount || 0, tarefasAtrasadas: atrasadasCount || 0 });
        const { data: tarefasGrafico } = await queryGrafico;
        if (tarefasGrafico) {
          const mapaGrafico: any = {};
          tarefasGrafico.forEach((t: any) => {
            const nomeObra = t.obras?.nome || 'Sem Obra';
            if (!mapaGrafico[nomeObra]) mapaGrafico[nomeObra] = { nome: nomeObra, tarefas_concluidas: 0, tarefas_pendentes: 0 };
            if (t.status === 'concluida') mapaGrafico[nomeObra].tarefas_concluidas++; else mapaGrafico[nomeObra].tarefas_pendentes++;
          }); setDadosGrafico(Object.values(mapaGrafico));
        }
      } catch (error) { console.error(error); }
    } buscarDadosDashboard();
  }, [telaAtiva, usuarioAtual]);

  useEffect(() => {
    async function buscarHistorico() {
      if (!reuniaoForm.id_obra || telaAtiva !== 'reunioes') return;
      try {
        const { data, error } = await supabase.from('reunioes').select(`id, data_reuniao, clima_semana, resumo_geral, ocorrencias(tipo, descricao), tarefas(titulo, data_vencimento, id_responsavel, usuarios(nome))`).eq('id_obra', reuniaoForm.id_obra).order('data_reuniao', { ascending: false });
        if (error) throw error;
        const historicoAgrupado = data.reduce((acc: any, curr: any) => {
          const dataFormatada = formatarDataSegura(curr.data_reuniao);
          if (!acc[dataFormatada]) acc[dataFormatada] = { dataFormatada, resumos: [], ocorrencias: [], tarefas: [] };
          if (curr.resumo_geral) acc[dataFormatada].resumos.push({ clima: curr.clima_semana, texto: curr.resumo_geral });
          if (curr.ocorrencias?.length > 0) acc[dataFormatada].ocorrencias.push(...curr.ocorrencias);
          if (curr.tarefas?.length > 0) acc[dataFormatada].tarefas.push(...curr.tarefas);
          return acc;
        }, {}); setHistoricoObra(Object.values(historicoAgrupado));
      } catch (error) { console.error(error); }
    } buscarHistorico();
  }, [reuniaoForm.id_obra, telaAtiva]);

  const buscarTarefasKanban = async () => {
    if (!usuarioAtual) return;
    try {
      let query = supabase.from('tarefas').select(`id, id_obra, titulo, status, data_vencimento, id_responsavel, obras!inner(codigo_externo, nome, id_responsavel), usuarios(nome)`).order('created_at', { ascending: false });
      if (!isAdmin) {
        const { data: obrasUsuario } = await supabase.from('obras').select('id').eq('id_responsavel', usuarioAtual.id);
        const idsMinhasObras = obrasUsuario?.map(o => o.id) || [];
        if (idsMinhasObras.length > 0) query = query.or(`id_responsavel.eq.${usuarioAtual.id},id_obra.in.(${idsMinhasObras.join(',')})`); else query = query.eq('id_responsavel', usuarioAtual.id);
      }
      const { data, error } = await query; if (error) throw error; setTarefasKanban(data || []);
    } catch (error) { console.error(error); }
  };
  useEffect(() => { if (telaAtiva === 'tarefas') buscarTarefasKanban(); }, [telaAtiva, usuarioAtual]);

  async function salvarUsuario(e: any) {
    e.preventDefault(); setCarregando(true);
    try { const { error } = await supabase.from('usuarios').insert([{ nome: novoUsuario.nome, email: novoUsuario.email, perfil: novoUsuario.perfil }]); if (error) throw error; mostrarAviso('Registado com sucesso!'); setNovoUsuario({ nome: '', email: '', perfil: 'engenheiro' }); buscarUsuarios(); 
    } catch (error: any) { mostrarAviso(error.message, 'erro'); } finally { setCarregando(false); }
  }

  async function salvarObra(e: any) {
    e.preventDefault(); setErroObra(''); 
    if (!novaObra.codigo_externo || !novaObra.nome || !novaObra.data_inicio || !novaObra.data_previsao_fim || !novaObra.id_responsavel) { setErroObra('Todos os campos obrigatórios.'); return; }
    setCarregando(true);
    try {
      const dadosObra = { codigo_externo: novaObra.codigo_externo, nome: novaObra.nome, data_inicio: novaObra.data_inicio, data_previsao_fim: novaObra.data_previsao_fim, id_responsavel: novaObra.id_responsavel, status: 'em_andamento' };
      if (novaObra.id) { const { error } = await supabase.from('obras').update(dadosObra).eq('id', novaObra.id); if (error) throw error; mostrarAviso('Obra atualizada!'); } 
      else { const { error } = await supabase.from('obras').insert([dadosObra]); if (error) throw error; mostrarAviso('Obra salva!'); }
      setNovaObra({ id: null, codigo_externo: '', nome: '', data_inicio: '', data_previsao_fim: '', id_responsavel: '' }); buscarObras(); 
    } catch (error: any) { setErroObra('Erro: ' + error.message); } finally { setCarregando(false); }
  }
  const editarObra = (obra: any) => { setNovaObra({ id: obra.id, codigo_externo: obra.codigo_externo, nome: obra.nome, data_inicio: obra.data_inicio, data_previsao_fim: obra.data_previsao_fim, id_responsavel: obra.id_responsavel }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelarEdicaoObra = () => { setNovaObra({ id: null, codigo_externo: '', nome: '', data_inicio: '', data_previsao_fim: '', id_responsavel: '' }); setErroObra(''); };

  const atualizarStatusTarefa = async (idTarefa: any, novoStatus: any) => { try { await supabase.from('tarefas').update({ status: novoStatus }).eq('id', idTarefa); buscarTarefasKanban(); mostrarAviso('Status atualizado!'); } catch (error: any) { mostrarAviso(error.message, 'erro'); } };

  const adicionarOcorrencia = () => { if (!novaOcorrencia.descricao) return; setListaOcorrencias([...listaOcorrencias, novaOcorrencia]); setNovaOcorrencia({ tipo: 'avanco', descricao: '' }); };
  const adicionarTarefa = () => { if (!novaTarefa.titulo || !novaTarefa.id_responsavel) return mostrarAviso("Preencha título e responsável.", "erro"); const nomeResp = listaUsuarios.find(u => u.id === novaTarefa.id_responsavel)?.nome || ''; setListaTarefas([...listaTarefas, { ...novaTarefa, nome_responsavel: nomeResp }]); setNovaTarefa({ titulo: '', data_vencimento: '', id_responsavel: '' }); };

  async function salvarReuniaoObra() {
    if (!reuniaoForm.id_obra) return mostrarAviso('Selecione uma obra.', 'erro');
    setCarregando(true);
    try {
      const obraSelecionada = obrasLista.find(o => o.id === reuniaoForm.id_obra);
      const responsavel = listaUsuarios.find(u => u.id === obraSelecionada.id_responsavel);
      
      const { data: reuniaoSalva, error: errReuniao } = await supabase.from('reunioes').insert([{ id_obra: reuniaoForm.id_obra, data_reuniao: reuniaoForm.data_reuniao, clima_semana: reuniaoForm.clima_semana, resumo_geral: reuniaoForm.resumo_geral }]).select().single();
      if (errReuniao) throw errReuniao;

      if (listaOcorrencias.length > 0) await supabase.from('ocorrencias').insert(listaOcorrencias.map(o => ({ id_reuniao: reuniaoSalva.id, tipo: o.tipo, descricao: o.descricao })));
      if (listaTarefas.length > 0) await supabase.from('tarefas').insert(listaTarefas.map(t => ({ id_obra: reuniaoForm.id_obra, id_reuniao_origem: reuniaoSalva.id, titulo: t.titulo, data_vencimento: t.data_vencimento || null, id_responsavel: t.id_responsavel, status: 'pendente' })));
      
      const registroObraAta = {
        nome_obra: obraSelecionada ? `${obraSelecionada.codigo_externo} - ${obraSelecionada.nome}` : 'Obra Não Identificada',
        email_responsavel: responsavel?.email || '',
        clima: reuniaoForm.clima_semana, resumo: reuniaoForm.resumo_geral, ocorrencias: [...listaOcorrencias], tarefas: [...listaTarefas]
      };
      setObrasNaAtaAtual((prev: any) => [...prev, registroObraAta]);

      mostrarAviso(`${obraSelecionada?.nome || 'Obra'} salva! Vá para a próxima.`);
      setReuniaoForm((prev: any) => ({ ...prev, id_obra: '', resumo_geral: '' })); setListaOcorrencias([]); setListaTarefas([]);
      setTelaAtiva('dashboard'); setTimeout(() => setTelaAtiva('reunioes'), 50);
    } catch (error: any) { mostrarAviso('Erro: ' + error.message, 'erro'); } finally { setCarregando(false); }
  }

  const gerarAtaFinal = () => {
    if (obrasNaAtaAtual.length === 0) return mostrarAviso("Você não salvou obras.", "erro");
    const dataHj = formatarDataSegura(reuniaoForm.data_reuniao); let textoAta = `ATA DE REUNIÃO DE OBRAS - KALTER\nData: ${dataHj}\n\n`;
    obrasNaAtaAtual.forEach(obra => {
      textoAta += `==========================================\nOBRA: ${obra.nome_obra.toUpperCase()}\n==========================================\nClima: ${obra.clima.charAt(0).toUpperCase() + obra.clima.slice(1)}\n`;
      if (obra.resumo) textoAta += `Resumo: ${obra.resumo}\n\n`;
      if (obra.ocorrencias.length > 0) { textoAta += `[ Ocorrências ]\n`; obra.ocorrencias.forEach((oc: any) => textoAta += `- (${oc.tipo.toUpperCase()}): ${oc.descricao}\n`); textoAta += `\n`; }
      if (obra.tarefas.length > 0) { textoAta += `[ Tarefas ]\n`; obra.tarefas.forEach((t: any) => textoAta += `- ${t.titulo} (Resp: ${t.nome_responsavel} | Prazo: ${formatarDataSegura(t.data_vencimento)})\n`); textoAta += `\n`; }
      textoAta += `\n`;
    }); setAtaGerada(textoAta); setModalAtaAberto(true);
  };

  const enviarPorEmailAplicativo = () => {
    const emailsAdmins = listaUsuarios.filter(u => u.perfil === 'admin').map(u => u.email);
    const emailsResponsaveis = obrasNaAtaAtual.map(ob => ob.email_responsavel).filter(Boolean);
    const destinatarios = [...new Set([...emailsAdmins, ...emailsResponsaveis])].join(',');
    const assunto = encodeURIComponent(`Ata de Reunião de Obras - ${formatarDataSegura(new Date().toISOString())}`);
    const corpo = encodeURIComponent(ataGerada);
    window.location.href = `mailto:${destinatarios}?subject=${assunto}&body=${corpo}`;
    setModalAtaAberto(false); setObrasNaAtaAtual([]);
  };

  const copiarAta = () => { navigator.clipboard.writeText(ataGerada); mostrarAviso("Ata copiada!"); };
  const isAtrasada = (dataVencimento: any, status: any) => { if (!dataVencimento || status === 'concluida') return false; return dataVencimento < new Date().toISOString().split('T')[0]; };
  const tarefasFiltradas = filtroObraKanban === 'todas' ? (tarefasKanban || []) : (tarefasKanban || []).filter(t => t?.id_obra === filtroObraKanban);

  if (carregandoAuth) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-[#2A6377]" size={48} /></div>;

  if (!sessao) {
    return (
      <div className="flex h-screen bg-slate-100 items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
          <div className="bg-[#2A6377] p-6 md:p-8 text-center flex flex-col items-center justify-center border-b border-[#1e4857]">
            <img src="/logo.png" alt="Kalter Logo" className="max-h-16 w-auto object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <h1 className="text-4xl font-bold text-white hidden">Kalter</h1>
            <p className="text-white/80 font-medium tracking-wide uppercase text-xs mt-2">Gestão de Obras</p>
          </div>
          <div className="p-6 md:p-8">
            {erroLogin && (<div className="mb-6 bg-red-50 border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm font-medium"><AlertTriangle size={20} className="shrink-0 mt-0.5" /><span>{erroLogin}</span></div>)}
            {mensagemSucesso && (<div className="mb-6 bg-green-50 border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm font-medium"><CheckCircle2 size={20} className="shrink-0 mt-0.5" /><span>{mensagemSucesso}</span></div>)}
            <div className="flex border-b border-slate-200 mb-6"><button onClick={() => { setModoAuth('login'); setErroLogin(''); }} className={`flex-1 pb-3 text-sm font-bold transition ${modoAuth === 'login' ? 'border-b-2 border-[#2A6377] text-[#2A6377]' : 'text-slate-400'}`}>Entrar</button><button onClick={() => { setModoAuth('cadastro'); setErroLogin(''); }} className={`flex-1 pb-3 text-sm font-bold transition ${modoAuth === 'cadastro' ? 'border-b-2 border-[#2A6377] text-[#2A6377]' : 'text-slate-400'}`}>Criar Conta</button></div>
            <form onSubmit={processarAuth} className="space-y-4">
              {modoAuth === 'cadastro' && (<div><label className="block text-sm font-medium mb-1">Nome</label><div className="relative"><User size={18} className="absolute left-3 top-3 text-slate-400" /><input required type="text" value={nomeAuth} onChange={e => setNomeAuth(e.target.value)} className="w-full border rounded-lg py-3 pl-10 pr-3 outline-none focus:border-[#2A6377]" /></div></div>)}
              <div><label className="block text-sm font-medium mb-1">E-mail</label><div className="relative"><Mail size={18} className="absolute left-3 top-3 text-slate-400" /><input required type="email" value={emailAuth} onChange={e => setEmailAuth(e.target.value)} className="w-full border rounded-lg py-3 pl-10 pr-3 outline-none focus:border-[#2A6377]" /></div></div>
              {modoAuth !== 'recuperar' && (<div><div className="flex justify-between mb-1"><label className="block text-sm font-medium">Senha</label>{modoAuth === 'login' && <button type="button" onClick={() => setModoAuth('recuperar')} className="text-xs text-[#2A6377]">Esqueceu?</button>}</div><div className="relative"><KeyRound size={18} className="absolute left-3 top-3 text-slate-400" /><input required type="password" value={senhaAuth} onChange={e => setSenhaAuth(e.target.value)} className="w-full border rounded-lg py-3 pl-10 pr-3 outline-none focus:border-[#2A6377]" /></div></div>)}
              <button type="submit" disabled={carregandoAuth} className="w-full bg-[#2A6377] hover:bg-[#1e4857] text-white p-3 rounded-lg font-bold flex justify-center items-center mt-6 disabled:opacity-50">{carregandoAuth ? <Loader2 className="animate-spin" size={18} /> : (<>{modoAuth === 'login' && 'Entrar'}{modoAuth === 'cadastro' && 'Cadastrar'}{modoAuth === 'recuperar' && 'Recuperar'}</>)}</button>
              {modoAuth === 'recuperar' && (<button type="button" onClick={() => setModoAuth('login')} className="w-full text-slate-500 text-sm font-medium mt-2">Voltar</button>)}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans relative overflow-hidden flex-col md:flex-row">
      <div className="fixed bottom-6 right-6 z-[80] flex flex-col gap-3">{toasts.map(toast => (<div key={toast.id} className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg text-white font-medium ${toast.tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.tipo === 'sucesso' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />} {toast.mensagem}</div>))}</div>
      
      {/* ================= HEADER MOBILE ================= */}
      <div className="md:hidden bg-[#2A6377] text-white p-4 flex justify-between items-center shadow-md z-30">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Kalter" className="h-8 w-auto object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <span className="font-bold text-xl hidden">Kalter</span>
        </div>
        <button onClick={() => setMenuMobileAberto(true)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
          <Menu size={24} />
        </button>
      </div>

      {/* ================= OVERLAY MOBILE ================= */}
      {menuMobileAberto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[40] md:hidden" onClick={() => setMenuMobileAberto(false)} />
      )}

      {/* ================= MODAIS ================= */}
      {modalHistoricoAberto && detalhesHistorico && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-bold flex items-center gap-2"><Clock className="text-[#2A6377]"/> Dia {detalhesHistorico.dataFormatada}</h2><button onClick={() => setModalHistoricoAberto(false)} className="text-slate-400 hover:text-red-500"><X size={24}/></button></div>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-6">
              {detalhesHistorico.resumos.length > 0 && (<div><h4 className="font-bold mb-3 border-b">Resumos</h4><div className="space-y-3">{detalhesHistorico.resumos.map((res: any, i: number) => (<div key={i} className="bg-slate-50 p-4 rounded-lg border"><p className="text-xs font-bold text-slate-400 uppercase mb-2">Clima: {res.clima}</p><p className="text-sm whitespace-pre-wrap">{res.texto}</p></div>))}</div></div>)}
              {detalhesHistorico.ocorrencias.length > 0 && (<div><h4 className="font-bold mb-3 border-b">Ocorrências</h4><div className="space-y-2">{detalhesHistorico.ocorrencias.map((oc: any, i: number) => (<div key={i} className="bg-slate-50 p-3 rounded border text-sm"><span className="font-bold text-[#2A6377] uppercase mr-2">{oc.tipo}:</span> {oc.descricao}</div>))}</div></div>)}
              {detalhesHistorico.tarefas.length > 0 && (<div><h4 className="font-bold mb-3 border-b">Tarefas</h4><div className="space-y-2">{detalhesHistorico.tarefas.map((tar: any, i: number) => (<div key={i} className="bg-slate-50 p-3 rounded border text-sm flex justify-between items-center"><span className="font-medium">{tar.titulo}</span><div className="flex gap-2 text-xs text-slate-500"><span className="bg-white px-2 py-1 rounded"><User size={12} className="inline"/> {tar.usuarios?.nome || 'Geral'}</span><span className="bg-white px-2 py-1 rounded"><Clock size={12} className="inline"/> {formatarDataSegura(tar.data_vencimento)}</span></div></div>))}</div></div>)}
            </div>
          </div>
        </div>
      )}

      {painelNotificacaoAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[75] flex justify-end">
          <div className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col"><div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl font-bold flex items-center gap-2"><Bell className="text-[#2A6377]"/> Tarefas</h2><button onClick={() => setPainelNotificacaoAberto(false)}><X size={24}/></button></div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
              {minhasNotificacoes.length === 0 ? (<div className="text-center mt-10 text-slate-500"><CheckCircle2 size={48} className="mx-auto mb-3 text-slate-300"/> Tudo em dia!</div>) : (
                <div className="space-y-4">{minhasNotificacoes.map(notif => (
                  <div key={notif.id} className="bg-white p-4 rounded-xl border border-l-4 border-l-[#2A6377]">
                    <span className="text-[10px] font-bold text-[#2A6377] uppercase bg-[#2A6377]/10 px-2 py-1 rounded inline-block mb-2">{notif.obras?.codigo_externo || 'Obra'}</span>
                    <p className="font-semibold text-sm mb-3">{notif.titulo}</p>
                    <div className="flex flex-col gap-3 text-xs border-t pt-3 mt-2">
                      <span className={`flex items-center gap-1 ${isAtrasada(notif.data_vencimento, 'pendente') ? 'text-red-600 font-bold' : 'text-slate-500'}`}><Clock size={12}/> Prazo: {formatarDataSegura(notif.data_vencimento)}</span>
                      <div className="flex gap-3 justify-end mt-1">
                        {notif.data_vencimento && <button onClick={() => agendarNoOutlookWeb(notif)} className="text-[#2A6377] bg-[#2A6377]/10 px-3 py-1.5 rounded hover:bg-[#2A6377]/20 font-medium flex items-center gap-1 transition"><CalendarPlus size={14}/> Agendar</button>}
                        <button onClick={() => { setTelaAtiva('tarefas'); setPainelNotificacaoAberto(false); }} className="text-white bg-[#2A6377] px-3 py-1.5 rounded hover:bg-[#1e4857] font-medium transition">Acessar</button>
                      </div>
                    </div>
                  </div>
                ))}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {modalAtaAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Mail className="text-[#2A6377]"/> Resumo da Ata</h2><button onClick={() => setModalAtaAberto(false)}><X size={24}/></button></div>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-slate-50"><pre className="text-sm font-mono whitespace-pre-wrap">{ataGerada}</pre></div>
            <div className="p-4 md:p-6 border-t border-gray-100 flex flex-wrap justify-end gap-3"><button onClick={() => setModalAtaAberto(false)} className="px-6 py-2 rounded-lg font-medium bg-slate-100 flex-1 md:flex-none">Fechar</button><button onClick={copiarAta} className="bg-slate-200 px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 flex-1 md:flex-none"><Copy size={18}/> Copiar</button><button onClick={enviarPorEmailAplicativo} className="bg-[#2A6377] text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 flex-1 md:flex-none w-full md:w-auto"><Send size={18}/> Abrir no E-mail</button></div>
          </div>
        </div>
      )}

      {/* ================= MENU LATERAL ================= */}
      <aside className={`fixed inset-y-0 left-0 z-[50] w-64 bg-[#2A6377] text-white flex flex-col shadow-2xl transition-transform duration-300 md:relative md:translate-x-0 ${menuMobileAberto ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center relative">
            <button onClick={() => setMenuMobileAberto(false)} className="md:hidden absolute top-4 right-4 text-white/70 hover:text-white p-1"><X size={24} /></button>
            <img src="/logo.png" alt="Kalter Logo" className="max-h-12 w-auto mb-2 object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <h1 className="text-2xl font-bold text-white hidden">Kalter</h1>
            <p className="text-xs text-white/80 tracking-wider font-medium uppercase mt-1">Gestão de Obras</p>
          </div>
          <nav className="p-4 space-y-2">
            <button onClick={() => { setTelaAtiva('dashboard'); setMenuMobileAberto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === 'dashboard' ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}><Home size={20} /> Dashboard</button>
            {isAdmin && <button onClick={() => { setTelaAtiva('equipe'); setMenuMobileAberto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === 'equipe' ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}><Users size={20} /> Equipe</button>}
            <button onClick={() => { setTelaAtiva('obras'); setMenuMobileAberto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === 'obras' ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}><HardHat size={20} /> Obras</button>
            <button onClick={() => { setTelaAtiva('reunioes'); setMenuMobileAberto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === 'reunioes' ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}><Calendar size={20} /> Reuniões</button>
            <button onClick={() => { setTelaAtiva('tarefas'); setMenuMobileAberto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === 'tarefas' ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}><CheckSquare size={20} /> Tarefas</button>
            <div className="pt-4 mt-2 border-t border-white/10"><button onClick={() => { setPainelNotificacaoAberto(true); setMenuMobileAberto(false); }} className="w-full flex items-center justify-between p-3 rounded-lg transition hover:bg-white/10 text-white/80 hover:text-white"><div className="flex items-center gap-3"><Bell size={20} className={minhasNotificacoes.length > 0 ? "text-amber-300" : ""} /> Tarefas</div>{minhasNotificacoes.length > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 rounded-full animate-pulse">{minhasNotificacoes.length}</span>}</button></div>
          </nav>
        </div>
        <div className="p-4 border-t border-white/10"><div className="flex items-center gap-3 mb-4 px-2"><div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold"><User size={16}/></div><div className="overflow-hidden"><p className="text-sm font-medium truncate">{usuarioAtual?.nome}</p><p className="text-xs text-white/60 uppercase">{usuarioAtual?.perfil}</p></div></div><button onClick={fazerLogout} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"><LogOut size={18} /> Sair</button></div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
        {telaAtiva === 'dashboard' && (
          <div className="animate-in fade-in">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Visão Geral {isAdmin ? '(Todas)' : '(Minhas)'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8"><div className="bg-white p-4 md:p-6 rounded-xl shadow-sm flex items-center gap-4"><div className="p-4 bg-[#2A6377]/10 text-[#2A6377] rounded-lg"><Briefcase size={24} /></div><div><p className="text-sm text-gray-500 font-medium">Obras Ativas</p><p className="text-2xl md:text-3xl font-bold text-[#2A6377]">{resumoReal.obrasAtivas}</p></div></div><div className="bg-white p-4 md:p-6 rounded-xl shadow-sm flex items-center gap-4"><div className="p-4 bg-red-100 text-red-600 rounded-lg"><AlertCircle size={24} /></div><div><p className="text-sm text-gray-500 font-medium">Tarefas Atrasadas</p><p className="text-2xl md:text-3xl font-bold text-red-600">{resumoReal.tarefasAtrasadas}</p></div></div></div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold mb-6">Status Real das Tarefas por Obra</h3>
              <div className="h-64 md:h-80 w-full">
                {dadosGrafico.length === 0 ? (<div className="h-full flex items-center justify-center text-gray-400">Nenhuma tarefa.</div>) : (<ResponsiveContainer width="100%" height="100%"><BarChart data={dadosGrafico}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" /><XAxis dataKey="nome" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip cursor={{fill: '#f3f4f6'}} /><Bar dataKey="tarefas_concluidas" name="Concluídas" fill="#22c55e" radius={[4, 4, 0, 0]} /><Bar dataKey="tarefas_pendentes" name="Pendentes" fill="#f87171" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>)}
              </div>
            </div>
          </div>
        )}

        {telaAtiva === 'equipe' && isAdmin && (
          <div className="animate-in fade-in max-w-4xl"><h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Equipe</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"><form onSubmit={salvarUsuario} className="bg-white p-4 md:p-6 rounded-xl shadow-sm h-fit"><h3 className="text-lg font-bold mb-4 border-b pb-2">Novo Colaborador</h3><div className="space-y-4"><div><label className="block text-sm mb-1">Nome</label><input required type="text" value={novoUsuario.nome} onChange={(e) => setNovoUsuario({...novoUsuario, nome: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]" /></div><div><label className="block text-sm mb-1">E-mail</label><input required type="email" value={novoUsuario.email} onChange={(e) => setNovoUsuario({...novoUsuario, email: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]" /></div><div><label className="block text-sm mb-1">Perfil</label><select value={novoUsuario.perfil} onChange={(e) => setNovoUsuario({...novoUsuario, perfil: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"><option value="engenheiro">Engenheiro/Gestor</option><option value="admin">Administrador</option></select></div></div><div className="flex justify-end pt-6"><button type="submit" className="bg-[#2A6377] text-white px-6 py-2 rounded-lg font-medium"><Plus size={18} className="inline mr-2"/> Adicionar</button></div></form><div className="bg-white p-4 md:p-6 rounded-xl shadow-sm"><h3 className="text-lg font-bold mb-4 border-b pb-2">Registados</h3><div className="space-y-3">{listaUsuarios.map(user => (<div key={user.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg"><div className={`p-2 rounded-full text-white ${user.perfil === 'admin' ? 'bg-[#2A6377]' : 'bg-[#2A6377]/60'}`}><User size={16} /></div><div className="overflow-hidden"><p className="font-bold text-sm truncate">{user.nome} <span className="text-[10px] ml-2 px-2 py-0.5 bg-gray-200 rounded uppercase inline-block">{user.perfil}</span></p><p className="text-xs text-slate-500 truncate">{user.email}</p></div></div>))}</div></div></div></div>
        )}

        {telaAtiva === 'obras' && (
          <div className="animate-in fade-in max-w-5xl"><h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Obras</h2>
            {isAdmin && (<form onSubmit={salvarObra} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6 md:mb-8"><div className="flex justify-between items-center mb-6 border-b pb-2"><h3 className="text-xl font-bold">{novaObra.id ? 'Editar Obra' : 'Nova Obra'}</h3>{novaObra.id && (<button type="button" onClick={cancelarEdicaoObra} className="text-gray-500 flex items-center gap-1 text-sm"><X size={16} /> Cancelar</button>)}</div>{erroObra && (<div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3"><AlertTriangle size={20} /> <span className="text-sm">{erroObra}</span></div>)}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6"><div><label className="block text-sm mb-1">Código *</label><input type="text" value={novaObra.codigo_externo} onChange={(e) => setNovaObra({...novaObra, codigo_externo: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377]" /></div><div><label className="block text-sm mb-1">Nome *</label><input type="text" value={novaObra.nome} onChange={(e) => setNovaObra({...novaObra, nome: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377]" /></div><div><label className="block text-sm mb-1">Início *</label><input type="date" value={novaObra.data_inicio} onChange={(e) => setNovaObra({...novaObra, data_inicio: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377]" /></div><div><label className="block text-sm mb-1">Fim *</label><input type="date" value={novaObra.data_previsao_fim} onChange={(e) => setNovaObra({...novaObra, data_previsao_fim: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377]" /></div><div className="md:col-span-2"><label className="block text-sm mb-1">Responsável *</label><select value={novaObra.id_responsavel} onChange={(e) => setNovaObra({...novaObra, id_responsavel: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377]"><option value="">Selecione...</option>{listaUsuarios.map(user => (<option key={user.id} value={user.id}>{user.nome}</option>))}</select></div></div><div className="flex justify-end pt-4 border-t"><button type="submit" disabled={carregando} className="bg-[#2A6377] text-white px-6 py-3 rounded-lg font-medium w-full md:w-auto"><Save size={20} className="inline mr-2"/> Salvar</button></div></form>)}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold mb-4 border-b pb-2">{isAdmin ? 'Todas' : 'Minhas'}</h3>
              {obrasLista.length === 0 ? (<p className="text-gray-500 text-sm">Nenhuma obra.</p>) : (
                <div className="overflow-x-auto pb-2">
                  <table className="w-full text-left border-collapse min-w-[600px]"><thead><tr className="bg-slate-50 text-slate-600 text-sm border-y"><th className="p-3">Código</th><th className="p-3">Nome</th><th className="p-3">Responsável</th><th className="p-3">Fim</th>{isAdmin && <th className="p-3 text-right">Ação</th>}</tr></thead><tbody className="text-sm">{obrasLista.map(obra => (<tr key={obra.id} className="border-b hover:bg-slate-50"><td className="p-3 text-slate-700">{obra.codigo_externo}</td><td className="p-3 font-bold text-[#2A6377]">{obra.nome}</td><td className="p-3 text-slate-600">{obra.usuarios?.nome}</td><td className="p-3 text-slate-600">{formatarDataSegura(obra.data_previsao_fim)}</td>{isAdmin && (<td className="p-3 text-right"><button onClick={() => editarObra(obra)} className="text-slate-400 hover:text-[#2A6377] p-2"><Edit2 size={16} /></button></td>)}</tr>))}</tbody></table>
                </div>
              )}
            </div>
          </div>
        )}

        {telaAtiva === 'reunioes' && (
           <div className="animate-in fade-in"><div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border mb-6 border-l-4 border-l-[#2A6377]"><div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div className="flex-1"><label className="block text-sm font-medium mb-2">1. Selecione a Obra</label><select className="w-full max-w-lg border rounded-lg p-3 outline-none font-bold bg-gray-50" value={reuniaoForm.id_obra} onChange={(e) => setReuniaoForm({...reuniaoForm, id_obra: e.target.value})}><option value="">A carregar...</option>{obrasLista.map(obra => (<option key={obra.id} value={obra.id}>{obra.codigo_externo} - {obra.nome}</option>))}</select></div><div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto"><button onClick={salvarReuniaoObra} disabled={carregando || !reuniaoForm.id_obra} className="bg-[#2A6377]/10 text-[#2A6377] px-6 py-3 rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50 flex-1">{carregando ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Salvar</button><button onClick={gerarAtaFinal} disabled={obrasNaAtaAtual.length === 0} className="bg-[#2A6377] text-white px-6 py-3 rounded-lg font-bold flex justify-center items-center gap-2 shadow-md disabled:opacity-50 flex-1"><Mail size={18} /> Gerar Ata</button></div></div>{obrasNaAtaAtual.length > 0 && (<div className="mt-6 pt-4 border-t flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-gray-500 mr-2">Salvas hoje:</span>{obrasNaAtaAtual.map((ob, idx) => (<span key={idx} className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><CheckCheck size={12}/> {ob.nome_obra}</span>))}</div>)}</div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 space-y-6">
                 <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border"><h3 className="text-lg font-bold mb-4 border-b pb-2">2. Resumo</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"><div><label className="block text-sm mb-1">Data</label><input type="date" className="w-full border rounded-lg p-2 outline-none" value={reuniaoForm.data_reuniao} onChange={(e) => setReuniaoForm({...reuniaoForm, data_reuniao: e.target.value})}/></div><div><label className="block text-sm mb-1">Clima</label><select className="w-full border rounded-lg p-2 outline-none" value={reuniaoForm.clima_semana} onChange={(e) => setReuniaoForm({...reuniaoForm, clima_semana: e.target.value})}><option value="chuvoso">Chuvoso</option><option value="ensolarado">Ensolarado</option><option value="misto">Misto</option></select></div></div><div><label className="block text-sm mb-1">Resumo Geral</label><textarea rows={3} className="w-full border rounded-lg p-3 outline-none" value={reuniaoForm.resumo_geral} onChange={(e) => setReuniaoForm({...reuniaoForm, resumo_geral: e.target.value})}></textarea></div></div>
                 <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border"><h3 className="text-lg font-bold mb-4 border-b pb-2">3. Ocorrências</h3><div className="flex flex-col sm:flex-row gap-3 mb-4"><select className="border rounded-lg p-2 w-full sm:w-1/4 outline-none" value={novaOcorrencia.tipo} onChange={e => setNovaOcorrencia({...novaOcorrencia, tipo: e.target.value})}><option value="avanco">Avanço</option><option value="atraso">Atraso</option><option value="financeiro">Financeiro</option></select><input type="text" className="border rounded-lg p-2 w-full flex-1 outline-none" placeholder="Ex: Chegou o material..." value={novaOcorrencia.descricao} onChange={e => setNovaOcorrencia({...novaOcorrencia, descricao: e.target.value})} onKeyPress={e => e.key === 'Enter' && adicionarOcorrencia()}/><button onClick={adicionarOcorrencia} className="bg-slate-100 px-4 py-2 rounded-lg font-medium w-full sm:w-auto">Add</button></div>{listaOcorrencias.map((oc, idx) => (<div key={idx} className="flex justify-between items-center bg-slate-50 p-2 mt-2 rounded border text-sm"><div><span className="font-semibold text-[#2A6377] capitalize">{oc.tipo}:</span> {oc.descricao}</div><button onClick={() => setListaOcorrencias(listaOcorrencias.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 ml-2"><Trash2 size={16} /></button></div>))}</div>
                 <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border"><h3 className="text-lg font-bold mb-4 border-b pb-2">4. Gerar Tarefas</h3><div className="flex flex-col sm:flex-row gap-3 mb-3"><input type="text" className="border rounded-lg p-2 flex-1 outline-none w-full" placeholder="O que precisa ser feito..." value={novaTarefa.titulo} onChange={e => setNovaTarefa({...novaTarefa, titulo: e.target.value})} /><input type="date" className="border rounded-lg p-2 w-full sm:w-1/3 outline-none" value={novaTarefa.data_vencimento} onChange={e => setNovaTarefa({...novaTarefa, data_vencimento: e.target.value})} /></div><div className="flex flex-col sm:flex-row gap-3 mb-4"><select className="border rounded-lg p-2 flex-1 outline-none w-full" value={novaTarefa.id_responsavel} onChange={e => setNovaTarefa({...novaTarefa, id_responsavel: e.target.value})}><option value="">Atribuir a...</option>{listaUsuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select><button onClick={adicionarTarefa} className="bg-slate-100 px-6 py-2 rounded-lg font-medium w-full sm:w-auto">Adicionar</button></div>{listaTarefas.map((tar, idx) => (<div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 p-3 mt-2 rounded border text-sm gap-2"><div><span className="font-semibold block">{tar.titulo}</span><div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1"><span className="flex items-center gap-1"><User size={12}/> {tar.nome_responsavel}</span>{tar.data_vencimento && <span className="flex items-center gap-1"><Clock size={12}/> {formatarDataSegura(tar.data_vencimento)}</span>}</div></div><button onClick={() => setListaTarefas(listaTarefas.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 bg-white p-2 rounded shadow-sm border self-end sm:self-auto"><Trash2 size={16} /></button></div>))}</div>
               </div>
               <div className="bg-slate-50 p-4 md:p-6 rounded-xl border"><h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Clock size={20} className="text-slate-500" /> Histórico Atual</h3>{historicoObra.length === 0 ? (<p className="text-sm text-gray-500">Sem histórico.</p>) : (<div className="space-y-4">{historicoObra.map((hist, idx) => (<button key={idx} onClick={() => { setDetalhesHistorico(hist); setModalHistoricoAberto(true); }} className="w-full text-left bg-white p-4 rounded-lg border shadow-sm hover:border-[#2A6377] transition group"><div className="flex justify-between items-center mb-2"><span className="font-bold text-[#2A6377] flex items-center gap-2"><Calendar size={16}/> {hist.dataFormatada}</span><span className="text-xs bg-slate-100 px-2 py-1 rounded-full group-hover:bg-[#2A6377]/10 group-hover:text-[#2A6377]">Detalhes</span></div><div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-slate-500 mt-2 border-t pt-2"><span>{hist.resumos.length} Resumo(s)</span><span>•</span><span>{hist.ocorrencias.length} Ocorrência(s)</span><span>•</span><span>{hist.tarefas.length} Tarefa(s)</span></div></button>))}</div>)}</div>
             </div>
           </div>
        )}

        {/* TELA: TAREFAS (KANBAN) */}
        {telaAtiva === 'tarefas' && (
           <div className="animate-in fade-in h-full flex flex-col">
             <header className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
               <div><h2 className="text-2xl md:text-3xl font-bold text-gray-800">Kanban</h2></div>
               <div className="flex items-center gap-2"><label className="text-sm font-medium text-gray-500">Filtrar:</label><select className="border rounded-lg p-2 outline-none font-medium bg-white shadow-sm w-full sm:w-auto" value={filtroObraKanban} onChange={(e) => setFiltroObraKanban(e.target.value)}><option value="todas">Todas as Obras</option>{obrasLista.map(o => <option key={o.id} value={o.id}>{o.codigo_externo} - {o.nome}</option>)}</select></div>
             </header>
             
             {/* AQUI FOI ALTERADO PARA ITEMS-START (ALTURA DINÂMICA) */}
             <div className="flex gap-6 overflow-x-auto pb-4 items-start flex-1">
               
               {/* COLUNA: A FAZER */}
               <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-gray-100/50 rounded-xl p-4 border flex flex-col">
                 <div className="flex justify-between items-center mb-4"><h3 className="font-bold">A Fazer</h3><span className="bg-gray-200 text-xs px-2 py-1 rounded-full">{tarefasFiltradas.filter(t => t?.status === 'pendente').length}</span></div>
                 <div className="space-y-3">
                   {tarefasFiltradas.filter(t => t?.status === 'pendente').map(tarefa => (
                     <div key={tarefa?.id} className="bg-white p-4 rounded-lg shadow-sm border hover:border-[#2A6377] transition group">
                       <div className="flex justify-between items-start mb-2"><span className="text-xs font-semibold text-[#2A6377] bg-[#2A6377]/10 px-2 py-1 rounded">{tarefa?.obras?.codigo_externo || 'Geral'}</span><span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px]"><User size={10} className="shrink-0"/> {tarefa?.usuarios?.nome || 'Geral'}</span></div>
                       <p className="font-medium text-sm my-3">{tarefa?.titulo || 'Sem Título'}</p>
                       <div className="flex justify-between items-center border-t pt-3 mt-3">
                         <div className="flex items-center gap-2">
                           <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}><Clock size={12} /> {formatarDataSegura(tarefa?.data_vencimento)}</div>
                           {tarefa?.data_vencimento && (<button onClick={() => agendarNoOutlookWeb(tarefa)} className="text-slate-400 hover:text-[#2A6377] transition" title="Enviar Convite no Outlook"><CalendarPlus size={14} /></button>)}
                         </div>
                         <button onClick={() => atualizarStatusTarefa(tarefa?.id, 'em_andamento')} className="bg-[#2A6377]/10 text-[#2A6377] hover:bg-[#2A6377] hover:text-white px-2 py-1.5 rounded transition flex items-center gap-1"><Play size={14} /> <span className="text-xs font-bold hidden sm:inline">Iniciar</span></button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               {/* COLUNA: EM ANDAMENTO */}
               <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-[#2A6377]/5 rounded-xl p-4 border border-[#2A6377]/20 flex flex-col">
                 <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-700">Em Andamento</h3><span className="bg-[#2A6377]/20 text-[#2A6377] text-xs px-2 py-1 rounded-full">{tarefasFiltradas.filter(t => t?.status === 'em_andamento').length}</span></div>
                 <div className="space-y-3">
                   {tarefasFiltradas.filter(t => t?.status === 'em_andamento').map(tarefa => (
                     <div key={tarefa?.id} className={`bg-white p-4 rounded-lg shadow-sm border ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? 'border-red-300' : 'border-gray-200 hover:border-[#2A6377]'}`}>
                       <div className="flex justify-between items-start mb-2"><span className="text-xs font-semibold text-[#2A6377] bg-[#2A6377]/10 px-2 py-1 rounded">{tarefa?.obras?.codigo_externo || 'Geral'}</span><span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px]"><User size={10} className="shrink-0"/> {tarefa?.usuarios?.nome || 'Geral'}</span></div>
                       <p className="font-medium text-sm my-3">{tarefa?.titulo || 'Sem Título'}</p>
                       <div className="flex justify-between items-center border-t pt-3 mt-3">
                         <div className="flex items-center gap-2">
                           <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}><Clock size={12} /> {formatarDataSegura(tarefa?.data_vencimento)}</div>
                           {tarefa?.data_vencimento && (<button onClick={() => agendarNoOutlookWeb(tarefa)} className="text-slate-400 hover:text-[#2A6377] transition" title="Enviar Convite no Outlook"><CalendarPlus size={14} /></button>)}
                         </div>
                         <button onClick={() => atualizarStatusTarefa(tarefa?.id, 'concluida')} className="bg-green-100 text-green-700 hover:bg-green-600 hover:text-white px-2 py-1.5 rounded transition flex items-center gap-1 shadow-sm"><Check size={16} strokeWidth={3} /> <span className="text-xs font-bold hidden sm:inline">Concluir</span></button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               {/* COLUNA: CONCLUÍDAS */}
               <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-green-50/30 rounded-xl p-4 border border-green-100 flex flex-col">
                 <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-700">Concluídas</h3><span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{tarefasFiltradas.filter(t => t?.status === 'concluida').length}</span></div>
                 <div className="space-y-3">
                   {tarefasFiltradas.filter(t => t?.status === 'concluida').map(tarefa => (
                      <div key={tarefa?.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 opacity-70">
                       <div className="flex justify-between items-start mb-2"><span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">{tarefa?.obras?.codigo_externo || 'Geral'}</span><span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px]"><User size={10} className="shrink-0"/> {tarefa?.usuarios?.nome || 'Geral'}</span></div>
                       <p className="font-medium text-gray-500 line-through text-sm my-3">{tarefa?.titulo || 'Sem Título'}</p>
                       <div className="flex justify-end border-t pt-3 mt-3"><div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-600"><CheckCircle2 size={12} /> Feito</div></div>
                     </div>
                   ))}
                 </div>
               </div>
               
             </div>
           </div>
        )}
      </main>
    </div>
  );
}