/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        petrol: {
          DEFAULT: "#245C6B",
          dark: "#19323A",
          darker: "#14282F",
          light: "#2E7588",
        },
        mint: {
          DEFAULT: "#63C7B2",
          light: "#E8F8F5",
          dark: "#48A894",
        },
        amberSoft: {
          DEFAULT: "#F4C95D",
          light: "#FEF8EC",
          dark: "#B8871E",
        },
        coral: {
          DEFAULT: "#D96C6C",
          light: "#FDF0F0",
        },
      },
      boxShadow: {
        '2xs': '0 1px 3px 0 rgba(13, 35, 41, 0.05)',
        'xs': '0 1px 4px 0 rgba(13, 35, 41, 0.07)',
        'sm': '0 2px 8px -1px rgba(13, 35, 41, 0.08), 0 1px 3px -1px rgba(13, 35, 41, 0.04)',
        'DEFAULT': '0 4px 14px -2px rgba(13, 35, 41, 0.09), 0 2px 5px -1px rgba(13, 35, 41, 0.04)',
        'md': '0 6px 20px -2px rgba(13, 35, 41, 0.11), 0 2px 6px -1px rgba(13, 35, 41, 0.05)',
        'lg': '0 12px 32px -4px rgba(13, 35, 41, 0.13), 0 4px 12px -2px rgba(13, 35, 41, 0.06)',
        'xl': '0 18px 45px -6px rgba(13, 35, 41, 0.16), 0 6px 18px -3px rgba(13, 35, 41, 0.08)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
