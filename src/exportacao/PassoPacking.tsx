// Passo 7: Packing List (romaneio no modelo da Kalter). Os materiais vem das SMAs de transferencia do centro de custo da obra;
// pesos, medidas e unidade aduaneira vem do ERP ou de estimativa (em azul ate alguem digitar ou aceitar).
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { arredondar, num, somar } from "./numeros";
import {
  aceitarSugestoes,
  aplicarFamilia,
  brutoPorPercentual,
  editarMaterial,
  mesclarSma,
  type CampoMaterial,
} from "./processo";
import { UN_NOME, m3Material, qtdAduaneira } from "./regras";
import type { PropsPasso } from "./passos";
import type { Material, Processo, TabelaEstimativas } from "./tipos";
import { Aviso, Botao, CampoNumero, CampoProcesso, Cartao, Secao, Titulo, classeCelula, classeEstimado, dataBR, fmtBR, lerNumero } from "./ui";

const TH = "text-left text-[11px] uppercase tracking-wide text-slate-500 font-semibold px-1.5 py-1.5 bg-slate-50 border-b whitespace-nowrap sticky top-0 z-10";

interface PropsLinha {
  m: Material;
  i: number;
  onEditar: (i: number, campo: CampoMaterial, valor: string | number) => void;
  onAceitar: (i: number) => void;
}

