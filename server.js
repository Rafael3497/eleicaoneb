const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Serve apenas as páginas do painel e as fotos, sem expor outros arquivos do projeto.
app.get(['/', '/index.html'], (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin.html', (_req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/conselho.html', (_req, res) => res.sendFile(path.join(__dirname, 'conselho.html')));
app.get('/candidates.js', (_req, res) => res.sendFile(path.join(__dirname, 'candidates.js')));
app.use('/assets', express.static(path.join(__dirname, 'assets'), { dotfiles: 'deny' }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Painel público: http://localhost:${PORT}/`);
  console.log(`Painel admin: http://localhost:${PORT}/admin.html`);
});
