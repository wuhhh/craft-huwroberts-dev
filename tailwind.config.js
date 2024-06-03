module.exports = {
  corePlugins: {
    container: false,
  },
  content: [
    "./templates/**/*.{twig,html}",
    "./src/**/*.js",
    "./config/formie.php",
  ],
  safelist: [
    "bg-slate-50",
    "bg-slate-100",
    "bg-neutral-50",
    "bg-neutral-100",
    "bg-neutral-900",
    "bg-zinc-900",
    "bg-black",
  ],
  theme: {
    boxShadow: {
      sm: "0 0 8px 0 rgba(0, 0, 0, 0.05)",
      none: "none",
    },
    fontFamily: {
      mono: ["bm", "monospace"],
      sans: ["gs", "sans-serif"],
    },
    screens: {
      sm: "640px",
      "sm-down": { max: "639px" },
      md: "834px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1728px",
      "hover-none": { raw: "(hover: none)" },
    },
    extend: {
      colors: {
        "coral-red": {
          DEFAULT: "#F36855",
        },
      },
      minHeight: {
        screenh: "100vh",
      },
    },
  },
};
