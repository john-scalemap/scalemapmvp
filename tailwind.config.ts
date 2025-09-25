import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        // Premium Color System - MBB x Luxury Aesthetic
        primary: {
          50: '#f3e8ff',
          100: '#e9d5ff',
          200: '#d8b4fe',
          300: '#c084fc',
          400: '#a855f7',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#5b21b6',     // Main primary - Royal Purple
          800: '#4c1d95',     // Dark emphasis
          900: '#3730a3',
          DEFAULT: '#5b21b6',
          foreground: '#ffffff',
          hover: '#7c3aed',   // Lighter hover state
          light: '#f3e8ff',   // Soft lavender backgrounds
          dark: '#4c1d95',    // Deep purple for emphasis
        },
        secondary: {
          50: '#dbeafe',
          100: '#bfdbfe',
          200: '#93c5fd',
          300: '#60a5fa',
          400: '#3b82f6',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',     // Main secondary - Corporate Blue
          800: '#1e3a8a',     // Navy depth
          900: '#1e293b',
          DEFAULT: '#1e40af',
          foreground: '#ffffff',
          hover: '#2563eb',   // Brighter blue hover
          light: '#dbeafe',   // Light blue backgrounds
          dark: '#1e3a8a',    // Navy depth
        },
        // Accent Blue
        accent: {
          DEFAULT: '#0ea5e9',     // Sky blue for highlights
          light: '#e0f2fe',       // Light sky backgrounds
          foreground: "var(--accent-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        // Premium Grey Scale
        slate: {
          50: '#f8fafc',       // Lightest background
          100: '#f1f5f9',      // Card backgrounds
          200: '#e2e8f0',      // Subtle borders
          300: '#cbd5e1',      // Input borders
          400: '#94a3b8',      // Muted text
          500: '#64748b',      // Secondary text
          600: '#475569',      // Primary text
          700: '#334155',      // Dark text/headings
          800: '#1e293b',      // Very dark elements
          900: '#0f172a',      // Black alternative
        },
        // Status Colors
        success: {
          DEFAULT: '#10b981',  // Green for completed states
          light: '#d1fae5',    // Light green backgrounds
        },
        warning: {
          DEFAULT: '#f59e0b',  // Amber for attention items
          light: '#fef3c7',    // Light amber backgrounds
        },
        error: {
          DEFAULT: '#ef4444',  // Red for critical issues
          light: '#fee2e2',    // Light red backgrounds
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'var(--font-mono)', 'SF Mono', 'monospace'],
        display: ['Playfair Display', 'Georgia', 'serif'],  // Luxury headings
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".5" },
        },
        // Premium Animations
        'gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        // Premium Animations
        'gradient': 'gradient 8s linear infinite',
        'shimmer': 'shimmer 2s infinite',
        'pulse-shimmer': 'pulse-shimmer 2s infinite',
        'fade-up': 'fade-up 0.5s ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      // Premium Background Images
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
        'gradient-hero': 'linear-gradient(135deg, #1e1b4b 0%, #5b21b6 50%, #7c3aed 100%)',
        'gradient-card': 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        'gradient-glass': 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
      },
      // Enhanced Backdrop Blur
      backdropBlur: {
        xs: '2px',
        xl: '24px',
        '2xl': '40px',
      },
      // Premium Box Shadows
      boxShadow: {
        'premium': '0 8px 32px rgba(0, 0, 0, 0.08)',
        'premium-lg': '0 20px 40px rgba(0, 0, 0, 0.12)',
        'premium-xl': '0 25px 50px rgba(0, 0, 0, 0.15)',
        'glow-purple': '0 0 20px rgba(91, 33, 182, 0.3)',
        'glow-blue': '0 0 20px rgba(30, 64, 175, 0.3)',
        'inner-glow': 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
        'glass': '0 8px 32px rgba(31, 38, 135, 0.37)',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
