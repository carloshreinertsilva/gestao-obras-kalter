import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export default function ValorAjustavel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const texto = useRef<HTMLSpanElement>(null);
  const [escala, setEscala] = useState(1);

  const ajustar = () => {
    const c = caixa.current;
    const t = texto.current;
    if (!c || !t) return;
    const natural = t.scrollWidth;
    const disponivel = c.clientWidth;
    setEscala(natural > disponivel && natural > 0 ? Math.max(disponivel / natural, 0.4) : 1);
  };

  useLayoutEffect(ajustar, [children]);

  useEffect(() => {
    if (!caixa.current) return;
    const observador = new ResizeObserver(ajustar);
    observador.observe(caixa.current);
    return () => observador.disconnect();
  }, []);

  return (
    <div ref={caixa} className={`w-full overflow-hidden ${className}`}>
      <span
        ref={texto}
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          transform: `scale(${escala})`,
          transformOrigin: "left center",
        }}
      >
        {children}
      </span>
    </div>
  );
}
