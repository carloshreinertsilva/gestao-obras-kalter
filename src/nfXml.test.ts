import { describe, expect, it } from "vitest";
import { decodificarXml, diferencasXml, formatarDocumento, leituraUtil, lerNfXml, mesmoDocumento, normalizarNumeroNf, resumoXml } from "./nfXml";

// Exemplos sinteticos fieis aos layouts (CNPJs e nomes ficticios). Nenhum XML real foi anexado ainda em nfs_terceiros.

const NACIONAL = `<?xml version="1.0" encoding="UTF-8"?>
<NFSe versao="1.00" xmlns="http://www.sped.fazenda.gov.br/nfse">
  <infNFSe Id="NFS42054072212345678000190000000000004726110000000000">
    <xLocEmi>Joinville</xLocEmi>
    <nNFSe>000472</nNFSe>
    <dhProc>2026-11-05T10:12:44-03:00</dhProc>
    <emit>
      <CNPJ>12345678000190</CNPJ>
      <xNome>PRESTADORA EXEMPLO LTDA</xNome>
    </emit>
    <valores>
      <vBC>1500.00</vBC>
      <vLiq>1380.00</vLiq>
    </valores>
    <DPS versao="1.00">
      <infDPS Id="DPS1">
        <dhEmi>2026-11-04T22:30:00-03:00</dhEmi>
        <nDPS>15</nDPS>
        <prest><CNPJ>12345678000190</CNPJ></prest>
        <toma><CNPJ>98765432000110</CNPJ><xNome>CONSTRUTORA FICTICIA SA</xNome></toma>
        <valores><vServPrest><vServ>1500.00</vServ></vServPrest></valores>
      </infDPS>
    </DPS>
  </infNFSe>
</NFSe>`;

const ABRASF_20 = `<?xml version="1.0" encoding="utf-8"?>
<ConsultarNfseRpsResposta xmlns="http://www.abrasf.org.br/nfse.xsd">
  <CompNfse>
    <Nfse versao="2.02">
      <InfNfse Id="nfse123">
        <Numero>202600000000123</Numero>
        <CodigoVerificacao>ABC123</CodigoVerificacao>
        <DataEmissao>2026-11-05T09:00:00</DataEmissao>
        <ValoresNfse><BaseCalculo>2000.00</BaseCalculo><ValorLiquidoNfse>1890.50</ValorLiquidoNfse></ValoresNfse>
        <PrestadorServico>
          <IdentificacaoPrestador><CpfCnpj><Cnpj>11222333000144</Cnpj></CpfCnpj></IdentificacaoPrestador>
          <RazaoSocial>SERVICOS FICTICIOS ME</RazaoSocial>
        </PrestadorServico>
        <DeclaracaoPrestacaoServico>
          <InfDeclaracaoPrestacaoServico>
            <Rps><IdentificacaoRps><Numero>77</Numero><Serie>A</Serie></IdentificacaoRps><DataEmissao>2026-11-01</DataEmissao></Rps>
            <Competencia>2026-10-01</Competencia>
            <Servico><Valores><ValorServicos>2000.00</ValorServicos><ValorIss>40.00</ValorIss></Valores></Servico>
            <Prestador><CpfCnpj><Cnpj>11222333000144</Cnpj></CpfCnpj></Prestador>
            <TomadorServico><IdentificacaoTomador><CpfCnpj><Cnpj>98765432000110</Cnpj></CpfCnpj></IdentificacaoTomador></TomadorServico>
          </InfDeclaracaoPrestacaoServico>
        </DeclaracaoPrestacaoServico>
      </InfNfse>
    </Nfse>
  </CompNfse>
</ConsultarNfseRpsResposta>`;

