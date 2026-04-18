/** Tipos del Plan de Crisis — hab-DBT */

export interface CrisisContact {
  id: string            // ID local para manejo de lista
  name: string
  role: 'familiar' | 'amigo' | 'otro'
  phone: string         // ej: "+591 70000000"
}

/**
 * Contenido descifrado del plan de crisis.
 * Se cifra con la llave de dispositivo antes de guardarse en Supabase.
 * Sigue la estructura del "MI PLAN DE CRISIS" (Linehan / DBT).
 */
export interface CrisisPlanContent {
  // 1. Señales de advertencia (vulnerabilidades + antecedentes)
  warningSignals: string[]

  // 2. Compromisos con la vida (leer antes del desencadenante)
  commitments: string[]

  // 3. Estrategias: cambiar la fisiología del cuerpo (TIPP)
  bodyStrategies: string[]

  // 4. Estrategias: distraerse
  distractionStrategies: string[]

  // 5. Estrategias: concentrarse en los sentidos (Mindfulness)
  mindfulnessStrategies: string[]

  // 6. Lista personal de lo que NO debo hacer en crisis
  dontList: string[]

  // 7. Contactos de apoyo (familia, amigos)
  contacts: CrisisContact[]

  // 8. Terapeuta
  therapistName: string
  therapistPhone: string

  // 9. Razones para vivir
  reasonsToLive: string[]

  // Notas adicionales
  notes: string
}
