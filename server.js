const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Banco de dados em memória (Estado inicial da eleição)
// Em um cenário de produção escalável, isso seria substituído por Supabase ou PostgreSQL
let candidatos = [
  { id: 1, cargo: 'Presidente', nome: 'M Thiago', votos: 0, foto: 'https://ui-avatars.com/api/?name=Thiago&background=0D8ABC&color=fff' },
  { id: 2, cargo: 'Presidente', nome: 'M PR', votos: 0, foto: 'https://ui-avatars.com/api/?name=PR&background=0D8ABC&color=fff' },
  { id: 3, cargo: 'Presidente', nome: 'M César', votos: 0, foto: 'https://ui-avatars.com/api/?name=Cesar&background=0D8ABC&color=fff' },
  { id: 4, cargo: 'Tesoureiro', nome: 'Lucas', votos: 0, foto: 'https://ui-avatars.com/api/?name=Lucas&background=28a745&color=fff' },
  { id: 5, cargo: 'Tesoureiro', nome: 'Mateus', votos: 0, foto: 'https://ui-avatars.com/api/?name=Mateus&background=28a745&color=fff' },
  { id: 6, cargo: 'Secretário', nome: 'Secretário 1', votos: 0, foto: 'https://ui-avatars.com/api/?name=S1&background=ffc107&color=000' },
  { id: 7, cargo: 'Branco / Nulo', nome: 'Voto Branco', votos: 0, foto: 'https://ui-avatars.com/api/?name=B&background=e2e8f0&color=000' }
];

// Gerenciamento de conexões WebSocket
io.on('connection', (socket) => {
  console.log('Novo usuário conectado:', socket.id);

  // Assim que alguém conecta, envia o estado atual da apuração
  socket.emit('atualizacao_votos', candidatos);

  // Escuta o evento de novo voto vindo da página admin
  socket.on('registrar_voto', (candidatoId) => {
    const candidato = candidatos.find(c => c.id === candidatoId);
    if (candidato) {
      candidato.votos += 1;
      console.log(`Voto registrado para ${candidato.nome}. Total: ${candidato.votos}`);
      
      // Emite a atualização para TODOS os clientes conectados simultaneamente
      io.emit('atualizacao_votos', candidatos);
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id);
  });
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Painel Público: http://localhost:${PORT}/`);
  console.log(`Painel Admin:   http://localhost:${PORT}/admin.html`);
});