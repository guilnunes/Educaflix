import type { Grade, Subject } from '../shared/types';

// Tabelas de referência. O servidor cria content/db/subjects.json e grades.json
// com estes valores quando os arquivos ainda não existem.

export const SUBJECTS: Subject[] = [
  {
    id: 'matematica',
    name: 'Matemática',
    color: '#2f6fde',
    character_name: 'Nico',
    character_summary: 'Um número estilizado que muda de forma para virar o número da cena.',
    skill_file: 'materias/matematica.md',
    sort_order: 1,
  },
  {
    id: 'portugues',
    name: 'Português',
    color: '#d0473f',
    character_name: 'Livro de óculos',
    character_summary: 'Um livro curioso de óculos (a definir).',
    skill_file: 'materias/portugues.md',
    sort_order: 2,
  },
  {
    id: 'ciencias',
    name: 'Ciências',
    color: '#1f9d6b',
    character_name: 'Robozinho',
    character_summary: 'Um robozinho amigável (a definir).',
    skill_file: 'materias/ciencias.md',
    sort_order: 3,
  },
  {
    id: 'historia',
    name: 'História',
    color: '#a5682a',
    character_name: 'Explorador',
    character_summary: 'Um explorador aventureiro de chapéu e mochila (a definir).',
    skill_file: 'materias/historia.md',
    sort_order: 4,
  },
  {
    id: 'geografia',
    name: 'Geografia',
    color: '#1b8aa6',
    character_name: 'Navegador',
    character_summary: 'Um navegador com mapa e luneta (a definir).',
    skill_file: 'materias/geografia.md',
    sort_order: 5,
  },
  {
    id: 'artes',
    name: 'Artes',
    color: '#9b4fc4',
    character_name: 'Pintor',
    character_summary: 'Um pintor/artista de boina e pincel (a definir).',
    skill_file: 'materias/artes.md',
    sort_order: 6,
  },
];

const fundamental: Grade[] = Array.from({ length: 9 }, (_, i) => {
  const year = i + 1;
  return {
    id: `ef-${year}`,
    name: `${year}º ano do Ensino Fundamental`,
    former_name: year === 1 ? 'antiga 1ª série do 1º grau' : null,
    level: 'fundamental' as const,
    year,
    age_min: 5 + year,
    age_max: 6 + year,
    sort_order: year,
  };
});

const medio: Grade[] = Array.from({ length: 3 }, (_, i) => {
  const year = i + 1;
  return {
    id: `em-${year}`,
    name: `${year}ª série do Ensino Médio`,
    former_name: null,
    level: 'medio' as const,
    year,
    age_min: 14 + year,
    age_max: 15 + year,
    sort_order: 9 + year,
  };
});

export const GRADES: Grade[] = [...fundamental, ...medio];
