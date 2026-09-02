/** @type {import('tailwindcss').Config} */
// fancy-avalanche — precompiled Tailwind (replaces runtime CDN JIT compiler)
module.exports = {
  content: [
    './themes/fancy-avalanche/layout/**/*.ejs',
    './themes/fancy-avalanche/source/js/*.js',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Accent resolves through CSS vars — switching <html data-style> swaps the whole palette
        accent: {
          50: 'rgb(var(--fa-rgb-50) / <alpha-value>)',
          100: 'rgb(var(--fa-rgb-100) / <alpha-value>)',
          200: 'rgb(var(--fa-rgb-200) / <alpha-value>)',
          300: 'rgb(var(--fa-rgb-300) / <alpha-value>)',
          400: 'rgb(var(--fa-rgb-400) / <alpha-value>)',
          500: 'rgb(var(--fa-rgb-500) / <alpha-value>)',
          600: 'rgb(var(--fa-rgb-600) / <alpha-value>)',
          700: 'rgb(var(--fa-rgb-700) / <alpha-value>)',
        },
        surface: { DEFAULT: 'var(--fa-page)', dark: 'var(--fa-page-dark)' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', '"SF Pro Display"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
    },
  },
  corePlugins: {
    // preflight stays ON (CDN had it too); loaded before style.css so cascade order matches
    preflight: true,
  },
};
