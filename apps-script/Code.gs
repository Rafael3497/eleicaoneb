const SHEET_NAME = 'Apuração';
const STATUS_APURACAO_KEY = 'statusApuracao';

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

    const statusApuracao = PropertiesService.getScriptProperties()
      .getProperty(STATUS_APURACAO_KEY) || 'ao-vivo';

    return responderJson({ status: 'sucesso', candidatos, statusApuracao });
  }

  // O status fica nas propriedades do script, compartilhadas por todos os visitantes.
  if (acao === 'status') {
    const estado = String(params.estado || '').trim().toLowerCase();
    if (!['iniciada', 'concluida'].includes(estado)) {
      return responderJson({ status: 'erro', mensagem: 'Estado de apuração inválido.' });
    }

    PropertiesService.getScriptProperties().setProperty(STATUS_APURACAO_KEY, estado);
    return responderJson({ status: 'sucesso', statusApuracao: estado });
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
      return responderJson({ status: 'sucesso', mensagem: 'Urna zerada com sucesso.' });
    } finally {
      lock.releaseLock();
    }
  }

  return responderJson({ status: 'erro', mensagem: 'Ação desconhecida.' });
}
