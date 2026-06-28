import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      colors: {
        luminous: {
          cyan: '#00A3FF',
          orange: '#FF6B00',
        },
        logixa: {
          bg: "#0B0F19",
          glowCyan: "#22D3EE",
          glowOrange: "#FB923C",
          lightBg: "#F1F5F9",
          lightGlowCyan: "#06B6D4",
          lightGlowOrange: "#F97316",
        },
        brand: {
          bg: "#0A0A0A",
          card: "#141414",
          border: "#222222",
          cyan: "#00A3FF",
          purple: "#FF6B00",
          blue: "#0052CC",
          orange: "#FF6B00",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        input: "hsl(var(--input))",
        border: "var(--border)",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
      },
      fontFamily: {
        heading: ["var(--font-poppins)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'premium': '0 20px 40px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
        'premium-hover': '0 28px 48px -16px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,163,255,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        marquee: 'marquee 35s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;