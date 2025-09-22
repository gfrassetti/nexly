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
          'teal': '#2596be', 
          'green': '#2596be',
          'light-blue': '#2596be',
        }
      }
    } 
  },
  plugins: []
} satisfies Config;