// ABRASF 1.0 com prefixos de namespace (ex.: Ginfes/ISSNet)
const ABRASF_10 = `<?xml version="1.0" encoding="UTF-8"?>
<ns3:CompNfse xmlns:ns3="http://www.ginfes.com.br/servico_consultar_nfse_resposta_v03.xsd" xmlns:ns4="http://www.ginfes.com.br/tipos_v03.xsd">
  <ns4:Nfse>
    <ns4:InfNfse>
      <ns4:Numero>58</ns4:Numero>
      <ns4:DataEmissao>2026-10-30T16:45:10</ns4:DataEmissao>
      <ns4:IdentificacaoRps><ns4:Numero>9</ns4:Numero></ns4:IdentificacaoRps>
      <ns4:Servico><ns4:Valores><ns4:ValorServicos>850</ns4:ValorServicos><ns4:ValorLiquidoNfse>850</ns4:ValorLiquidoNfse></ns4:Valores></ns4:Servico>
      <ns4:PrestadorServico>
        <ns4:IdentificacaoPrestador><ns4:Cnpj>55666777000188</ns4:Cnpj></ns4:IdentificacaoPrestador>
        <ns4:RazaoSocial>MONTAGENS EXEMPLO LTDA &amp; CIA</ns4:RazaoSocial>
      </ns4:PrestadorServico>
      <ns4:TomadorServico><ns4:IdentificacaoTomador><ns4:CpfCnpj><ns4:Cnpj>98765432000110</ns4:Cnpj></ns4:CpfCnpj></ns4:IdentificacaoTomador></ns4:TomadorServico>
    </ns4:InfNfse>
  </ns4:Nfse>
</ns3:CompNfse>`;

const SAO_PAULO = `<?xml version="1.0" encoding="UTF-8"?>
<RetornoConsulta xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho Versao="1" xmlns=""><Sucesso>true</Sucesso></Cabecalho>
  <NFe xmlns="">
    <ChaveNFe><InscricaoPrestador>12345678</InscricaoPrestador><NumeroNFe>00004321</NumeroNFe><CodigoVerificacao>XYZ</CodigoVerificacao></ChaveNFe>
    <DataEmissaoNFe>2026-11-03T14:20:00</DataEmissaoNFe>
    <ChaveRPS><NumeroRPS>12</NumeroRPS></ChaveRPS>
    <DataEmissaoRPS>2026-11-02</DataEmissaoRPS>
    <CPFCNPJPrestador><CNPJ>22333444000155</CNPJ></CPFCNPJPrestador>
    <RazaoSocialPrestador>CONSULTORIA PAULISTA FICTICIA</RazaoSocialPrestador>
    <StatusNFe>N</StatusNFe>
    <ValorServicos>3200.5</ValorServicos>
    <CPFCNPJTomador><CNPJ>98765432000110</CNPJ></CPFCNPJTomador>
  </NFe>
</RetornoConsulta>`;

const NFE_55 = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe><infNFe Id="NFe4226..." versao="4.00">
    <ide><cUF>42</cUF><nNF>9876</nNF><serie>1</serie><dhEmi>2026-11-05T23:50:00-03:00</dhEmi></ide>
    <emit><CNPJ>33444555000166</CNPJ><xNome>DISTRIBUIDORA FICTICIA LTDA</xNome></emit>
    <dest><CNPJ>98765432000110</CNPJ></dest>
    <det nItem="1"><prod><vProd>100.00</vProd></prod></det>
    <total><ICMSTot><vProd>1200.00</vProd><vNF>1234.56</vNF></ICMSTot></total>
  </infNFe></NFe>
