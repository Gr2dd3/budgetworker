const path = require('path');

module.exports = {
  entry: './app.js', // Kontrollera att den här filen finns
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    static: path.join(__dirname, 'public'),
    compress: true,
    port: 9000
}
};
