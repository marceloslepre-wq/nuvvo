/**
 * Utilitários para formatação e validação de CPF e CNPJ
 */

/**
 * Remove todos os caracteres não numéricos
 */
export function cleanDocument(value: string): string {
  return (value || '').replace(/\D/g, '')
}

/**
 * Aplica máscara dinâmica conforme a quantidade de dígitos:
 * - Até 11 dígitos: CPF (000.000.000-00)
 * - Acima de 11 dígitos: CNPJ (00.000.000/0000-00)
 */
export function maskCpfOrCnpj(value: string): string {
  const digits = cleanDocument(value).slice(0, 14)

  if (digits.length <= 11) {
    // Máscara de CPF: 000.000.000-00
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
  }

  // Máscara de CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
}

/**
 * Validação de CPF com algoritmo oficial e rejeição de sequências repetidas
 */
export function isValidCpf(value: string): boolean {
  const digits = cleanDocument(value)
  if (digits.length !== 11) return false

  // Rejeita sequências repetidas (00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(digits)) return false

  // Primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i)
  }
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(digits.charAt(9), 10)) return false

  // Segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i)
  }
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(digits.charAt(10), 10)) return false

  return true
}

/**
 * Validação de CNPJ com algoritmo oficial e rejeição de sequências repetidas
 */
export function isValidCnpj(value: string): boolean {
  const digits = cleanDocument(value)
  if (digits.length !== 14) return false

  // Rejeita sequências repetidas (00000000000000, etc.)
  if (/^(\d)\1{13}$/.test(digits)) return false

  // Primeiro dígito verificador
  const weight1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits.charAt(i), 10) * weight1[i]
  }
  let rem = sum % 11
  const digit1 = rem < 2 ? 0 : 11 - rem
  if (parseInt(digits.charAt(12), 10) !== digit1) return false

  // Segundo dígito verificador
  const weight2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits.charAt(i), 10) * weight2[i]
  }
  rem = sum % 11
  const digit2 = rem < 2 ? 0 : 11 - rem
  if (parseInt(digits.charAt(13), 10) !== digit2) return false

  return true
}

/**
 * Valida se a string é vazia (se opcional) ou se é um CPF ou CNPJ válido
 */
export function validateCpfOrCnpj(
  value: string,
  required = false,
): {
  isValid: boolean
  error?: string
  type?: 'cpf' | 'cnpj'
} {
  const digits = cleanDocument(value)

  if (!digits) {
    if (required) {
      return { isValid: false, error: 'Documento é obrigatório' }
    }
    return { isValid: true }
  }

  if (digits.length === 11) {
    if (isValidCpf(digits)) {
      return { isValid: true, type: 'cpf' }
    }
    return { isValid: false, error: 'CPF inválido. Verifique os números digitados.' }
  }

  if (digits.length === 14) {
    if (isValidCnpj(digits)) {
      return { isValid: true, type: 'cnpj' }
    }
    return { isValid: false, error: 'CNPJ inválido. Verifique os números digitados.' }
  }

  return {
    isValid: false,
    error: 'Informe um CPF válido (11 dígitos) ou CNPJ válido (14 dígitos).',
  }
}
