import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          DEFAULT: "#0f172a",
          foreground: "#f8fafc",
        },
        accent: {
          DEFAULT: "#38bdf8",
          foreground: "#022c22",
        },
      },
    },
  },
  plugins: [],
};

export default config;
