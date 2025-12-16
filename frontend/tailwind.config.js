/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#3A86FF",
        "secondary": "#8338EC",
        "background-light": "#f6f7f8",
        "background-dark": "#121212",
        "surface-dark": "#1E1E2F",
        "text-primary-dark": "#FFFFFF",
        "text-secondary-dark": "#AAB2C8",
        "lost-yellow": "#FFBE0B",
        "found-blue": "#3A86FF",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        heading: ['Inter', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "full": "9999px"
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

