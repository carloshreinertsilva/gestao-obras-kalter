import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Home, Briefcase, Calendar, CheckSquare, AlertCircle, 
  HardHat, Plus, Save, Clock, AlertTriangle, CheckCircle2,
  User, Loader2, Play, Check, Trash2, Users, Edit2, X, LogOut, Mail, KeyRound, Copy, CheckCheck, Bell, Send, CalendarPlus, Menu, MessageSquare, BookOpen, ChevronRight, FolderOpen, FileText
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
  const [menuMobileAberto, setMenuMobileAberto] = useState<boolean>(false);
  
  const [tarefaSelecionada, setTarefaSelecionada] = useState<any>(null);
  
  const [obraEcoSelecionada, setObraEcoSelecionada] = useState<any>(null);
  const [novoDiarioTexto, setNovoDiarioTexto] = useState<string>('');
  const [comentariosTarefaAtual, setComentariosTarefaAtual] = useState<any[]>([]);
  const [novoComentarioTexto, setNovoComentarioTexto] = useState<string>('');

  const formatarDataSegura = (dataStr: any) => {
    if (!dataStr) return 'Sem prazo';
    try { const d = new Date(dataStr); if (isNaN(d.getTime())) return 'Data Inválida'; return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) { return 'Data Inválida'; }
  };

  const formatarDataHora = (dataStr: any) => {
    if (!dataStr) return '';
    try { const d = new Date(dataStr); if (isNaN(d.getTime())) return ''; return d.toLocaleString('pt-BR', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    } catch (e) { return ''; }
  };

  const labelOcorrencia = (tipo: string) => {
    const mapas: any = { avanco: 'Avanço', atraso: 'Atraso', financeiro: 'Financeiro' };
    return mapas[tipo] || tipo;
  };

  const mostrarAviso = (mensagem: string, tipo: string = 'sucesso') => {
    const id = Date.now(); setToasts(prev => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const agendarNoOutlookWeb = (tarefa: any) => {
    if (!tarefa.data_vencimento) { mostrarAviso("Esta tarefa não tem prazo definido.", "erro"); return; }
    const emailResponsavel = listaUsuarios.find((u: any) => u.id === tarefa.id_responsavel)?.email || '';
    const nomeObra = tarefa.obras?.nome || 'Geral';
    const codigoObra = tarefa.obras?.codigo_externo || '';
    const dataVenc = tarefa.data_vencimento.split('T')[0]; 
    const params = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', startdt: `${dataVenc}T11:00:00Z`, enddt: `${dataVenc}T12:00:00Z`, subject: `Kalter: ${tarefa.titulo}`, body: `Obra: ${codigoObra} - ${nomeObra}\n\nGerado pelo Sistema Kalter`, to: emailResponsavel });
    window.open(`https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`, '_blank');
  };

  const gerarVisualPDF = (listaObrasParaPDF: any[], dataAta: string) => {
    const janela = window.open('', '', 'width=900,height=900');
    if (!janela) return mostrarAviso('Seu navegador bloqueou o PDF. Permita os pop-ups!', 'erro');

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ata de Reunião Kalter - ${dataAta}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #2A6377; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #2A6377; margin: 0 0 10px 0; font-size: 24px; letter-spacing: 1px; }
            .data { font-size: 14px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .obra-section { margin-bottom: 40px; page-break-inside: avoid; }
            .obra-title { background: #2A6377; color: white; padding: 12px 15px; font-size: 16px; font-weight: bold; margin-bottom: 15px; border-radius: 4px; }
            .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
            .info-box p { margin: 5px 0; }
            h4 { color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f1f5f9; color: #334155; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; page-break-inside: avoid; }
          </style>
        </head>
        <body>
          <div class="header">
             <h1>KALTER - REFRIGERAÇÃO INDUSTRIAL</h1>
             <div class="data">Gestão de Obras • Ata de Reunião • ${dataAta}</div>
          </div>
    `;

    listaObrasParaPDF.forEach(obra => {
      html += `
        <div class="obra-section">
          <div class="obra-title">OBRA: ${obra.nome_obra.toUpperCase()}</div>
          <div class="info-box">
            <p><strong>Clima na Semana:</strong> ${obra.clima.charAt(0).toUpperCase() + obra.clima.slice(1)}</p>
            <p><strong>Resumo da Reunião:</strong><br/>${obra.resumo ? obra.resumo.replace(/\n/g, '<br/>') : 'Nenhum resumo registrado.'}</p>
          </div>
      `;

      if (obra.ocorrencias && obra.ocorrencias.length > 0) {
        html += `
          <h4>Ocorrências Registradas</h4>
          <table>
            <tr><th width="20%">Tipo</th><th>Descrição</th></tr>
            ${obra.ocorrencias.map((o:any) => `<tr><td><strong>${labelOcorrencia(o.tipo).toUpperCase()}</strong></td><td>${o.descricao}</td></tr>`).join('')}
          </table>
        `;
      }

      if (obra.tarefas && obra.tarefas.length > 0) {
        html += `
          <h4>Tarefas e Prazos Definidos</h4>
          <table>
            <tr><th width="45%">Tarefa</th><th width="30%">Responsável</th><th width="25%">Prazo</th></tr>
            ${obra.tarefas.map((t:any) => `<tr><td>${t.titulo}</td><td>${t.nome_responsavel || t.usuarios?.nome || 'Geral'}</td><td>${formatarDataSegura(t.data_vencimento)}</td></tr>`).join('')}
          </table>
        `;
      }
      html += `</div>`;
    });

    html += `
          <div class="footer">Gerado via Kalter Sistema de Gestão de Obras</div>
          <script>
            window.onload = function() { setTimeout(function(){ window.print(); }, 300); }
          </script>
        </body>
      </html>
    `;

    janela.document.write(html);
    janela.document.close();
  };

  const baixarPDFHistorico = () => {
    if (!detalhesHistorico) return;
    const idObraAtual = reuniaoForm.id_obra || obraEcoSelecionada?.id;
    const obraInfo = obrasLista.find(o => o.id === idObraAtual);
    const nomeObra = obraInfo ? `${obraInfo.codigo_externo} - ${obraInfo.nome}` : 'Obra Não Identificada';
    const clima = detalhesHistorico.resumos[0]?.clima || 'N/A';
    const resumoText = detalhesHistorico.resumos.map((r:any) => r.texto).join('\n\n') || 'Sem resumo registrado.';

    const fakeObraParaAta = {
        nome_obra: nomeObra,
        clima: clima,
        resumo: resumoText,
        ocorrencias: detalhesHistorico.ocorrencias || [],
        tarefas: detalhesHistorico.tarefas || []
    };
    gerarVisualPDF([fakeObraParaAta], detalhesHistorico.dataFormatada);
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
    } catch (error: any) { setErroLogin(error.message.includes("Invalid login credentials") ? "E-mail ou senha incorretos." : error.message); } 
    finally { setCarregandoAuth(false); }
  };

  const fazerLogout = async () => { await supabase.auth.signOut(); setTelaAtiva('dashboard'); setEmailAuth(''); setSenhaAuth(''); setObraEcoSelecionada(null); };
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

  const buscarHistoricoUnificado = async (idDaObra: any) => {
    if (!idDaObra) return;
    try {
      const { data: reunioesData } = await supabase.from('reunioes').select(`id, data_reuniao, clima_semana, resumo_geral, ocorrencias(tipo, descricao), tarefas(titulo, data_vencimento, id_responsavel, usuarios(nome))`).eq('id_obra', idDaObra);
      let diariosData: any[] = [];
      try { const { data } = await supabase.from('diario_obra').select('id, data_registro, texto, created_at, usuarios(nome)').eq('id_obra', idDaObra); if (data) diariosData = data; } catch (e) { console.log('Tabela diario_obra ausente.'); }

      const historicoAgrupado = (reunioesData || []).reduce((acc: any, curr: any) => {
        const dataFormatada = formatarDataSegura(curr.data_reuniao);
        if (!acc[dataFormatada]) acc[dataFormatada] = { dataFormatada, dataReal: curr.data_reuniao, resumos: [], ocorrencias: [], tarefas: [], diarios: [] };
        if (curr.resumo_geral) acc[dataFormatada].resumos.push({ clima: curr.clima_semana, texto: curr.resumo_geral });
        if (curr.ocorrencias?.length > 0) acc[dataFormatada].ocorrencias.push(...curr.ocorrencias);
        if (curr.tarefas?.length > 0) acc[dataFormatada].tarefas.push(...curr.tarefas);
        return acc;
      }, {});

      diariosData.forEach((diario: any) => {
        const dataFormatada = formatarDataSegura(diario.data_registro);
        if (!historicoAgrupado[dataFormatada]) historicoAgrupado[dataFormatada] = { dataFormatada, dataReal: diario.data_registro, resumos: [], ocorrencias: [], tarefas: [], diarios: [] };
        historicoAgrupado[dataFormatada].diarios.push(diario);
      });

      const historicoArray = Object.values(historicoAgrupado).sort((a: any, b: any) => new Date(b.dataReal).getTime() - new Date(a.dataReal).getTime());
      setHistoricoObra(historicoArray);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { 
    if (telaAtiva === 'reunioes' && reuniaoForm.id_obra) buscarHistoricoUnificado(reuniaoForm.id_obra); 
    if (telaAtiva === 'painel_obra' && obraEcoSelecionada) buscarHistoricoUnificado(obraEcoSelecionada.id);
  }, [reuniaoForm.id_obra, telaAtiva, obraEcoSelecionada]);

  const buscarTarefasKanban = async () => {
    if (!usuarioAtual) return;
    try {
      let query = supabase.from('tarefas').select(`id, id_obra, titulo, status, data_vencimento, id_responsavel, created_at, obras!inner(codigo_externo, nome, id_responsavel), usuarios(nome)`).order('created_at', { ascending: false });
      if (!isAdmin) {
        const { data: obrasUsuario } = await supabase.from('obras').select('id').eq('id_responsavel', usuarioAtual.id);
        const idsMinhasObras = obrasUsuario?.map(o => o.id) || [];
        if (idsMinhasObras.length > 0) query = query.or(`id_responsavel.eq.${usuarioAtual.id},id_obra.in.(${idsMinhasObras.join(',')})`); else query = query.eq('id_responsavel', usuarioAtual.id);
      }
      const { data, error } = await query; if (error) throw error; setTarefasKanban(data || []);
    } catch (error) { console.error(error); }
  };
  
  useEffect(() => { if (telaAtiva === 'tarefas' || telaAtiva === 'painel_obra') buscarTarefasKanban(); }, [telaAtiva, usuarioAtual]);

  useEffect(() => {
    const buscarComentarios = async () => {
      if (!tarefaSelecionada) return;
      try {
        const { data } = await supabase.from('comentarios_tarefa').select('id, texto, created_at, usuarios(nome)').eq('id_tarefa', tarefaSelecionada.id).order('created_at', { ascending: true });
        setComentariosTarefaAtual(data || []);
      } catch (error) { console.log('Tabela de comentários ausente.'); }
    };
    buscarComentarios();
  }, [tarefaSelecionada]);

  const adicionarComentario = async () => {
    if (!novoComentarioTexto.trim() || !tarefaSelecionada) return;
    try {
      const { error } = await supabase.from('comentarios_tarefa').insert([{ id_tarefa: tarefaSelecionada.id, id_usuario: usuarioAtual.id, texto: novoComentarioTexto }]);
      if (error) throw error;
      setNovoComentarioTexto('');
      const { data } = await supabase.from('comentarios_tarefa').select('id, texto, created_at, usuarios(nome)').eq('id_tarefa', tarefaSelecionada.id).order('created_at', { ascending: true });
      setComentariosTarefaAtual(data || []);
    } catch (error: any) { mostrarAviso(error.message, 'erro'); }
  };

  const adicionarDiarioObra = async () => {
    if (!novoDiarioTexto.trim() || !obraEcoSelecionada) return;
    setCarregando(true);
    try {
      const { error } = await supabase.from('diario_obra').insert([{ id_obra: obraEcoSelecionada.id, id_usuario: usuarioAtual.id, texto: novoDiarioTexto, data_registro: new Date().toISOString().split('T')[0] }]);
      if (error) throw error;
      setNovoDiarioTexto('');
      mostrarAviso("Registro salvo no Diário!");
      buscarHistoricoUnificado(obraEcoSelecionada.id);
    } catch (error: any) { mostrarAviso(error.message, 'erro'); } finally { setCarregando(false); }
  };

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

  const abrirPainelObra = (obra: any) => { setObraEcoSelecionada(obra); setFiltroObraKanban(obra.id); setTelaAtiva('painel_obra'); };

  const atualizarStatusTarefa = async (idTarefa: any, novoStatus: any) => { try { await supabase.from('tarefas').update({ status: novoStatus }).eq('id', idTarefa); buscarTarefasKanban(); mostrarAviso('Status atualizado!'); } catch (error: any) { mostrarAviso(error.message, 'erro'); } };

  const atualizarDataTarefa = async (idTarefa: any, novaData: any) => {
    try {
      await supabase.from('tarefas').update({ data_vencimento: novaData || null }).eq('id', idTarefa);
      setTarefaSelecionada({ ...tarefaSelecionada, data_vencimento: novaData });
      buscarTarefasKanban(); 
      mostrarAviso('Prazo atualizado!');
    } catch (error: any) { mostrarAviso(error.message, 'erro'); }
  };

  const adicionarOcorrencia = () => { if (!novaOcorrencia.descricao) return; setListaOcorrencias([...listaOcorrencias, novaOcorrencia]); setNovaOcorrencia({ tipo: 'avanco', descricao: '' }); };
  const adicionarTarefa = () => { if (!novaTarefa.titulo || !novaTarefa.id_responsavel) return mostrarAviso("Preencha título e responsável.", "erro"); const nomeResp = listaUsuarios.find(u => u.id === novaTarefa.id_responsavel)?.nome || ''; setListaTarefas([...listaTarefas, { ...novaTarefa, nome_responsavel: nomeResp }]); setNovaTarefa({ titulo: '', data_vencimento: '', id_responsavel: '' }); };

  async function salvarReuniaoObra() {
    if (!reuniaoForm.id_obra) return mostrarAviso('Selecione uma obra.', 'erro');
    setCarregando(true);
    try {
      const obraSelecionada = obrasLista.find(o => o.id === reuniaoForm.id_obra);
      
      const { data: reuniaoSalva, error: errReuniao } = await supabase.from('reunioes').insert([{ id_obra: reuniaoForm.id_obra, data_reuniao: reuniaoForm.data_reuniao, clima_semana: reuniaoForm.clima_semana, resumo_geral: reuniaoForm.resumo_geral }]).select().single();
      if (errReuniao) throw errReuniao;

      if (listaOcorrencias.length > 0) await supabase.from('ocorrencias').insert(listaOcorrencias.map(o => ({ id_reuniao: reuniaoSalva.id, tipo: o.tipo, descricao: o.descricao })));
      if (listaTarefas.length > 0) await supabase.from('tarefas').insert(listaTarefas.map(t => ({ id_obra: reuniaoForm.id_obra, id_reuniao_origem: reuniaoSalva.id, titulo: t.titulo, data_vencimento: t.data_vencimento || null, id_responsavel: t.id_responsavel, status: 'pendente' })));
      
      const registroObraAta = { nome_obra: obraSelecionada ? `${obraSelecionada.codigo_externo} - ${obraSelecionada.nome}` : 'Obra Não Identificada', clima: reuniaoForm.clima_semana, resumo: reuniaoForm.resumo_geral, ocorrencias: [...listaOcorrencias], tarefas: [...listaTarefas] };
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
      if (obra.ocorrencias.length > 0) { textoAta += `[ Ocorrências ]\n`; obra.ocorrencias.forEach((oc: any) => textoAta += `- (${labelOcorrencia(oc.tipo).toUpperCase()}): ${oc.descricao}\n`); textoAta += `\n`; }
      if (obra.tarefas.length > 0) { textoAta += `[ Tarefas ]\n`; obra.tarefas.forEach((t: any) => textoAta += `- ${t.titulo} (Resp: ${t.nome_responsavel} | Prazo: ${formatarDataSegura(t.data_vencimento)})\n`); textoAta += `\n`; }
      textoAta += `\n`;
    }); setAtaGerada(textoAta); setModalAtaAberto(true);
  };

  const enviarPorEmailAplicativo = () => {
    const emailsAdmins = listaUsuarios.filter(u => u.perfil === 'admin').map(u => u.email);
    const destinatarios = [...new Set([...emailsAdmins])].join(',');
    const assunto = encodeURIComponent(`Ata de Reunião de Obras - ${formatarDataSegura(new Date().toISOString())}`);
    window.location.href = `mailto:${destinatarios}?subject=${assunto}&body=${encodeURIComponent(ataGerada)}`;
    setModalAtaAberto(false); setObrasNaAtaAtual([]);
  };

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
      <div className="fixed bottom-6 right-6 z-[90] flex flex-col gap-3">{toasts.map(toast => (<div key={toast.id} className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg text-white font-medium ${toast.tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.tipo === 'sucesso' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />} {toast.mensagem}</div>))}</div>
      
      {/* HEADER MOBILE */}
      <div className="md:hidden bg-[#2A6377] text-white p-4 flex justify-between items-center shadow-md z-30">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Kalter" className="h-8 w-auto object-contain" onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <span className="font-bold text-xl hidden">Kalter</span>
        </div>
        <button onClick={() => setMenuMobileAberto(true)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"><Menu size={24} /></button>
      </div>

      {menuMobileAberto && (<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[40] md:hidden" onClick={() => setMenuMobileAberto(false)} />)}

      {/* MODAL DETALHES DA TAREFA E COMENTÁRIOS */}
      {tarefaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[85] flex items-center justify-center p-4" onClick={() => setTarefaSelecionada(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-start gap-4">
              <div>
                <span className="text-xs font-bold text-[#2A6377] bg-[#2A6377]/10 px-2 py-1 rounded uppercase mb-2 inline-block">{tarefaSelecionada.obras?.codigo_externo} - {tarefaSelecionada.obras?.nome}</span>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 break-words leading-tight">{tarefaSelecionada.titulo}</h2>
              </div>
              <button onClick={() => setTarefaSelecionada(null)} className="text-slate-400 hover:text-red-500 shrink-0 bg-slate-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="p-4 md:p-6 flex-1 overflow-y-auto flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3 space-y-4">
                 <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border">
                    <div className="p-2 bg-white rounded-full shadow-sm border"><User className="text-[#2A6377]" size={18}/></div>
                    <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Responsável</p><p className="font-bold text-slate-700 text-sm">{tarefaSelecionada.usuarios?.nome || 'Geral'}</p></div>
                 </div>
                 <div className="flex flex-col gap-1 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Calendar size={12}/> Criada em</p>
                   <p className="font-bold text-slate-700">{formatarDataSegura(tarefaSelecionada.created_at)}</p>
                 </div>
                 
                 <div className={`flex flex-col gap-1 text-sm p-4 rounded-lg border ${isAtrasada(tarefaSelecionada.data_vencimento, tarefaSelecionada.status) ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                   <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1"><Clock size={12}/> Prazo da Tarefa</p>
                   <input type="date" value={tarefaSelecionada.data_vencimento ? tarefaSelecionada.data_vencimento.split('T')[0] : ''} onChange={(e) => atualizarDataTarefa(tarefaSelecionada.id, e.target.value)} className="font-bold bg-transparent outline-none cursor-pointer w-full text-slate-700 p-0 m-0"/>
                 </div>
              </div>

              <div className="w-full md:w-2/3 flex flex-col">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><MessageSquare size={18} className="text-[#2A6377]"/> Atualizações</h3>
                <div className="flex-1 bg-slate-50 rounded-lg border p-4 space-y-4 mb-4 min-h-[200px]">
                  {comentariosTarefaAtual.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">Nenhum comentário.</div>
                  ) : (
                    comentariosTarefaAtual.map(com => (
                      <div key={com.id} className="bg-white p-3 rounded shadow-sm border text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-[#2A6377]">{com.usuarios?.nome}</span>
                          <span className="text-[10px] text-slate-400">{formatarDataHora(com.created_at)}</span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{com.texto}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Adicionar um comentário..." value={novoComentarioTexto} onChange={e => setNovoComentarioTexto(e.target.value)} onKeyPress={e => e.key === 'Enter' && adicionarComentario()} className="flex-1 border rounded-lg p-3 outline-none focus:border-[#2A6377] text-sm" />
                  <button onClick={adicionarComentario} disabled={!novoComentarioTexto.trim()} className="bg-[#2A6377] text-white px-4 rounded-lg hover:bg-[#1e4857] transition disabled:opacity-50"><Send size={18}/></button>
                </div>
              </div>
            </div>
            
            <div className="p-4 md:p-6 border-t border-gray-100 flex flex-wrap gap-3 justify-end bg-slate-50 rounded-b-2xl">
               {tarefaSelecionada.data_vencimento && (<button onClick={() => agendarNoOutlookWeb(tarefaSelecionada)} className="bg-white border border-[#2A6377]/30 text-[#2A6377] hover:bg-[#2A6377]/10 px-4 py-3 md:py-2 rounded-lg font-bold flex items-center gap-2 transition flex-1 sm:flex-none justify-center shadow-sm"><CalendarPlus size={18}/> Outlook</button>)}
               {tarefaSelecionada.status === 'pendente' && (<button onClick={() => { atualizarStatusTarefa(tarefaSelecionada.id, 'em_andamento'); setTarefaSelecionada(null); }} className="bg-[#2A6377] text-white px-6 py-3 md:py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#1e4857] transition shadow-md flex-1 sm:flex-none justify-center"><Play size={18}/> Iniciar Tarefa</button>)}
               {tarefaSelecionada.status === 'em_andamento' && (<button onClick={() => { atualizarStatusTarefa(tarefaSelecionada.id, 'concluida'); setTarefaSelecionada(null); }} className="bg-green-600 text-white px-6 py-3 md:py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-md flex-1 sm:flex-none justify-center"><Check size={18} strokeWidth={3}/> Concluir Tarefa</button>)}
               {tarefaSelecionada.status === 'concluida' && (<div className="flex items-center justify-center gap-2 text-green-600 font-bold px-4 py-3 md:py-2 bg-green-100 rounded-lg flex-1 sm:flex-none"><CheckCircle2 size={18}/> Concluída</div>)}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO HISTÓRICO */}
      {modalHistoricoAberto && detalhesHistorico && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
               <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="text-[#2A6377]"/> Dia {detalhesHistorico.dataFormatada}</h2>
               <div className="flex gap-2">
                  <button onClick={baixarPDFHistorico} className="text-[#2A6377] hover:text-white border border-[#2A6377] hover:bg-[#2A6377] bg-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"><FileText size={16}/> Gerar PDF</button>
                  <button onClick={() => setModalHistoricoAberto(false)} className="text-slate-400 hover:text-red-500 bg-slate-100 p-2 rounded-lg"><X size={20}/></button>
               </div>
            </div>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-6">
              {detalhesHistorico.diarios && detalhesHistorico.diarios.length > 0 && (<div><h4 className="font-bold mb-3 border-b border-[#2A6377] pb-1 text-[#2A6377] flex items-center gap-2"><BookOpen size={16}/> Diário de Obra</h4><div className="space-y-3">{detalhesHistorico.diarios.map((d: any, i: number) => (<div key={i} className="bg-blue-50 p-4 rounded-lg border border-blue-100"><div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">{d.usuarios?.nome}</span><span className="text-[10px] text-blue-500">{formatarDataHora(d.created_at)}</span></div><p className="text-sm whitespace-pre-wrap text-blue-900">{d.texto}</p></div>))}</div></div>)}
              {detalhesHistorico.resumos.length > 0 && (<div><h4 className="font-bold mb-3 border-b pb-1 flex items-center gap-2">Resumos de Reunião</h4><div className="space-y-3">{detalhesHistorico.resumos.map((res: any, i: number) => (<div key={i} className="bg-slate-50 p-4 rounded-lg border"><p className="text-xs font-bold text-slate-400 uppercase mb-2">Clima: {res.clima}</p><p className="text-sm whitespace-pre-wrap">{res.texto}</p></div>))}</div></div>)}
              {detalhesHistorico.ocorrencias.length > 0 && (<div><h4 className="font-bold mb-3 border-b pb-1">Ocorrências</h4><div className="space-y-2">{detalhesHistorico.ocorrencias.map((oc: any, i: number) => (<div key={i} className="bg-slate-50 p-3 rounded border text-sm"><span className="font-bold text-[#2A6377] uppercase mr-2">{labelOcorrencia(oc.tipo)}:</span> {oc.descricao}</div>))}</div></div>)}
              {detalhesHistorico.tarefas.length > 0 && (<div><h4 className="font-bold mb-3 border-b pb-1">Tarefas Geradas</h4><div className="space-y-2">{detalhesHistorico.tarefas.map((tar: any, i: number) => (<div key={i} className="bg-slate-50 p-3 rounded border text-sm flex justify-between items-center"><span className="font-medium">{tar.titulo}</span><div className="flex gap-2 text-xs text-slate-500"><span className="bg-white px-2 py-1 rounded"><User size={12} className="inline"/> {tar.usuarios?.nome || 'Geral'}</span><span className="bg-white px-2 py-1 rounded"><Clock size={12} className="inline"/> {formatarDataSegura(tar.data_vencimento)}</span></div></div>))}</div></div>)}
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

      {/* MODAL DE ENVIO DE ATA ATUAL */}
      {modalAtaAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center"><h2 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Mail className="text-[#2A6377]"/> Enviar Ata de Reunião</h2><button onClick={() => setModalAtaAberto(false)}><X size={24}/></button></div>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto bg-slate-50"><pre className="text-sm font-mono whitespace-pre-wrap">{ataGerada}</pre></div>
            <div className="p-4 md:p-6 border-t border-gray-100 flex flex-wrap justify-end gap-3">
              <button onClick={() => setModalAtaAberto(false)} className="px-6 py-2 rounded-lg font-medium bg-slate-100 flex-1 md:flex-none hover:bg-slate-200">Fechar</button>
              <button onClick={() => gerarVisualPDF(obrasNaAtaAtual, formatarDataSegura(new Date().toISOString()))} className="bg-white border border-[#2A6377] text-[#2A6377] hover:bg-[#2A6377] hover:text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 flex-1 md:flex-none transition"><FileText size={18}/> Baixar PDF</button>
              <button onClick={enviarPorEmailAplicativo} className="bg-[#2A6377] text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 flex-1 md:flex-none w-full md:w-auto hover:bg-[#1e4857] transition"><Send size={18}/> Enviar por E-mail</button>
            </div>
          </div>
        </div>
      )}

      {/* MENU LATERAL */}
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
            <button onClick={() => { setTelaAtiva('obras'); setMenuMobileAberto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === 'obras' || telaAtiva === 'painel_obra' ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}><HardHat size={20} /> Obras</button>
            <button onClick={() => { setTelaAtiva('reunioes'); setMenuMobileAberto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === 'reunioes' ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}><Calendar size={20} /> Reuniões</button>
            <button onClick={() => { setTelaAtiva('tarefas'); setMenuMobileAberto(false); }} className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${telaAtiva === 'tarefas' ? 'bg-white/20 text-white font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}><CheckSquare size={20} /> Tarefas</button>
            <div className="pt-4 mt-2 border-t border-white/10"><button onClick={() => { setPainelNotificacaoAberto(true); setMenuMobileAberto(false); }} className="w-full flex items-center justify-between p-3 rounded-lg transition hover:bg-white/10 text-white/80 hover:text-white"><div className="flex items-center gap-3"><Bell size={20} className={minhasNotificacoes.length > 0 ? "text-amber-300" : ""} /> Tarefas</div>{minhasNotificacoes.length > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 rounded-full animate-pulse">{minhasNotificacoes.length}</span>}</button></div>
          </nav>
        </div>
        <div className="p-4 border-t border-white/10"><div className="flex items-center gap-3 mb-4 px-2"><div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold"><User size={16}/></div><div className="overflow-hidden"><p className="text-sm font-medium truncate">{usuarioAtual?.nome}</p><p className="text-xs text-white/60 uppercase">{usuarioAtual?.perfil}</p></div></div><button onClick={fazerLogout} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"><LogOut size={18} /> Sair</button></div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden bg-slate-50/50">
        
        {/* TELA: PAINEL DA OBRA (ECOSSISTEMA) */}
        {telaAtiva === 'painel_obra' && obraEcoSelecionada && (
          <div className="animate-in fade-in h-full flex flex-col">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <button onClick={() => setTelaAtiva('obras')} className="text-slate-400 hover:text-[#2A6377] text-sm font-bold flex items-center gap-1 mb-2 transition"><ChevronRight size={16} className="rotate-180"/> Voltar para Obras</button>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3"><FolderOpen className="text-[#2A6377]" size={32} /> {obraEcoSelecionada.codigo_externo} - {obraEcoSelecionada.nome}</h2>
              </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-200">
                  <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-3"><BookOpen size={18} /> Registrar no Diário</h3>
                  <textarea rows={3} placeholder="Houve alguma alteração no projeto hoje? Registre aqui..." value={novoDiarioTexto} onChange={(e) => setNovoDiarioTexto(e.target.value)} className="w-full border border-blue-100 bg-blue-50/30 rounded-lg p-3 outline-none focus:border-blue-400 text-sm mb-3"></textarea>
                  <button onClick={adicionarDiarioObra} disabled={!novoDiarioTexto.trim() || carregando} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition flex justify-center items-center gap-2 disabled:opacity-50">{carregando ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salvar no Diário</button>
                </div>

                <div className="bg-slate-50 p-5 rounded-xl border">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock size={20} className="text-slate-500" /> Linha do Tempo</h3>
                  {historicoObra.length === 0 ? (<p className="text-sm text-gray-500">Nenhum registro encontrado.</p>) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {historicoObra.map((hist, idx) => (
                        <button key={idx} onClick={() => { setDetalhesHistorico(hist); setModalHistoricoAberto(true); }} className="w-full text-left bg-white p-4 rounded-lg border shadow-sm hover:border-[#2A6377] transition group">
                          <div className="flex justify-between items-center mb-2"><span className="font-bold text-[#2A6377] flex items-center gap-2"><Calendar size={16} /> {hist.dataFormatada}</span></div>
                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 mt-2 border-t pt-2">
                            {hist.diarios?.length > 0 && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{hist.diarios.length} Diário(s)</span>}
                            {hist.resumos?.length > 0 && <span className="bg-slate-100 px-2 py-0.5 rounded">{hist.resumos.length} Resumo(s)</span>}
                            {hist.ocorrencias?.length > 0 && <span className="bg-slate-100 px-2 py-0.5 rounded">{hist.ocorrencias.length} Ocorrência(s)</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col bg-white p-5 rounded-xl shadow-sm border h-full min-h-[600px]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2"><CheckSquare size={20} className="text-[#2A6377]"/> Tarefas da Obra</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 items-start flex-1">
                  <div className="flex-1 min-w-[260px] bg-gray-50 rounded-xl p-3 border">
                    <div className="flex justify-between items-center mb-3"><h4 className="font-bold text-sm">A Fazer</h4><span className="bg-gray-200 text-[10px] px-2 py-0.5 rounded-full font-bold">{tarefasFiltradas.filter(t => t?.status === 'pendente').length}</span></div>
                    <div className="space-y-2">
                      {tarefasFiltradas.filter(t => t?.status === 'pendente').map(tarefa => (
                        <div key={tarefa?.id} onClick={() => setTarefaSelecionada(tarefa)} className="bg-white p-3 rounded shadow-sm border hover:border-[#2A6377] cursor-pointer group">
                          <p className="font-medium text-sm leading-tight mb-2">{tarefa?.titulo}</p>
                          <div className="flex justify-between items-center border-t pt-2"><span className="text-[10px] uppercase font-bold text-slate-400 truncate max-w-[100px]"><User size={10} className="inline mr-1"/>{tarefa?.usuarios?.nome}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}><Clock size={10} /> {formatarDataSegura(tarefa?.data_vencimento)}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 min-w-[260px] bg-[#2A6377]/5 rounded-xl p-3 border border-[#2A6377]/20">
                    <div className="flex justify-between items-center mb-3"><h4 className="font-bold text-sm text-[#2A6377]">Em Andamento</h4><span className="bg-[#2A6377]/20 text-[#2A6377] text-[10px] px-2 py-0.5 rounded-full font-bold">{tarefasFiltradas.filter(t => t?.status === 'em_andamento').length}</span></div>
                    <div className="space-y-2">
                      {tarefasFiltradas.filter(t => t?.status === 'em_andamento').map(tarefa => (
                        <div key={tarefa?.id} onClick={() => setTarefaSelecionada(tarefa)} className="bg-white p-3 rounded shadow-sm border hover:border-[#2A6377] cursor-pointer group">
                          <p className="font-medium text-sm leading-tight mb-2">{tarefa?.titulo}</p>
                          <div className="flex justify-between items-center border-t pt-2"><span className="text-[10px] uppercase font-bold text-slate-400 truncate max-w-[100px]"><User size={10} className="inline mr-1"/>{tarefa?.usuarios?.nome}</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}><Clock size={10} /> {formatarDataSegura(tarefa?.data_vencimento)}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 min-w-[260px] bg-green-50/50 rounded-xl p-3 border border-green-100">
                    <div className="flex justify-between items-center mb-3"><h4 className="font-bold text-sm text-green-700">Concluídas</h4></div>
                    <div className="space-y-2">
                      {tarefasFiltradas.filter(t => t?.status === 'concluida').map(tarefa => (
                        <div key={tarefa?.id} onClick={() => setTarefaSelecionada(tarefa)} className="bg-white p-3 rounded shadow-sm border opacity-70 cursor-pointer hover:opacity-100">
                          <p className="font-medium text-sm leading-tight mb-2 line-through text-slate-500">{tarefa?.titulo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {telaAtiva === 'dashboard' && (
          <div className="animate-in fade-in">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Visão Geral {isAdmin ? '(Todas)' : '(Minhas)'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8"><div className="bg-white p-4 md:p-6 rounded-xl shadow-sm flex items-center gap-4"><div className="p-4 bg-[#2A6377]/10 text-[#2A6377] rounded-lg"><Briefcase size={24} /></div><div><p className="text-sm text-gray-500 font-medium">Obras Ativas</p><p className="text-2xl md:text-3xl font-bold text-[#2A6377]">{resumoReal.obrasAtivas}</p></div></div><div className="bg-white p-4 md:p-6 rounded-xl shadow-sm flex items-center gap-4"><div className="p-4 bg-red-100 text-red-600 rounded-lg"><AlertCircle size={24} /></div><div><p className="text-sm text-gray-500 font-medium">Tarefas Atrasadas</p><p className="text-2xl md:text-3xl font-bold text-red-600">{resumoReal.tarefasAtrasadas}</p></div></div></div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border">
              <h3 className="text-lg font-bold mb-6">Status Real das Tarefas por Obra</h3>
              <div className="h-64 md:h-80 w-full">
                {dadosGrafico.length === 0 ? (<div className="h-full flex items-center justify-center text-gray-400">Nenhuma tarefa.</div>) : (<ResponsiveContainer width="100%" height="100%"><BarChart data={dadosGrafico}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" /><XAxis dataKey="nome" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip cursor={{fill: '#f3f4f6'}} /><Bar dataKey="tarefas_concluidas" name="Concluídas" fill="#22c55e" radius={[4, 4, 0, 0]} /><Bar dataKey="tarefas_pendentes" name="Pendentes" fill="#f87171" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>)}
              </div>
            </div>
          </div>
        )}

        {telaAtiva === 'equipe' && isAdmin && (
          <div className="animate-in fade-in max-w-4xl"><h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Equipe</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"><form onSubmit={salvarUsuario} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border h-fit"><h3 className="text-lg font-bold mb-4 border-b pb-2">Novo Colaborador</h3><div className="space-y-4"><div><label className="block text-sm mb-1">Nome</label><input required type="text" value={novoUsuario.nome} onChange={(e) => setNovoUsuario({...novoUsuario, nome: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]" /></div><div><label className="block text-sm mb-1">E-mail</label><input required type="email" value={novoUsuario.email} onChange={(e) => setNovoUsuario({...novoUsuario, email: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]" /></div><div><label className="block text-sm mb-1">Perfil</label><select value={novoUsuario.perfil} onChange={(e) => setNovoUsuario({...novoUsuario, perfil: e.target.value})} className="w-full border rounded-lg p-3 outline-none focus:border-[#2A6377]"><option value="engenheiro">Engenheiro/Gestor</option><option value="admin">Administrador</option></select></div></div><div className="flex justify-end pt-6"><button type="submit" className="bg-[#2A6377] text-white px-6 py-2 rounded-lg font-medium w-full sm:w-auto"><Plus size={18} className="inline mr-2"/> Adicionar</button></div></form><div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border"><h3 className="text-lg font-bold mb-4 border-b pb-2">Registados</h3><div className="space-y-3">{listaUsuarios.map(user => (<div key={user.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg"><div className={`p-2 rounded-full text-white ${user.perfil === 'admin' ? 'bg-[#2A6377]' : 'bg-[#2A6377]/60'}`}><User size={16} /></div><div className="overflow-hidden"><p className="font-bold text-sm truncate">{user.nome} <span className="text-[10px] ml-2 px-2 py-0.5 bg-gray-200 rounded uppercase inline-block">{user.perfil}</span></p><p className="text-xs text-slate-500 truncate">{user.email}</p></div></div>))}</div></div></div></div>
        )}

        {telaAtiva === 'obras' && (
          <div className="animate-in fade-in max-w-5xl"><h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Obras</h2>
            {isAdmin && (<form onSubmit={salvarObra} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6 md:mb-8"><div className="flex justify-between items-center mb-6 border-b pb-2"><h3 className="text-xl font-bold">{novaObra.id ? 'Editar Obra' : 'Nova Obra'}</h3>{novaObra.id && (<button type="button" onClick={cancelarEdicaoObra} className="text-gray-500 flex items-center gap-1 text-sm"><X size={16} /> Cancelar</button>)}</div>{erroObra && (<div className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3"><AlertTriangle size={20} /> <span className="text-sm">{erroObra}</span></div>)}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6"><div><label className="block text-sm mb-1">Código *</label><input type="text" value={novaObra.codigo_externo} onChange={(e) => setNovaObra({...novaObra, codigo_externo: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377]" /></div><div><label className="block text-sm mb-1">Nome *</label><input type="text" value={novaObra.nome} onChange={(e) => setNovaObra({...novaObra, nome: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377]" /></div><div><label className="block text-sm mb-1">Início *</label><input type="date" value={novaObra.data_inicio} onChange={(e) => setNovaObra({...novaObra, data_inicio: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377]" /></div><div><label className="block text-sm mb-1">Fim *</label><input type="date" value={novaObra.data_previsao_fim} onChange={(e) => setNovaObra({...novaObra, data_previsao_fim: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377]" /></div><div className="md:col-span-2"><label className="block text-sm mb-1">Responsável *</label><select value={novaObra.id_responsavel} onChange={(e) => setNovaObra({...novaObra, id_responsavel: e.target.value})} className="w-full border p-3 rounded-lg outline-none focus:border-[#2A6377]"><option value="">Selecione...</option>{listaUsuarios.map(user => (<option key={user.id} value={user.id}>{user.nome}</option>))}</select></div></div><div className="flex justify-end pt-4 border-t"><button type="submit" disabled={carregando} className="bg-[#2A6377] text-white px-6 py-3 rounded-lg font-medium w-full sm:w-auto"><Save size={20} className="inline mr-2"/> Salvar</button></div></form>)}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold mb-4 border-b pb-2">{isAdmin ? 'Todas as Obras' : 'Minhas Obras'}</h3>
              {obrasLista.length === 0 ? (<p className="text-gray-500 text-sm">Nenhuma obra.</p>) : (
                <div className="overflow-x-auto pb-2">
                  <table className="w-full text-left border-collapse min-w-[700px]"><thead><tr className="bg-slate-50 text-slate-600 text-sm border-y"><th className="p-3">Código</th><th className="p-3">Nome</th><th className="p-3">Responsável</th><th className="p-3">Prazo Entrega</th>{isAdmin && <th className="p-3 text-right">Ação</th>}</tr></thead><tbody className="text-sm">{obrasLista.map(obra => (<tr key={obra.id} className="border-b hover:bg-slate-50"><td className="p-3 text-slate-700">{obra.codigo_externo}</td><td className="p-3 font-bold text-[#2A6377]">{obra.nome}</td><td className="p-3 text-slate-600">{obra.usuarios?.nome}</td><td className="p-3 text-slate-600">{formatarDataSegura(obra.data_previsao_fim)}</td><td className="p-3 text-right flex justify-end gap-2"><button onClick={() => abrirPainelObra(obra)} className="text-[#2A6377] bg-[#2A6377]/10 hover:bg-[#2A6377] hover:text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1"><FolderOpen size={14}/> Painel</button>{isAdmin && (<button onClick={() => editarObra(obra)} className="text-slate-400 hover:text-[#2A6377] p-1.5 bg-slate-100 rounded transition"><Edit2 size={14} /></button>)}</td></tr>))}</tbody></table>
                </div>
              )}
            </div>
          </div>
        )}

        {telaAtiva === 'reunioes' && (
           <div className="animate-in fade-in flex flex-col items-start gap-6"><div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border mb-6 border-l-4 border-l-[#2A6377] w-full"><div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div className="flex-1"><label className="block text-sm font-medium mb-2">1. Selecione a Obra para a Reunião</label><select className="w-full max-w-lg border rounded-lg p-3 outline-none font-bold bg-gray-50" value={reuniaoForm.id_obra} onChange={(e) => setReuniaoForm({...reuniaoForm, id_obra: e.target.value})}><option value="">A carregar...</option>{obrasLista.map(obra => (<option key={obra.id} value={obra.id}>{obra.codigo_externo} - {obra.nome}</option>))}</select></div><div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto"><button onClick={salvarReuniaoObra} disabled={carregando || !reuniaoForm.id_obra} className="bg-[#2A6377]/10 text-[#2A6377] px-6 py-3 rounded-lg font-bold flex justify-center items-center gap-2 disabled:opacity-50 flex-1 w-full sm:w-auto"><Loader2 className={`animate-spin shrink-0 ${carregando ? 'block' : 'hidden'}`} size={18} /><Save size={18} className={`shrink-0 ${carregando ? 'hidden' : 'block'}`} /> Salvar</button><button onClick={gerarAtaFinal} disabled={obrasNaAtaAtual.length === 0} className="bg-[#2A6377] text-white px-6 py-3 rounded-lg font-bold flex justify-center items-center gap-2 shadow-md disabled:opacity-50 flex-1 w-full sm:w-auto"><Mail size={18} className="shrink-0" /> Gerar Ata</button></div></div>{obrasNaAtaAtual.length > 0 && (<div className="mt-6 pt-4 border-t flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-gray-500 mr-2">Salvas hoje:</span>{obrasNaAtaAtual.map((ob, idx) => (<span key={idx} className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 truncate"><CheckCheck size={12}/> {ob.nome_obra}</span>))}</div>)}</div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start"><div className="lg:col-span-2 flex flex-col items-start gap-6 w-full">
                 <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border w-full flex flex-col items-start"><h3 className="text-lg font-bold mb-4 border-b pb-2 w-full">2. Resumo</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 w-full items-start"><div><label className="block text-sm mb-1">Data</label><input type="date" className="w-full border rounded-lg p-2 outline-none" value={reuniaoForm.data_reuniao} onChange={(e) => setReuniaoForm({...reuniaoForm, data_reuniao: e.target.value})}/></div><div><label className="block text-sm mb-1">Clima</label><select className="w-full border rounded-lg p-2 outline-none" value={reuniaoForm.clima_semana} onChange={(e) => setReuniaoForm({...reuniaoForm, clima_semana: e.target.value})}><option value="chuvoso">Chuvoso</option><option value="ensolarado">Ensolarado</option><option value="misto">Misto</option></select></div></div><div className="w-full flex flex-col items-start"><label className="block text-sm mb-1">Resumo Geral</label><textarea rows={3} className="w-full border rounded-lg p-3 outline-none" value={reuniaoForm.resumo_geral} onChange={(e) => setReuniaoForm({...reuniaoForm, resumo_geral: e.target.value})}></textarea></div></div>
                 
                 {/* CORREÇÃO DO LAYOUT DE OCORRÊNCIAS (FLEXBOX) */}
                 <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border w-full flex flex-col items-start">
                   <h3 className="text-lg font-bold mb-4 border-b pb-2 w-full">3. Ocorrências</h3>
                   <div className="flex flex-col sm:flex-row gap-3 mb-4 w-full items-start">
                     <select className="border rounded-lg p-2 w-full sm:w-[150px] shrink-0 outline-none" value={novaOcorrencia.tipo} onChange={e => setNovaOcorrencia({...novaOcorrencia, tipo: e.target.value})}>
                       <option value="avanco">Avanço</option><option value="atraso">Atraso</option><option value="financeiro">Financeiro</option>
                     </select>
                     <input type="text" className="border rounded-lg p-2 flex-1 w-full outline-none" placeholder="Ex: Chegou o material..." value={novaOcorrencia.descricao} onChange={e => setNovaOcorrencia({...novaOcorrencia, descricao: e.target.value})} onKeyPress={e => e.key === 'Enter' && adicionarOcorrencia()}/>
                     <button onClick={adicionarOcorrencia} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-bold w-full sm:w-auto shrink-0 transition">Adicionar</button>
                   </div>
                   {listaOcorrencias.map((oc, idx) => (<div key={idx} className="flex justify-between items-center bg-slate-50 p-2 mt-2 rounded border text-sm w-full"><div><span className="font-semibold text-[#2A6377] capitalize truncate">{labelOcorrencia(oc.tipo)}:</span> {oc.descricao}</div><button onClick={() => setListaOcorrencias(listaOcorrencias.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 ml-2 shrink-0"><Trash2 size={16} className="shrink-0" /></button></div>))}
                 </div>
                 
                 {/* CORREÇÃO DO LAYOUT DE TAREFAS (FLEXBOX) */}
                 <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border w-full flex flex-col items-start">
                   <h3 className="text-lg font-bold mb-4 border-b pb-2 w-full">4. Gerar Tarefas</h3>
                   <div className="flex flex-col sm:flex-row gap-3 mb-3 w-full items-start">
                     <input type="text" className="border rounded-lg p-2 flex-1 w-full outline-none" placeholder="O que precisa ser feito..." value={novaTarefa.titulo} onChange={e => setNovaTarefa({...novaTarefa, titulo: e.target.value})} />
                     <input type="date" className="border rounded-lg p-2 w-full sm:w-[160px] shrink-0 outline-none" value={novaTarefa.data_vencimento} onChange={e => setNovaTarefa({...novaTarefa, data_vencimento: e.target.value})} />
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3 mb-4 w-full items-start">
                     <select className="border rounded-lg p-2 flex-1 w-full outline-none" value={novaTarefa.id_responsavel} onChange={e => setNovaTarefa({...novaTarefa, id_responsavel: e.target.value})}>
                       <option value="">Atribuir a...</option>{listaUsuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                     </select>
                     <button onClick={adicionarTarefa} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-bold w-full sm:w-auto shrink-0 transition">Adicionar</button>
                   </div>
                   {listaTarefas.map((tar, idx) => (<div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 p-3 mt-2 rounded border text-sm gap-2 w-full"><div><span className="font-semibold block truncate">{tar.titulo}</span><div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1"><span className="flex items-center gap-1 truncate"><User size={12} className="shrink-0"/> {tar.nome_responsavel}</span>{tar.data_vencimento && <span className="flex items-center gap-1 truncate"><Clock size={12} className="shrink-0"/> Prazo: {formatarDataSegura(tar.data_vencimento)}</span>}</div></div><button onClick={() => setListaTarefas(listaTarefas.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 bg-white p-2 rounded shadow-sm border self-end sm:self-auto shrink-0"><Trash2 size={16} className="shrink-0" /></button></div>))}
                 </div>
               </div>
               <div className="bg-slate-50 p-4 md:p-6 rounded-xl border w-full flex flex-col items-start"><h3 className="text-lg font-bold mb-6 flex items-center gap-2 truncate"><Clock size={20} className="text-slate-500 shrink-0" /> Histórico Unificado</h3>{historicoObra.length === 0 ? (<p className="text-sm text-gray-500 truncate">Sem histórico.</p>) : (<div className="space-y-4 w-full">{historicoObra.map((hist, idx) => (<button key={idx} onClick={() => { setDetalhesHistorico(hist); setModalHistoricoAberto(true); }} className="w-full text-left bg-white p-4 rounded-lg border shadow-sm hover:border-[#2A6377] transition group w-full"><div className="flex justify-between items-center mb-2"><span className="font-bold text-[#2A6377] flex items-center gap-2 truncate"><Calendar size={16} className="shrink-0"/> {hist.dataFormatada}</span><span className="text-xs bg-slate-100 px-2 py-1 rounded-full group-hover:bg-[#2A6377]/10 group-hover:text-[#2A6377] shrink-0">Detalhes</span></div><div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-slate-500 mt-2 border-t pt-2"><span>{hist.resumos.length} Resumo(s)</span><span>•</span><span>{hist.ocorrencias.length} Ocorrência(s)</span><span>•</span><span>{hist.tarefas.length} Tarefa(s)</span></div></button>))}</div>)}</div>
             </div>
           </div>
        )}

        {telaAtiva === 'tarefas' && (
           <div className="animate-in fade-in h-full flex flex-col">
             <header className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4"><div><h2 className="text-2xl md:text-3xl font-bold text-gray-800 truncate">Kanban Geral</h2></div><div className="flex items-center gap-2 shrink-0"><label className="text-sm font-medium text-gray-500 shrink-0">Filtrar:</label><select className="border rounded-lg p-2 outline-none font-medium bg-white shadow-sm w-full sm:w-auto shrink-0" value={filtroObraKanban} onChange={(e) => setFiltroObraKanban(e.target.value)}><option value="todas">Todas as Obras</option>{obrasLista.map(o => <option key={o.id} value={o.id}>{o.codigo_externo} - {o.nome}</option>)}</select></div></header>
             <div className="flex gap-6 overflow-x-auto pb-4 items-start flex-1">
               <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-gray-100/50 rounded-xl p-4 border flex flex-col">
                 <div className="flex justify-between items-center mb-4"><h3 className="font-bold truncate">A Fazer</h3><span className="bg-gray-200 text-xs px-2 py-1 rounded-full shrink-0">{tarefasFiltradas.filter(t => t?.status === 'pendente').length}</span></div>
                 <div className="space-y-3">
                   {tarefasFiltradas.filter(t => t?.status === 'pendente').map(tarefa => (
                     <div key={tarefa?.id} onClick={() => setTarefaSelecionada(tarefa)} className="bg-white p-4 rounded-lg shadow-sm border hover:border-[#2A6377] transition group cursor-pointer relative">
                       <div className="flex justify-between items-start mb-2"><span className="text-xs font-semibold text-[#2A6377] bg-[#2A6377]/10 px-2 py-1 rounded truncate">{tarefa?.obras?.codigo_externo || 'Geral'}</span><span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px] shrink-0 ml-1"><User size={10} className="shrink-0"/> {tarefa?.usuarios?.nome || 'Geral'}</span></div>
                       <p className="font-medium text-sm my-3 truncate">{tarefa?.titulo || 'Sem Título'}</p>
                       <div className="flex justify-between items-center border-t pt-3 mt-3 flex-wrap gap-2">
                         <div className="flex items-center gap-2 shrink-0 flex-wrap">
                           <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 shrink-0 ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}><Clock size={12} className="shrink-0" /> Prazo: {formatarDataSegura(tarefa?.data_vencimento)}</div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-[#2A6377]/5 rounded-xl p-4 border border-[#2A6377]/20 flex flex-col">
                 <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-700 truncate">Em Andamento</h3><span className="bg-[#2A6377]/20 text-[#2A6377] text-xs px-2 py-1 rounded-full shrink-0">{tarefasFiltradas.filter(t => t?.status === 'em_andamento').length}</span></div>
                 <div className="space-y-3">
                   {tarefasFiltradas.filter(t => t?.status === 'em_andamento').map(tarefa => (
                     <div key={tarefa?.id} onClick={() => setTarefaSelecionada(tarefa)} className={`bg-white p-4 rounded-lg shadow-sm border cursor-pointer relative ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? 'border-red-300' : 'border-gray-200 hover:border-[#2A6377]'}`}>
                       <div className="flex justify-between items-start mb-2"><span className="text-xs font-semibold text-[#2A6377] bg-[#2A6377]/10 px-2 py-1 rounded truncate">{tarefa?.obras?.codigo_externo || 'Geral'}</span><span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px] shrink-0 ml-1"><User size={10} className="shrink-0"/> {tarefa?.usuarios?.nome || 'Geral'}</span></div>
                       <p className="font-medium text-sm my-3 truncate">{tarefa?.titulo || 'Sem Título'}</p>
                       <div className="flex justify-between items-center border-t pt-3 mt-3 flex-wrap gap-2">
                         <div className="flex items-center gap-2 shrink-0 flex-wrap">
                           <div className={`text-xs px-2 py-1 rounded flex items-center gap-1 shrink-0 ${isAtrasada(tarefa?.data_vencimento, tarefa?.status) ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}><Clock size={12} className="shrink-0" /> Prazo: {formatarDataSegura(tarefa?.data_vencimento)}</div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               <div className="flex-1 min-w-[280px] md:min-w-[300px] bg-green-50/30 rounded-xl p-4 border border-green-100 flex flex-col">
                 <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-700 truncate">Concluídas</h3><span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full shrink-0">{tarefasFiltradas.filter(t => t?.status === 'concluida').length}</span></div>
                 <div className="space-y-3">
                   {tarefasFiltradas.filter(t => t?.status === 'concluida').map(tarefa => (
                      <div key={tarefa?.id} onClick={() => setTarefaSelecionada(tarefa)} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 opacity-70 cursor-pointer relative hover:border-[#2A6377]">
                       <div className="flex justify-between items-start mb-2"><span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded truncate">{tarefa?.obras?.codigo_externo || 'Geral'}</span><span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px] shrink-0 ml-1"><User size={10} className="shrink-0"/> {tarefa?.usuarios?.nome || 'Geral'}</span></div>
                       <p className="font-medium text-gray-500 line-through text-sm my-3 truncate">{tarefa?.titulo || 'Sem Título'}</p>
                       <div className="flex justify-end border-t pt-3 mt-3"><div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-600 shrink-0 ml-auto"><CheckCircle2 size={12} className="shrink-0" /> Feito</div></div>
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