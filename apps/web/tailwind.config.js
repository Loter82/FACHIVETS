/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        unipro: {
          primary: '#3b82f6',
          'primary-content': '#ffffff',
          secondary: '#8b5cf6',
          'secondary-content': '#ffffff',
          accent: '#10b981',
          'accent-content': '#ffffff',
          neutral: '#0f172a',
          'neutral-content': '#f8fafc',
          'base-100': '#f8fafc',
          'base-200': '#f1f5f9',
          'base-300': '#e2e8f0',
          'base-content': '#0f172a',
          info: '#0ea5e9',
          'info-content': '#ffffff',
          success: '#10b981',
          'success-content': '#ffffff',
          warning: '#f59e0b',
          'warning-content': '#ffffff',
          error: '#ef4444',
          'error-content': '#ffffff',
        },
      },
      'dark',
    ],
    darkTheme: 'dark',
    logs: false,
  },
};