</nfeProc>`;

describe("lerNfXml por layout", () => {
  it("NFS-e padrao nacional: dhProc como emissao, bruto vServ, aviso com liquido", () => {
    const l = lerNfXml(NACIONAL)!;
    expect(l.tipo).toBe("nfse");
    expect(l.numero).toBe("472");
    expect(l.emissao).toBe("2026-11-05");
    expect(l.valor).toBe(1500);
    expect(l.cnpjEmitente).toBe("12345678000190");
    expect(l.nomeEmitente).toBe("PRESTADORA EXEMPLO LTDA");
    expect(l.cnpjTomador).toBe("98765432000110");
    expect(l.avisos.some((a) => a.includes("líquido") && a.includes("1.380,00"))).toBe(true);
    expect(l.avisos.some((a) => a.includes("DPS"))).toBe(true);
  });

  it("ABRASF 2.0x: numero da nota (nao do RPS), DataEmissao da nota, bruto x liquido", () => {
    const l = lerNfXml(ABRASF_20)!;
    expect(l.tipo).toBe("nfse");
    expect(l.numero).toBe("202600000000123");
    expect(l.emissao).toBe("2026-11-05");
    expect(l.valor).toBe(2000);
    expect(l.cnpjEmitente).toBe("11222333000144");
    expect(l.cnpjTomador).toBe("98765432000110");
    expect(l.nomeEmitente).toBe("SERVICOS FICTICIOS ME");
    expect(l.avisos.join(" ")).toContain("1.890,50");
  });

  it("ABRASF 1.0 com prefixos de namespace e entidade no nome", () => {
    const l = lerNfXml(ABRASF_10)!;
    expect(l).toMatchObject({ tipo: "nfse", numero: "58", emissao: "2026-10-30", valor: 850, cnpjEmitente: "55666777000188" });
    expect(l.nomeEmitente).toBe("MONTAGENS EXEMPLO LTDA & CIA");
    expect(l.avisos).toEqual([]); // liquido igual ao bruto: sem aviso
  });

  it("Prefeitura de Sao Paulo: zeros a esquerda fora, data da NFS-e (nao do RPS)", () => {
    const l = lerNfXml(SAO_PAULO)!;
    expect(l).toMatchObject({ tipo: "nfse", numero: "4321", emissao: "2026-11-03", valor: 3200.5, cnpjEmitente: "22333444000155" });
    expect(l.cnpjTomador).toBe("98765432000110");
  });

  it("Sao Paulo cancelada avisa", () => {
    const l = lerNfXml(SAO_PAULO.replace("<StatusNFe>N", "<StatusNFe>C"))!;
    expect(l.avisos.join(" ")).toContain("CANCELADA");
  });

  it("NF-e modelo 55", () => {
    const l = lerNfXml(NFE_55)!;
    expect(l).toMatchObject({ tipo: "nfe", numero: "9876", emissao: "2026-11-05", valor: 1234.56, cnpjEmitente: "33444555000166" });
  });

  it("nota escapada dentro de resposta SOAP", () => {
    const esc = ABRASF_10.replace(/<\?xml[^>]*\?>/, "").replace(/&amp;/g, "&amp;amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const soap = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Resp><outputXML>${esc}</outputXML></Resp></soap:Body></soap:Envelope>`;
    expect(lerNfXml(soap)).toMatchObject({ tipo: "nfse", numero: "58", valor: 850 });
  });
});

describe("lerNfXml: o que nao da para ler", () => {
  it("XML invalido / corrompido / vazio devolve null", () => {
    expect(lerNfXml("")).toBeNull();
    expect(lerNfXml("isto nao e xml")).toBeNull();
    expect(lerNfXml(NFE_55.slice(0, 300))).toBeNull(); // cortado no meio
    expect(lerNfXml("<a><b></a></b>")).toBeNull();
  });

  it("evento de cancelamento da NF-e e desconhecido", () => {
    const ev = `<procEventoNFe versao="1.00"><evento><infEvento><tpEvento>110111</tpEvento><dhEvento>2026-11-06T10:00:00-03:00</dhEvento></infEvento></evento></procEventoNFe>`;
    const l = lerNfXml(ev)!;
    expect(l.tipo).toBe("desconhecido");
    expect(leituraUtil(l)).toBe(false);
  });

  it("XML de outro tipo (nao e nota) e desconhecido", () => {
    const l = lerNfXml(`<pedido><numero>5</numero><valor>10.00</valor></pedido>`)!;
    expect(l.tipo).toBe("desconhecido");
    expect(leituraUtil(l)).toBe(false);
  });

  it("layout reconhecido mas sem campos e desconhecido", () => {
    expect(lerNfXml(`<CompNfse><Nfse><InfNfse><CodigoVerificacao>X</CodigoVerificacao></InfNfse></Nfse></CompNfse>`)!.tipo).toBe("desconhecido");
  });
});

