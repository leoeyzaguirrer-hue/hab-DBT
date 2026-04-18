/** Formatea un código de 8 chars como XXXX-XXXX para mostrar */
export function formatInvitationCode(code: string): string {
  const clean = code.replace('-', '')
  return `${clean.slice(0, 4)}-${clean.slice(4)}`
}

/** Elimina el guión del código formateado para guardar en DB */
export function cleanInvitationCode(code: string): string {
  return code.replace('-', '').toUpperCase()
}
