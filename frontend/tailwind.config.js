module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      'headlines': ['Roobert', 'sans-serif'],
      'sans': ['Neue Montreal', 'sans-serif'],
    },
    extend: {
      colors: {
        darkBg: '#000000',
        lightBg: '#FFFFFF',
        gray: {
          800: '#000000',
          900: '#0d0d0d',
        },
      },
      borderRadius: {
        'custom-16': '16.685px',
      },
      backgroundImage: {
        'dark-custom-gradient': 'linear-gradient(89deg, #232323 -10.32%, #141414 103.64%)',
      },
      boxShadow: {
        'dark-custom-shadow': '0px 4.767px 6.913px rgba(0, 0, 0, 0.50)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.5s ease-out',
        blob: "blob 7s infinite",
      },
    },
  },
  plugins: [],
};
