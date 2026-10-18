// Gera o código Pix "copia e cola" (BR Code estático) com valor.
const semAcento = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const campo = (id, valor) => id + String(valor.length).padStart(2, "0") + valor;

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizarChave(chave) {
  let c = String(chave || "").trim();
  if (/^[\d.\-\/() +]+$/.test(c)) {
    const d = c.replace(/\D/g, "");
    if (c.trim().startsWith("+")) return "+" + d;            // telefone já com +55
    if (d.length === 11 && /^\d{2}9/.test(d) && !validarCPF(d)) return "+55" + d; // celular
    return d;                                                 // CPF/CNPJ
  }
  return c;
}
function validarCPF(c) {
  if (!/^\d{11}$/.test(c) || /^(\d)\1+$/.test(c)) return false;
  const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += +c[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === +c[9] && dv(10) === +c[10];
}

export function gerarPix({ chave, nome, cidade, valor, txid }) {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", normalizarChave(chave));
  const tx = (semAcento(txid || "***").replace(/[^A-Za-z0-9]/g, "") || "***").slice(0, 25);
  let s = campo("00", "01") + campo("26", conta) + campo("52", "0000") + campo("53", "986");
  if (valor > 0) s += campo("54", valor.toFixed(2));
  s += campo("58", "BR") + campo("59", semAcento(nome).toUpperCase().slice(0, 25) || "RECEBEDOR")
     + campo("60", semAcento(cidade).toUpperCase().slice(0, 15) || "CIDADE") + campo("62", campo("05", tx)) + "6304";
  return s + crc16(s);
}
