export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        surface: '#ffffff',
        surfaceSoft: '#F8FAFF',
        muted: '#6B7280',
      },
      boxShadow: {
        soft: '0 24px 80px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
