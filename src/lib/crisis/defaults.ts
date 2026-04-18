/**
 * Plan de crisis por defecto, basado en el documento clínico
 * "MI PLAN DE CRISIS" (estructura DBT - Linehan).
 *
 * El consultante personaliza este plan en /client/crisis/edit.
 * Es solo un punto de partida — el plan real es el suyo.
 */

import type { CrisisPlanContent } from './types'

export const DEFAULT_CRISIS_PLAN: CrisisPlanContent = {
  warningSignals: [
    'Tuve un día muy estresante',
    'Discutí con alguien importante para mí',
    'Las cosas no salieron como esperaba',
    'No dormí bien',
    'No me alimenté bien',
    'Me sentí muy agotada/o o sola/o',
    'Dejé de ir a mis controles psicológicos',
  ],

  commitments: [
    'Me comprometo a usar este plan antes de actuar un impulso',
    'Me comprometo a pedir ayuda cuando la necesite',
    'Me comprometo a seguir con mi tratamiento',
  ],

  bodyStrategies: [
    'Echarme agua fría en la cara',
    'Poner los pies en agua con hielo',
    'Apretar hielo con mis manos',
    'Ponerme una máscara fría',
    'Ducharme con agua muy fría o muy caliente',
    'Hacer ejercicio intenso (correr, saltar, bailar)',
    'Tensionar y relajar los músculos uno por uno',
    'Usar una banda elástica en la muñeca (estirarla y soltarla)',
    'Comer algo muy picante',
  ],

  distractionStrategies: [
    'Hablar o conversar con alguien',
    'Poner música a todo volumen',
    'Caminar rápido por un parque',
    'Ver videos graciosos',
    'Leer un libro',
    'Jugar en el celular',
    'Bailar',
    'Comerme un helado o un limón',
    'Hacer algo agradable por otra persona',
    'Contar las ramas de los árboles',
  ],

  mindfulnessStrategies: [
    'Visión: observar las nubes y buscar formas en ellas',
    'Visión: mirar las estrellas o la naturaleza',
    'Audición: escuchar los sonidos del ambiente conscientemente',
    'Olfato: aplicarme mi loción o perfume favorita',
    'Gusto: tomar una bebida caliente, saboreando cada sorbo',
    'Tacto: acariciar algo suave (cabello, manta, ropa)',
    'Visión: encender una vela y observar la llama',
  ],

  dontList: [],          // el consultante agrega los suyos

  contacts: [],          // el consultante agrega los suyos

  therapistName: '',
  therapistPhone: '',

  reasonsToLive: [],     // muy personal — el consultante llena esto

  notes: '',
}
