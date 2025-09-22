import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: { 
    extend: {
      colors: {
        'nexly': {
          'azul': '#2596be',
          'teal': '#14b8a6', 
          'green': '#10b981',
          'light-blue': '#0ea5e9',
        }
      }
    } 
  },
  plugins: []
} satisfies Config;