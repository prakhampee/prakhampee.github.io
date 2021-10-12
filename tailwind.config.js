module.exports = {
  purge: {
    enabled: true,
    mode: 'all',
    preserveHtmlElements: false,
    content: ['./src/*.html'],
  },
  darkMode: false,
  theme: {
    extend: {
      colors: {
        red: '#660000',
      },
    }
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
