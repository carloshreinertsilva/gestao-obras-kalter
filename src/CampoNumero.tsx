import { useRef, type InputHTMLAttributes } from "react";
import { lerNumero, normalizarTexto } from "./numero";

// Campo de numero digitado (valor, peso, quantidade, R$/km). Guarda o TEXTO (quem usa le com lerNumero) e, ao sair
// do campo, reescreve como foi entendido ("4.50" -> "4,50"; "15.000" -> "15.000,00"): assim a pessoa ve a leitura
// antes de gravar. Formata so no blur, nunca a cada tecla, e so se a pessoa mexeu no texto (passar pelo campo com
// Tab nao muda nada: em telas que recalculam a partir do texto, reescrever sozinho alteraria o valor).
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode"> & {
  valor: string;
  onChange: (texto: string) => void;
  /** casas decimais minimas ao reexibir (2 = dinheiro; 0 = inteiro) */
  casas?: number;
  /** maximo de casas mantidas ao reexibir (padrao 6: nao arredonda o que foi digitado) */
  casasMax?: number;
  /** medida/quantidade pequena: ponto unico e decimal ("1.200" = 1,2) */
  medida?: boolean;
  /** chamado ao sair do campo com o numero JA reexibido (NaN se vazio/invalido): o que grava e o que aparece */
  onConfirmar?: (n: number) => void;
};

export function CampoNumero({ valor, onChange, casas = 2, casasMax, medida, onConfirmar, onFocus, onBlur, autoComplete = "off", ...resto }: Props) {
  const aoEntrar = useRef<string | null>(null);
  return (
    <input
      {...resto}
      type="text"
      inputMode="decimal"
      autoComplete={autoComplete}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => {
        aoEntrar.current = e.target.value;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        let texto = e.target.value;
        if (texto !== aoEntrar.current) {
          texto = normalizarTexto(texto, casas, { medida, casasMax });
          if (texto !== e.target.value) onChange(texto);
        }
        aoEntrar.current = null;
        onConfirmar?.(lerNumero(texto, { medida }));
        onBlur?.(e);
      }}
    />
  );
}
