/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#f0320a",
        "primary-disabled": "#fe9063",
        "primary-bg": "#f0300a13",
        precio: "#4675b9",
        success: "#00d12a",
        alert: "#ffb800",
        "alert-warning": "#fcbb11",
        error: "#f40025",
        info: "#0087d8",
        "dark-grey": "#4b4b4d",
        grey: "#757575",
        outline: "#9e9e9e",
        black: "#212121",
        "black-secondary": "#424242",
        background: "#eee",
        "white-secondary": "#fafafa",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        container: "16px",
      },
      boxShadow: {
        card: "0px 3px 1px -2px rgba(0, 0, 0, .2), 0px 2px 2px 0px rgba(0, 0, 0, .14), 0px 1px 5px 0px rgba(0, 0, 0, .12)",
      },
    },
  },
  plugins: [],
};