describe("detalhes de leitura", () => {
  it("data com fuso: usa a data escrita, sem converter para UTC (23:50-03:00 continua no dia 05)", () => {
    expect(lerNfXml(NFE_55)!.emissao).toBe("2026-11-05");
    const tarde = NACIONAL.replace("2026-11-05T10:12:44-03:00", "2026-11-05T22:59:59-03:00");
    expect(lerNfXml(tarde)!.emissao).toBe("2026-11-05");
  });

  it("data DD/MM/AAAA e valor com virgula de algumas prefeituras", () => {
    const x = ABRASF_10.replace("2026-10-30T16:45:10", "30/10/2026").replace(/>850</g, ">1.234,56<");
    expect(lerNfXml(x)).toMatchObject({ emissao: "2026-10-30", valor: 1234.56 });
  });

  it("CNPJ com mascara no XML vira so digitos", () => {
    const x = NFE_55.replace("<CNPJ>33444555000166</CNPJ>", "<CNPJ>33.444.555/0001-66</CNPJ>");
    expect(lerNfXml(x)!.cnpjEmitente).toBe("33444555000166");
  });

  it("encoding ISO-8859-1 declarado", () => {
    const xml = `<?xml version="1.0" encoding="ISO-8859-1"?><CompNfse><Nfse><InfNfse><Numero>1</Numero><PrestadorServico><RazaoSocial>CONSTRUÇÃO</RazaoSocial></PrestadorServico></InfNfse></Nfse></CompNfse>`;
    const bytes = Uint8Array.from([...xml].map((c) => c.charCodeAt(0)));
    expect(lerNfXml(decodificarXml(bytes))!.nomeEmitente).toBe("CONSTRUÇÃO");
    expect(decodificarXml(new TextEncoder().encode(NACIONAL))).toBe(NACIONAL);
  });
});

describe("comparacao com o digitado", () => {
  const l = lerNfXml(SAO_PAULO)!;

  it("sem diferenca quando bate (zeros a esquerda e espacos nao contam)", () => {
    expect(diferencasXml(l, { numero: " 004321 ", emissao: "2026-11-03", valor: 3200.5 })).toEqual([]);
  });

  it("campo vazio nao e diferenca", () => {
    expect(diferencasXml(l, { numero: "", emissao: "", valor: null })).toEqual([]);
  });

  it("lista ano errado, numero e valor diferentes", () => {
    const d = diferencasXml(l, { numero: "4312", emissao: "2025-11-03", valor: 3205 });
    expect(d.map((x) => x.campo)).toEqual(["numero", "emissao", "valor"]);
    expect(d[1]).toMatchObject({ digitado: "03/11/2025", doXml: "03/11/2026" });
  });

  it("CNPJ: compara so digitos; sem documento de um lado nao acusa", () => {
    expect(mesmoDocumento("22.333.444/0001-55", "22333444000155")).toBe(true);
    expect(mesmoDocumento("22.333.444/0001-55", "11222333000144")).toBe(false);
    expect(mesmoDocumento(null, "11222333000144")).toBe(true);
    expect(formatarDocumento("22333444000155")).toBe("22.333.444/0001-55");
  });

  it("resumo e normalizacao do numero", () => {
    expect(resumoXml(l)).toBe("NF 4321 · emissão 03/11/2026 · R$ 3.200,50 · CNPJ 22.333.444/0001-55");
    expect(normalizarNumeroNf("000")).toBe("0");
    expect(normalizarNumeroNf(" a12 ")).toBe("A12");
  });
});
