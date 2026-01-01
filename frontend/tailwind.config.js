/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'upbit': {
          // upeth 스타일 색상
          'header': '#093687',
          'header-hover': '#0a4199',
          'bg': '#e9ecf1',
          'card': '#ffffff',
          'border': '#e5e5e5',
          // 상승/하락
          'rise': '#c84a31',
          'rise-bg': 'rgba(200, 74, 49, 0.1)',
          'fall': '#1261c4',
          'fall-bg': 'rgba(18, 97, 196, 0.1)',
          // 텍스트
          'text': '#2b2b2b',
          'text-secondary': '#666666',
          'text-muted': '#999999',
          'text-light': 'rgba(165, 175, 202, 0.6)',
        }
      },
      fontFamily: {
        'sans': ['Noto Sans KR', 'Roboto', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'xxs': '10px',
        'xs': '11px',
        'sm': '12px',
        'base': '13px',
        'lg': '15px',
        'xl': '18px',
        '2xl': '20px',
        '3xl': '24px',
      },
      width: {
        'content': '1400px',
        'main': '990px',
        'sidebar': '400px',
      },
      height: {
        'header': '60px',
      },
      spacing: {
        '72px': '72px',
      }
    },
  },
  plugins: [],
}
