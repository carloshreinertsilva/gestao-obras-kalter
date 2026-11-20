/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // cor da marca (petroleo): unica fonte para as classes. Fora do Tailwind (graficos, e-mails)
        // usar COR_PETROLEO de src/cores.ts; cores.test.ts confere que os dois batem.
        petroleo: {
          DEFAULT: "#2A6377",
          escuro: "#1E4857",
        },
      },
    },
  },
  plugins: [],
}
