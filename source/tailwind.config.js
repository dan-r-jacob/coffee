/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#F2EDE4',
        ink: '#1C2733',
        body: '#36414D',
        meta: '#5A6470',
        line: '#E1DACC',
        panel: '#E7E0D3',
        navy: '#24364A',
        danger: '#8E2F23'
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['"Public Sans"', '-apple-system', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
};
