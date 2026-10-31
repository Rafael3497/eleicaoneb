const SHEET_NAME = 'Apuração';
const CONTROL_SHEET_NAME = 'Controle da Apuração';

function obterAbaControle(ss) {
  let controle = ss.getSheetByName(CONTROL_SHEET_NAME);
  if (!controle) controle = ss.insertSheet(CONTROL_SHEET_NAME);

  if (controle.getRange('A1').getValue() !== 'STATUS DA APURAÇÃO') {
    controle.getRange('A1:B2').setValues([
      ['STATUS DA APURAÇÃO', 'Aguardando início'],
      ['Estado', 'ao-vivo']
    ]);
    controle.getRange('A4').setValue('CANDIDATOS ELEITOS');
    controle.getRange('A5:C5').setValues([['Cargo', 'Candidato', 'Votos']]);
    controle.getRange('A1:B1').setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
    controle.getRange('A4:C5').setFontWeight('bold');
    controle.setFrozenRows(5);
    controle.autoResizeColumns(1, 3);
  }

  return controle;
}

function calcularEleitos(sheet) {
  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 4) return [];

  const dados = sheet.getRange(4, 1, ultimaLinha - 3, 5).getValues();
  const porCargo = {};
  dados.forEach((linha) => {
    const [cargo, , nome, , votos] = linha;
    if (!nome || !String(nome).trim()) return;
    const chave = String(cargo || 'Geral').trim();
    if (!porCargo[chave]) porCargo[chave] = [];
    porCargo[chave].push({ cargo: chave, nome: String(nome).trim(), votos: Number(votos) || 0 });
  });

  const eleitos = [];
  Object.entries(porCargo).forEach(([cargo, candidatos]) => {
    candidatos.sort((a, b) => b.votos - a.votos || a.nome.localeCompare(b.nome, 'pt-BR'));
    const normalizado = cargo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (normalizado === 'conselho fiscal') {
      eleitos.push(...candidatos.slice(0, 6));
      return;
    }

    const maiorVotacao = candidatos[0]?.votos || 0;
    if (maiorVotacao > 0) {
      eleitos.push(...candidatos.filter((candidato) => candidato.votos === maiorVotacao));
    }
  });

  return eleitos;
}

function atualizarControle(ss, estado, eleitos) {
  const controle = obterAbaControle(ss);
  const textos = {
    'ao-vivo': 'Aguardando início',
    iniciada: 'Apuração Iniciada',
    concluida: 'Apuração Concluída'
  };

  controle.getRange('B1:B2').setValues([[textos[estado]], [estado]]);
  const ultimaLinha = controle.getLastRow();
  if (ultimaLinha >= 6) controle.getRange(6, 1, ultimaLinha - 5, 3).clearContent();
  if (eleitos.length) {
    controle.getRange(6, 1, eleitos.length, 3)
      .setValues(eleitos.map((eleito) => [eleito.cargo, eleito.nome, eleito.votos]));
  }
  controle.autoResizeColumns(1, 3);
  return controle;
}

function lerEleitosControle(controle) {
  const ultimaLinha = controle.getLastRow();
  if (ultimaLinha < 6) return [];
  return controle.getRange(6, 1, ultimaLinha - 5, 3).getValues()
    .filter((linha) => linha[1])
    .map((linha) => ({ cargo: String(linha[0]), nome: String(linha[1]), votos: Number(linha[2]) || 0 }));
}

function doGet(e) {
  return lidarComRequisicao(e);
}

function doPost(e) {
  return lidarComRequisicao(e);
}

function responderJson(conteudo) {
  return ContentService
    .createTextOutput(JSON.stringify(conteudo))
    .setMimeType(ContentService.MimeType.JSON);
}

function lidarComRequisicao(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.getSheets()[0];
  const controle = obterAbaControle(ss);

  const params = e && e.parameter ? e.parameter : {};
  const acao = params.acao;

  if (acao === 'ler') {
    const dados = sheet.getDataRange().getValues();
    const candidatos = [];

    // Os cabeçalhos ocupam as três primeiras linhas da planilha.
    for (let i = 3; i < dados.length; i++) {
      const cargo = dados[i][0];
      const numero = dados[i][1];
      const nome = dados[i][2];
      const foto = dados[i][3];
      const votos = dados[i][4];

      if (nome && nome.toString().trim() !== '') {
        candidatos.push({
          id: i + 1,
          cargo: cargo || 'Geral',
          numero: numero || '',
          nome: nome,
          foto: foto ? foto.toString().trim() : '',
          votos: Number(votos) || 0
        });
      }
    }

    const statusApuracao = String(controle.getRange('B2').getValue() || 'ao-vivo');
    const eleitos = lerEleitosControle(controle);

    return responderJson({ status: 'sucesso', candidatos, statusApuracao, eleitos });
  }

  // Status e eleitos ficam visíveis na aba de controle da própria planilha.
  if (acao === 'status') {
    const estado = String(params.estado || '').trim().toLowerCase();
    if (!['ao-vivo', 'iniciada', 'concluida'].includes(estado)) {
      return responderJson({ status: 'erro', mensagem: 'Estado de apuração inválido.' });
    }

    const eleitos = estado === 'concluida' ? calcularEleitos(sheet) : [];
    atualizarControle(ss, estado, eleitos);
    return responderJson({ status: 'sucesso', statusApuracao: estado, eleitos });
  }

  if (acao === 'votar') {
    const linhaId = Number(params.id);
    const quantidade = Number(params.qtd);
    if (!Number.isSafeInteger(linhaId) || linhaId < 4 || linhaId > sheet.getLastRow()) {
      return responderJson({ status: 'erro', mensagem: 'ID inválido.' });
    }
    if (!Number.isSafeInteger(quantidade) || quantidade <= 0) {
      return responderJson({ status: 'erro', mensagem: 'Quantidade de votos inválida.' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const celulaVotos = sheet.getRange(linhaId, 5);
      const votosAtuais = Number(celulaVotos.getValue()) || 0;
      const novosVotos = votosAtuais + quantidade;
      celulaVotos.setValue(novosVotos);
      return responderJson({ status: 'sucesso', novosVotos });
    } finally {
      lock.releaseLock();
    }
  }

  if (acao === 'zerar') {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const ultimaLinha = sheet.getLastRow();
      if (ultimaLinha >= 4) {
        const dados = sheet.getRange(4, 3, ultimaLinha - 3, 3).getValues();
        const votosZerados = dados.map((linha) => [linha[0] ? 0 : linha[2]]);
        sheet.getRange(4, 5, votosZerados.length, 1).setValues(votosZerados);
      }
      atualizarControle(ss, 'ao-vivo', []);
      return responderJson({ status: 'sucesso', mensagem: 'Urna zerada com sucesso.' });
    } finally {
      lock.releaseLock();
    }
  }

  return responderJson({ status: 'erro', mensagem: 'Ação desconhecida.' });
}
