// Regras de senha e textos de erro do login (funções puras, testáveis sem o Supabase).

export const MIN_SENHA = 8

// Devolve a mensagem do problema ou null se estiver tudo certo
export function validarNovaSenha(nova, confirmacao, atual = '') {
  if (!nova || nova.length < MIN_SENHA) return `A nova senha precisa ter pelo menos ${MIN_SENHA} caracteres.`
  if (!/[A-Za-z]/.test(nova) || !/\d/.test(nova)) return 'Use letras e números na nova senha.'
  if (nova !== confirmacao) return 'A confirmação não é igual à nova senha.'
  if (atual && nova === atual) return 'A nova senha precisa ser diferente da atual.'
  return null
}

// Mensagens do Supabase Auth (em inglês) para português
export function traduzirErroAuth(msg = '') {
  if (/invalid login/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/already registered/i.test(msg)) return 'Este e-mail já está cadastrado.'
  if (/different from the old password|same password/i.test(msg)) return 'A nova senha precisa ser diferente da atual.'
  if (/rate limit|only request this after|too many/i.test(msg)) return 'Muitas tentativas. Aguarde um minuto e tente de novo.'
  if (/session missing|expired|invalid.*(token|link)|otp/i.test(msg)) return 'O link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".'
  if (/password/i.test(msg)) return 'A senha não foi aceita. Use pelo menos 6 caracteres (de preferência 8, com letras e números).'
  return msg
}

// O link do e-mail de recuperação traz "type=recovery" no endereço. Lido uma vez, na abertura da página,
// antes de o Supabase limpar o endereço.
export const abriuPorRecuperacao = typeof window !== 'undefined' && /[#&?]type=recovery\b/.test(window.location.hash + window.location.search)
