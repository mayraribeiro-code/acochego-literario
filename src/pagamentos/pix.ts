// Monta o "Pix copia e cola" (BR Code), no formato do Manual de Padrões para
// Iniciação do Pix do Banco Central: campos EMV "id + tamanho + valor" e um
// CRC16 no final. O QR code é só esse texto desenhado como imagem.

function campo(id: string, valor: string) {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

// CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido pelo BR Code.
export function crc16(texto: string) {
  let crc = 0xffff;
  for (const byte of Buffer.from(texto, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Tira acentos e caracteres fora do permitido e corta no tamanho máximo.
function limpar(texto: string, maximo: number) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .slice(0, maximo)
    .trim();
}

export interface DadosPix {
  chave: string;
  nomeRecebedor: string;
  cidade: string;
  valorCentavos: number;
  // Identificador da cobrança: até 25 letras e números.
  txid: string;
}

export function gerarPixCopiaECola({
  chave,
  nomeRecebedor,
  cidade,
  valorCentavos,
  txid,
}: DadosPix) {
  const contaRecebedor = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  const semCrc =
    campo('00', '01') +
    campo('26', contaRecebedor) +
    campo('52', '0000') +
    campo('53', '986') +
    campo('54', (valorCentavos / 100).toFixed(2)) +
    campo('58', 'BR') +
    campo('59', limpar(nomeRecebedor, 25)) +
    campo('60', limpar(cidade, 15)) +
    campo('62', campo('05', txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25))) +
    '6304';
  return semCrc + crc16(semCrc);
}
