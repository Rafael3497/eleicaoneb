// Lista oficial exibida nos painéis. As fotos ficam na pasta assets/.
window.CANDIDATOS_OFICIAIS = [
  { nome: 'M. César Melo', cargo: 'Presidente', foto: 'cesar.png' },
  { nome: 'M. Pedro Rogério', cargo: 'Presidente', foto: 'pedro%20rogerio.png' },
  { nome: 'M. José Marques', cargo: 'Vice presidente', foto: 'jose%20marques.png' },
  { nome: 'José Honório Filho', cargo: '1º secretário', foto: 'honorio.png' },
  { nome: 'Lucas Lourenço', cargo: '1º secretário', foto: 'lucas.png' },
  { nome: 'Camila Aguiar', cargo: '2º secretário', foto: 'camila.png' },
  { nome: 'Cecília Honório', cargo: '2º secretário', foto: 'cecilia.png' },
  { nome: 'C. Pedro Cela', cargo: '1º tesoureiro', foto: 'pedro%20cela.png' },
  { nome: 'Rafael Ye', cargo: '2º tesoureiro', foto: 'rafael%20ye.png' },
  { nome: 'Thiago Parente', cargo: '2º tesoureiro', foto: 'thiago%20parente.png' },
  { nome: 'Kairllany Rodrigues', cargo: 'Orador oficial', foto: 'kairllany.png' },
  { nome: 'Ricardo Camurça', cargo: 'Conselho fiscal', foto: 'ricardo.png' },
  { nome: 'Eduardo Cunha', cargo: 'Conselho fiscal', foto: 'eduardo.png' },
  { nome: 'C. FranciscoTomé', cargo: 'Conselho fiscal', foto: 'tome.png' },
  { nome: 'Jerusa do Valle', cargo: 'Conselho fiscal', foto: 'jerusa.png' },
  { nome: 'C. Mateus Campos', cargo: 'Conselho fiscal', foto: 'mateu.png' },
  { nome: 'Vanessa Remígio', cargo: 'Conselho fiscal', foto: 'vanessa.png' },
  { nome: 'Whalyson Caldas', cargo: 'Conselho fiscal', foto: 'whalyson.png' }
];

window.candidatosOficiais = function (dados) {
  const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const registros = Array.isArray(dados) ? dados : [];

  function registroCorrespondente(nome) {
    const chave = normalizar(nome);
    const exatos = registros.filter((registro) => normalizar(registro.nome) === chave);
    if (exatos.length === 1) return exatos[0];
    if (exatos.length > 1 || chave.length < 5) return null;

    const parciais = registros.filter((registro) => {
      const nomeApi = normalizar(registro.nome);
      return nomeApi && (nomeApi.includes(chave) || chave.includes(nomeApi));
    });
    return parciais.length === 1 ? parciais[0] : null;
  }

  return window.CANDIDATOS_OFICIAIS.map((oficial) => {
    const registro = registroCorrespondente(oficial.nome);
    return {
      ...(registro || {}),
      nome: oficial.nome,
      cargo: oficial.cargo,
      foto: `assets/${oficial.foto}`,
      numero: registro?.numero || '-',
      votos: Number(registro?.votos) || 0,
      cadastradoNaUrna: registro?.id !== null && registro?.id !== undefined && registro?.id !== ''
    };
  });
};