const LinhaMaterial = memo(function LinhaMaterial({ m, i, onEditar, onAceitar }: PropsLinha) {
  const est = (c: string) => (m.estimado ?? []).includes(c);
  const [qe, auto] = qtdAduaneira({ ...m, qtd_estat: "" });
  const dims = num(m.comp) > 0 && num(m.larg) > 0 && num(m.alt) > 0;
  const falta = num(m.qtd_atend) < num(m.quantidade);
  const ue = (m.un_estat ?? "").toLowerCase();
  const fonte = m.fonte_est ?? "";
  const dicaBruto = `Estimado: líquido + 1,5%${m.bruto_un_est ? " ou o peso bruto do fabricante" : ""}`;
  const num3 = (campo: CampoMaterial, valor: unknown, estimado: boolean, titulo: string, largura = "w-[78px]") => (
    <td className={`px-1 py-1 ${largura}`}>
      <CampoNumero
        rotuloAcessivel={`${campo} do material ${m.codigo}`}
        valor={valor}
        casas={3}
        classe={classeCelula}
        estimado={estimado}
        titulo={estimado ? titulo : undefined}
        onChange={(v) => onEditar(i, campo, v)}
      />
    </td>
  );
  return (
    <tr className="border-b border-slate-100 align-top hover:bg-slate-50/60">
      <td className="px-1.5 py-1.5 text-xs tabular-nums text-slate-500">{m.sma}</td>
      <td className="px-1.5 py-1.5 text-xs tabular-nums whitespace-nowrap">{m.codigo}</td>
      <td className="px-1.5 py-1.5 text-xs min-w-[200px]">{m.descricao}</td>
      <td className="px-1.5 py-1.5 text-xs tabular-nums whitespace-nowrap">{m.ncm || <span className="text-red-600">sem NCM</span>}</td>
      <td className="px-1.5 py-1.5 text-xs text-right tabular-nums whitespace-nowrap">
        {fmtBR(m.qtd_solic, 2)} {m.unidade}
        <div className={`text-[10px] ${falta ? "text-amber-700 font-semibold" : "text-slate-400"}`}>atend. {fmtBR(m.qtd_atend, 2)}</div>
      </td>
      <td className="px-1 py-1 w-[70px]">
        <CampoNumero
          rotuloAcessivel={`Quantidade a embarcar de ${m.codigo}`}
          valor={m.quantidade}
          zeroVisivel
          casas={3}
          classe={classeCelula}
          onChange={(v) => onEditar(i, "quantidade", v)}
        />
      </td>
      <td className="px-1 py-1 w-[140px]">
        <select
          aria-label={`Unidade aduaneira de ${m.codigo}`}
          value={ue}
          title={est("un_estat") ? "Sugerida: o NCM não tem unidade no ERP; nesse capítulo da NCM a unidade estatística é kg" : undefined}
          onChange={(e) => onEditar(i, "un_estat", e.target.value)}
          className={`${classeCelula} ${est("un_estat") ? classeEstimado : ""} ${ue ? "" : "!border-red-400 !text-red-600"}`}
        >
          <option value="">— escolha —</option>
          {Object.entries(UN_NOME).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
      </td>
      <td className="px-1 py-1 w-[80px]">
        <CampoNumero
          rotuloAcessivel={`Quantidade aduaneira de ${m.codigo}`}
          valor={m.qtd_estat}
          casas={3}
          classe={classeCelula}
          titulo="Vazio = calculado automaticamente"
          placeholder={auto && qe != null ? fmtBR(qe, 3) : "digite"}
          onChange={(v) => onEditar(i, "qtd_estat", v === 0 ? "" : v)}
        />
      </td>
      {num3("peso_liq", m.peso_liq, est("peso_liq"), `Estimado: ${fonte}`)}
      {num3("peso_bruto", m.peso_bruto, est("peso_bruto"), dicaBruto)}
      {num3("comp", m.comp, est("comp"), `Estimado: ${fonte}`, "w-[66px]")}
      {num3("larg", m.larg, est("larg"), `Estimado: ${fonte}`, "w-[66px]")}
      {num3("alt", m.alt, est("alt"), `Estimado: ${fonte}`, "w-[66px]")}
      <td className="px-1 py-1 w-[130px]">
        <input
          list="dl-embalagens"
          aria-label={`Tipo de volume de ${m.codigo}`}
          value={m.tipo_volume ?? ""}
          autoComplete="off"
          onChange={(e) => onEditar(i, "tipo_volume", e.target.value)}
          className={classeCelula}
        />
      </td>
      <td className="px-1 py-1 w-[84px]">
        <CampoNumero
          rotuloAcessivel={`Volume em m³ de ${m.codigo}`}
          valor={dims ? 0 : m.m3}
          casas={3}
          classe={classeCelula}
          estimado={dims && ["comp", "larg", "alt"].some(est)}
          desabilitado={dims}
          titulo="Calculado pelas dimensões × quantidade; sem dimensões, digite o m³"
          placeholder={dims ? fmtBR(m3Material(m), 3) : ""}
          onChange={(v) => onEditar(i, "m3", v)}
        />
      </td>
      <td className="px-1.5 py-1 whitespace-nowrap">
        {(m.estimado ?? []).length ? (
          <Botao tamanho="pequeno" onClick={() => onAceitar(i)} titulo="Aceitar os valores em azul desta linha como corretos">
            Aceitar
          </Botao>
        ) : (m.aceito ?? []).length ? (
          <span className="text-[11px] text-slate-400" title="Sugestão aceita">
            ✓ aceito
          </span>
        ) : null}
      </td>
    </tr>
  );
});

type Dialogo = { modo: "familia"; familia: string; descricao: string } | { modo: "todos" } | null;

export function PassoPacking({
  proc,
  atualizar,
  modificar,
  tabela,
  podeReler,
  onReler,
}: PropsPasso & {
  modificar: (fn: (p: Processo) => Processo) => void;
  tabela: TabelaEstimativas;
  podeReler: boolean;
  onReler: () => Promise<Material[] | null>;
}) {
  const materiais = useMemo(() => proc.packing?.materiais ?? [], [proc.packing?.materiais]);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [textoTipo, setTextoTipo] = useState("Caixa de madeira");
  const [textoPct, setTextoPct] = useState("");
  const [mensagem, setMensagem] = useState<{ tom: "ok" | "aviso"; texto: string } | null>(null);
  const [relendo, setRelendo] = useState(false);

  const editar = useCallback(
    (i: number, campo: CampoMaterial, valor: string | number) =>
      modificar((p) => ({ ...p, packing: { ...p.packing!, materiais: p.packing!.materiais.map((m, k) => (k === i ? editarMaterial(m, campo, valor) : m)) } })),
    [modificar],
  );
  const aceitar = useCallback(
    (i: number) =>
      modificar((p) => ({ ...p, packing: { ...p.packing!, materiais: p.packing!.materiais.map((m, k) => (k === i ? aceitarSugestoes(m) : m)) } })),
    [modificar],
  );
  const trocarMateriais = (fn: (ms: Material[]) => Material[]) =>
    modificar((p) => ({ ...p, packing: { ...p.packing!, materiais: fn(p.packing!.materiais) } }));

  const ativos = materiais.filter((m) => num(m.quantidade) > 0);
  const estimados = ativos.filter((m) => (m.estimado ?? []).length).length;
  const faltando = ativos.filter((m) => !num(m.peso_liq) || !num(m.peso_bruto) || !m3Material(m)).length;
  const pesoLiq = somar(ativos.map((m) => num(m.peso_liq)));
  const pesoBruto = somar(ativos.map((m) => num(m.peso_bruto)));
  const m3 = somar(ativos.map((m) => m3Material(m)));

  const reler = async () => {
    setRelendo(true);
    setMensagem(null);
    try {
      const doErp = await onReler();
      if (!doErp) {
        setMensagem({ tom: "aviso", texto: "O robô ainda não leu a lista de SMA desta obra." });
        return;
      }
      const r = mesclarSma(materiais, doErp, tabela);
      trocarMateriais(() => r.materiais);
      modificar((p) => ({ ...p, packing: { ...p.packing!, lido_em: new Date().toISOString().slice(0, 10) } }));
      setMensagem({ tom: "ok", texto: `Lista relida: ${r.materiais.length} materiais (${r.entraram} novos, ${r.sairam} saíram da SMA).` });
    } finally {
      setRelendo(false);
    }
  };

  const confirmarDialogo = () => {
    if (!dialogo) return;
    const pct = textoPct.trim() ? lerNumero(textoPct) : null;
    if (dialogo.modo === "familia") trocarMateriais((ms) => aplicarFamilia(ms, dialogo.familia, textoTipo, pct));
    else if (pct !== null) trocarMateriais((ms) => brutoPorPercentual(ms, pct));
    setDialogo(null);
  };
  const abrirDialogo = (d: NonNullable<Dialogo>) => {
    setTextoTipo("Caixa de madeira");
    setTextoPct(d.modo === "todos" ? "1,5" : "");
    setDialogo(d);
  };
  const aceitarFamilia = (familia: string) => {
    const q = materiais.filter((m) => m.familia === familia && (m.estimado ?? []).length).length;
    if (window.confirm(`Aceitar as sugestões (valores em azul) de ${q} material(is) da família ${familia}?`))
      trocarMateriais((ms) => ms.map((m) => (m.familia === familia ? aceitarSugestoes(m) : m)));
  };
  const aceitarTodas = () => {
    if (window.confirm(`Aceitar as sugestões (valores em azul) de todos os ${estimados} materiais? Confira antes os que forem importantes.`))
      trocarMateriais((ms) => ms.map(aceitarSugestoes));
  };

  const linhas: ReactNode[] = [];
  let familiaAtual: string | undefined;
  materiais.forEach((m, i) => {
    if (m.familia !== familiaAtual) {
      familiaAtual = m.familia;
      const fam = m.familia ?? "";
      const temEstimado = materiais.some((x) => x.familia === fam && (x.estimado ?? []).length);
      linhas.push(
        <tr key={`fam-${fam}-${i}`} className="bg-slate-100">
          <td colSpan={16} className="px-2 py-1.5 text-xs font-semibold text-slate-700">
            CONJUNTO {m.familia_desc || fam} <span className="font-normal text-slate-500">({fam})</span>
            <span className="ml-3 inline-flex gap-1.5 align-middle">
              <Botao tamanho="pequeno" onClick={() => abrirDialogo({ modo: "familia", familia: fam, descricao: m.familia_desc || fam })}>
                Aplicar à família…
              </Botao>
              {temEstimado && (
                <Botao tamanho="pequeno" onClick={() => aceitarFamilia(fam)}>
                  Aceitar sugestões da família
                </Botao>
              )}
            </span>
          </td>
        </tr>,
      );
    }
    linhas.push(<LinhaMaterial key={`${m.sma}-${m.seq}`} m={m} i={i} onEditar={editar} onAceitar={aceitar} />);
  });

  return (
    <div className="space-y-4">
      <Titulo
        titulo="Packing List"
        descricao={`Romaneio no modelo da Kalter. Os materiais vêm do gerenciador de SMA do centro de custo ${proc.packing?.cc ?? ""} (lido em ${dataBR(proc.packing?.lido_em)}; SMAs canceladas ficam fora).`}
      />
      <Secao titulo="Cabeçalho do romaneio">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="documento.descricao_geral" rotulo="Equipamento (descrição geral)" tipo="area" className="sm:col-span-2 lg:col-span-4" />
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="embarque.nf" rotulo="NF nº" />
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="embarque.qtd_volumes" rotulo="Nº de volumes" tipo="numero" casas={0} />
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="embarque.transportadora" rotulo="Transportadora" />
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="embarque.data_saida" rotulo="Data de saída da mercadoria" tipo="data" />
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="embarque.placa" rotulo="Placa do veículo" />
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="embarque.motorista" rotulo="Motorista" />
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="embarque.data_romaneio" rotulo="Data de emissão do romaneio" tipo="data" />
          <CampoProcesso proc={proc} atualizar={atualizar} caminho="embarque.carregamento" rotulo="Nº do carregamento" />
        </div>
      </Secao>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Cartao rotulo="Materiais" valor={ativos.length} sub={`de ${materiais.length} na SMA`} />
        <Cartao rotulo="Peso líquido / bruto" valor={`${fmtBR(pesoLiq, 1)} / ${fmtBR(pesoBruto, 1)}`} sub="kg" />
        <Cartao rotulo="Volume cúbico" valor={fmtBR(arredondar(m3, 3), 2)} sub="m³" />
        <Cartao rotulo="Faltando" valor={faltando} sub="sem peso ou m³" tom={faltando ? "erro" : "ok"} />
        <Cartao rotulo="Estimados" valor={estimados} sub="materiais com valor em azul" tom="azul" />
      </div>

      <div className="text-xs text-slate-500 space-y-1">
        <p>
          <span className={`px-1.5 py-0.5 rounded ${classeEstimado}`}>Em azul</span> = valor estimado (passe o mouse para ver a fonte): peso e medidas pelos catálogos dos
          fabricantes e tabelas técnicas; peso bruto = líquido + 1,5% (ou o bruto do fabricante, quando ele informa). Ao digitar, o valor deixa de ser estimado; se a sugestão
          estiver certa, clique em <b>Aceitar</b> na linha (ou nos botões de família/todas).
        </p>
        <p>
          Unidade aduaneira = unidade estatística do NCM no cadastro fiscal do ERP; a quantidade nela é calculada quando possível (kg = peso líquido; un = peças). Onde aparece “— escolha —”
          (vermelho), o NCM não tem unidade no ERP: escolha na lista. Dimensões em mm, por unidade: m³ = C × L × A × quantidade.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Botao onClick={() => void reler()} desabilitado={!podeReler || relendo} titulo={podeReler ? "Busca a lista da SMA que o robô leu no ERP e mantém o que já foi digitado" : "O robô ainda não leu o ERP desta obra"}>
          <RefreshCw size={14} className={relendo ? "animate-spin" : ""} /> Reler lista da SMA no ERP
        </Botao>
        <Botao onClick={() => abrirDialogo({ modo: "todos" })}>Peso bruto = líquido + % (todos)</Botao>
        {estimados > 0 && <Botao onClick={aceitarTodas}>Aceitar todas as sugestões</Botao>}
      </div>
      {mensagem && <Aviso tom={mensagem.tom}>{mensagem.texto}</Aviso>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-auto max-h-[560px]">
        <table className="w-full min-w-[1280px] border-collapse">
          <thead>
            <tr>
              <th className={TH}>SMA</th>
              <th className={TH}>Código</th>
              <th className={TH}>Descrição</th>
              <th className={TH}>NCM</th>
              <th className={`${TH} text-right`}>Solicitada</th>
              <th className={`${TH} text-right`}>Embarcar</th>
              <th className={TH}>Unid. aduaneira</th>
              <th className={`${TH} text-right`}>Qtde aduaneira</th>
              <th className={`${TH} text-right`}>Peso líq. (kg)</th>
              <th className={`${TH} text-right`}>Peso bruto (kg)</th>
              <th className={`${TH} text-right`}>Comp. (mm)</th>
              <th className={`${TH} text-right`}>Larg. (mm)</th>
              <th className={`${TH} text-right`}>Alt. (mm)</th>
              <th className={TH}>Volume tipo</th>
              <th className={`${TH} text-right`}>m³</th>
              <th className={TH}>Sugestão</th>
            </tr>
          </thead>
          <tbody>
            {linhas}
            {!materiais.length && (
              <tr>
                <td colSpan={16} className="px-3 py-6 text-center text-sm text-slate-400">
                  Nenhum material em SMA de transferência para este centro de custo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDialogo(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h3 className="font-bold text-slate-800">{dialogo.modo === "familia" ? `Aplicar à família ${dialogo.descricao}` : "Peso bruto = líquido + %"}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {dialogo.modo === "familia"
                  ? "Preenche o tipo de volume e/ou o percentual do peso bruto de todos os materiais do conjunto."
                  : "Vale para todos os materiais com peso líquido e sem peso bruto digitado (inclusive os estimados em azul, que passam a valer como informados)."}
              </p>
            </div>
            <div className="p-4 space-y-3">
              {dialogo.modo === "familia" && (
                <div>
                  <label htmlFor="dlg-tipo" className="block text-xs font-semibold text-slate-600 mb-1">
                    Tipo de volume (vazio = não mudar)
                  </label>
                  <input id="dlg-tipo" list="dl-embalagens" value={textoTipo} onChange={(e) => setTextoTipo(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
                </div>
              )}
              <div>
                <label htmlFor="dlg-pct" className="block text-xs font-semibold text-slate-600 mb-1">
                  Peso bruto = peso líquido + quantos % {dialogo.modo === "familia" ? "(vazio = não mudar)" : ""}
                </label>
                <input id="dlg-pct" inputMode="decimal" value={textoPct} onChange={(e) => setTextoPct(e.target.value)} placeholder="1,5" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2">
              <Botao onClick={() => setDialogo(null)}>Cancelar</Botao>
              <Botao tipo="primario" onClick={confirmarDialogo}>
                Aplicar
              </Botao>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
