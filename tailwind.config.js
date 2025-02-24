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
    "bg-zinc-100",
    "bg-neutral-50",
    "bg-neutral-100",
    "bg-neutral-900",
    "bg-zinc-900",
    "bg-black",
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
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
      animation: {
        "spin-slowish": "spin 2s linear infinite",
        "spin-slow": "spin 3s linear infinite",
        "spin-very-slow": "spin 20s linear infinite",
        "travel-x": "travel-x 0.5s linear infinite",
        "travel-x-slow": "travel-x 1s linear infinite",
        "travel-x-slower": "travel-x 2s linear infinite",
      },
      colors: {
        "coral-red": {
          DEFAULT: "#F36855",
        },
        "seabed-indigo": {
          50: "#E6E3FA",
          100: "#E0DDF3",
          400: "#3F26DD",
          DEFAULT: "#3F26DD",
        },
        stone: "#EBEFF4",
      },
      keyframes: {
        "travel-x": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      minHeight: {
        screenh: "100dvh",
      },
      transitionTimingFunction: {
        bounce: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
    },
  },
};
