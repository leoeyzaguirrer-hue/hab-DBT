/** Lista de habilidades DBT para el multi-select de la tarjeta diaria */
export const DBT_SKILLS = [
  // Mindfulness
  { code: 'OBS',    label: 'Observar',           module: 'Mindfulness' },
  { code: 'DESC',   label: 'Describir',           module: 'Mindfulness' },
  { code: 'PART',   label: 'Participar',          module: 'Mindfulness' },
  { code: 'NJUD',   label: 'Sin juzgar',          module: 'Mindfulness' },
  { code: 'OMIND',  label: 'Una cosa a la vez',   module: 'Mindfulness' },
  { code: 'EFEC',   label: 'Efectividad',         module: 'Mindfulness' },

  // Tolerancia al malestar
  { code: 'TIPP',   label: 'TIPP',                module: 'Tolerancia' },
  { code: 'ACCPT',  label: 'ACCEPTS',             module: 'Tolerancia' },
  { code: 'SSELF',  label: 'Auto-calmarse',       module: 'Tolerancia' },
  { code: 'IMPRO',  label: 'IMPROVE',             module: 'Tolerancia' },
  { code: 'RADAC',  label: 'Aceptación radical',  module: 'Tolerancia' },
  { code: 'DISTRO', label: 'Distracción',         module: 'Tolerancia' },
  { code: 'PYCO',   label: 'Pros y contras',      module: 'Tolerancia' },

  // Regulación emocional
  { code: 'CHKF',   label: 'Verificar los hechos',  module: 'Regulación' },
  { code: 'OPAC',   label: 'Acción opuesta',         module: 'Regulación' },
  { code: 'PSOL',   label: 'Resolver problemas',     module: 'Regulación' },
  { code: 'PLEA',   label: 'PLEASE',                 module: 'Regulación' },
  { code: 'BPE',    label: 'Experiencias positivas', module: 'Regulación' },
  { code: 'MCEM',   label: 'Mindfulness de emoción', module: 'Regulación' },

  // Efectividad interpersonal
  { code: 'DMAN',   label: 'DEAR MAN',             module: 'Interpersonal' },
  { code: 'GIVE',   label: 'GIVE',                 module: 'Interpersonal' },
  { code: 'FAST',   label: 'FAST',                 module: 'Interpersonal' },
  { code: 'VALID',  label: 'Validación',           module: 'Interpersonal' },
] as const

export type SkillCode = (typeof DBT_SKILLS)[number]['code']
