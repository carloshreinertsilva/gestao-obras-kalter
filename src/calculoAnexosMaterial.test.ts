import { describe, expect, it } from "vitest";
import {
  cabemNoLimite,
  caminhoAnexoMaterial,
  contarAnexosPorSolicitacao,
  podeAnexarMaterial,
  podeExcluirAnexoMaterial,
} from "./calculoAnexosMaterial";

const SOL = "11111111-2222-3333-4444-555555555555";
const pedinte = { id: "u1", perfil: "engenheiro" };
const outro = { id: "u2", perfil: "logistica" };
const cadastro = { id: "u3", perfil: "assistente", cadastra_materiais: true };
const fiscal = { id: "u4", perfil: "fiscal", revisa_fiscal_material: true };
const coord = { id: "u5", perfil: "coordenador" };
const admin = { id: "u6", perfil: "admin" };

describe("podeAnexarMaterial", () => {
  const aberta = { status: "cadastro", id_solicitante: "u1" };
  it("quem pediu, cadastro, fiscal, admin e coordenador anexam com a solicitacao aberta", () => {
    for (const u of [pedinte, cadastro, fiscal, coord, admin]) expect(podeAnexarMaterial(aberta, u)).toBe(true);
    expect(podeAnexarMaterial(aberta, outro)).toBe(false);
  });
  it("vale em todas as etapas abertas e em nenhuma encerrada", () => {
    for (const st of ["cadastro", "fiscal", "erp", "devolvida"]) expect(podeAnexarMaterial({ status: st, id_solicitante: "u1" }, pedinte)).toBe(true);
    for (const st of ["concluida", "recusada", "cancelada"]) expect(podeAnexarMaterial({ status: st, id_solicitante: "u1" }, admin)).toBe(false);
  });
  it("sem usuario ou sem solicitacao nao anexa", () => {
    expect(podeAnexarMaterial(aberta, null)).toBe(false);
    expect(podeAnexarMaterial(null, admin)).toBe(false);
  });
});

describe("podeExcluirAnexoMaterial", () => {
  const anexo = { id_usuario: "u3" };
  it("quem enviou, admin e coordenador excluem com a solicitacao aberta", () => {
    expect(podeExcluirAnexoMaterial(anexo, "fiscal", cadastro)).toBe(true);
    expect(podeExcluirAnexoMaterial(anexo, "fiscal", coord)).toBe(true);
    expect(podeExcluirAnexoMaterial(anexo, "fiscal", admin)).toBe(true);
    expect(podeExcluirAnexoMaterial(anexo, "fiscal", pedinte)).toBe(false);
    expect(podeExcluirAnexoMaterial(anexo, "fiscal", fiscal)).toBe(false);
  });
  it("encerrada ninguem exclui", () => {
    for (const st of ["concluida", "recusada", "cancelada"]) expect(podeExcluirAnexoMaterial(anexo, st, admin)).toBe(false);
  });
  it("anexo sem autor (usuario apagado) so admin/coordenador", () => {
    expect(podeExcluirAnexoMaterial({ id_usuario: null }, "cadastro", pedinte)).toBe(false);
    expect(podeExcluirAnexoMaterial({ id_usuario: null }, "cadastro", coord)).toBe(true);
  });
});

describe("caminhoAnexoMaterial", () => {
  const agora = new Date(1763400000000);
  it("fica dentro da pasta da solicitacao, sem acento nem espaco", () => {
    expect(caminhoAnexoMaterial(SOL, "Foto Válvula 1.JPG", agora)).toBe(`materiais/${SOL}/1763400000000_foto_valvula_1.jpg`);
  });
  it("varios no mesmo instante nao colidem", () => {
    expect(caminhoAnexoMaterial(SOL, "a.png", agora, 2)).toBe(`materiais/${SOL}/1763400000000-2_a.png`);
  });
});

describe("contagem e limite", () => {
  it("conta anexos por solicitacao", () => {
    expect(contarAnexosPorSolicitacao([{ id_solicitacao: "a" }, { id_solicitacao: "b" }, { id_solicitacao: "a" }])).toEqual({ a: 2, b: 1 });
  });
  it("respeita o limite de 30", () => {
    expect(cabemNoLimite(0, 5)).toBe(5);
    expect(cabemNoLimite(28, 5)).toBe(2);
    expect(cabemNoLimite(30, 1)).toBe(0);
  });
});
