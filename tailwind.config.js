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
      sm: "0 0 8px 0 rgba(0, 0, 0, 0.05)",
    },
    fontFamily: {
      mono: ["bm", "monospace"],
      sans: ["gs", "sans-serif"],
    },
    screens: {
      sm: "640px",
      md: "834px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1728px",
    },
    extend: {
      minHeight: {
        screenh: "100vh",
      },
    },
  },
};
