module.exports = {
  corePlugins: {
    container: false,
  },
  content: [
    "./templates/**/*.{twig,html}",
    "./src/**/*.js",
    "./config/formie.php",
  ],
  theme: {
    boxShadow: {
      'sm': '0 0 8px 0 rgba(0, 0, 0, 0.05)',
    },
    fontFamily: {
			mono: ['bm', 'monospace'],
			sans: ['gs', 'sans-serif']
		},
    extend: {
      minHeight: {
        screenh: "100vh",
      },
    },
  },
};
