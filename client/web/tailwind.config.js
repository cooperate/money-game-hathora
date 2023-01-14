const path = require("path");
module.exports = {
  darkMode: 'class',
  content: ["./index.html"]
    .map((str) => path.relative(process.cwd(), path.resolve(__dirname, str)))
    .concat(`${path.relative(process.cwd(), path.resolve(__dirname, "src"))}/**/*.{jsx,ts,js,tsx}`),
  theme: {
    extend: {},
    colors: {
      moneySecondaryDark: '#3A5A40',
      moneyPrimaryDark: '#344E41',
      moneyText: '#DAD7CD',
      moneySecondary: '#A3B18A',
      moneyPrimary: '#588157',
      moneyBlack: '#111d13',
    }
  },
  plugins: [require("@tailwindcss/forms")],
};
