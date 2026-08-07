export type SessionType = 'entrainement' | 'match';

export interface PlanningSlot {
  day: number; // 1 = lundi ... 7 = dimanche
  dayLabel: string;
  category: string;
  label: string;
  startTime: string;
  endTime: string;
  coach: string;
  type: SessionType;
}

export interface PlanningSession extends PlanningSlot {
  date: Date;
  opponent?: string;
}

export interface PlanningWeek {
  weekStart: Date;
  weekEnd: Date;
  sessions: PlanningSession[];
}

// Créneaux hebdomadaires fixes du club.
export const WEEKLY_SLOTS: PlanningSlot[] = [
  {
    day: 1,
    dayLabel: 'Lundi',
    category: 'U11',
    label: 'U11',
    startTime: '17h00',
    endTime: '18h15',
    coach: 'Mike Brown',
    type: 'entrainement',
  },
  {
    day: 1,
    dayLabel: 'Lundi',
    category: 'U13',
    label: 'U13',
    startTime: '18h15',
    endTime: '19h45',
    coach: 'Mike Brown',
    type: 'entrainement',
  },
  {
    day: 3,
    dayLabel: 'Mercredi',
    category: 'U7/U9',
    label: 'U7 / U9',
    startTime: '10h00',
    endTime: '11h30',
    coach: 'Martin',
    type: 'entrainement',
  },
  {
    day: 3,
    dayLabel: 'Mercredi',
    category: 'U11',
    label: 'U11',
    startTime: '11h30',
    endTime: '13h00',
    coach: 'Martin',
    type: 'entrainement',
  },
  {
    day: 5,
    dayLabel: 'Vendredi',
    category: 'FSGT',
    label: 'FSGT',
    startTime: '21h30',
    endTime: '23h00',
    coach: '',
    type: 'entrainement',
  },
  {
    day: 7,
    dayLabel: 'Dimanche',
    category: 'LOISIR',
    label: 'Loisir',
    startTime: '17h00',
    endTime: '19h00',
    coach: '',
    type: 'entrainement',
  },
];

// Match FSGT simulé le mardi soir : le calendrier réel des matchs n'est pas encore publié.
export const MATCH_SLOT: PlanningSlot = {
  day: 2,
  dayLabel: 'Mardi',
  category: 'FSGT',
  label: 'FSGT',
  startTime: '20h30',
  endTime: '22h30',
  coach: '',
  type: 'match',
};

export interface VacationPeriod {
  label: string;
  start: Date;
  end: Date;
}

// Vacances scolaires Zone C 2026-2027 (académie de Versailles), source education.gouv.fr.
// La date de fin correspond au dernier jour sans cours (reprise le lundi suivant).
export const ZONE_C_VACATIONS: VacationPeriod[] = [
  { label: 'Vacances de la Toussaint', start: new Date(2026, 9, 17), end: new Date(2026, 10, 1) },
  { label: 'Vacances de Noël', start: new Date(2026, 11, 19), end: new Date(2027, 0, 3) },
  { label: "Vacances d'Hiver", start: new Date(2027, 1, 6), end: new Date(2027, 1, 21) },
  { label: 'Vacances de Printemps', start: new Date(2027, 3, 3), end: new Date(2027, 3, 18) },
  { label: "Pont de l'Ascension", start: new Date(2027, 4, 5), end: new Date(2027, 4, 9) },
  { label: "Vacances d'Été", start: new Date(2027, 6, 3), end: new Date(2027, 7, 31) },
];

export function vacationFor(date: Date, periods: VacationPeriod[] = ZONE_C_VACATIONS): VacationPeriod | undefined {
  return periods.find((v) => date >= v.start && date <= v.end);
}

export const NBA_TEAMS = [
  'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets',
  'Chicago Bulls', 'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets',
  'Detroit Pistons', 'Golden State Warriors', 'Houston Rockets', 'Indiana Pacers',
  'LA Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies', 'Miami Heat',
  'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks',
  'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns',
  'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors',
  'Utah Jazz', 'Washington Wizards',
];

// Générateur pseudo-aléatoire à seed fixe : le calendrier simulé reste stable d'un
// rechargement de page à l'autre au lieu de changer à chaque affichage.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const dow = d.getDay() || 7; // dimanche -> 7
  d.setDate(d.getDate() - (dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function buildSeasonPlanning(seasonStart: Date, seasonEnd: Date): PlanningWeek[] {
  const rand = mulberry32(20260901);
  const weeks: PlanningWeek[] = [];
  let cursor = mondayOf(seasonStart);
  let previousOpponent = '';

  while (cursor <= seasonEnd) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const sessions: PlanningSession[] = [];
    for (const slot of WEEKLY_SLOTS) {
      const date = new Date(cursor);
      date.setDate(date.getDate() + (slot.day - 1));
      if (date >= seasonStart && date <= seasonEnd) {
        sessions.push({ ...slot, date });
      }
    }

    const matchDate = new Date(cursor);
    matchDate.setDate(matchDate.getDate() + (MATCH_SLOT.day - 1));
    if (matchDate >= seasonStart && matchDate <= seasonEnd) {
      let opponent = NBA_TEAMS[Math.floor(rand() * NBA_TEAMS.length)];
      while (opponent === previousOpponent) {
        opponent = NBA_TEAMS[Math.floor(rand() * NBA_TEAMS.length)];
      }
      previousOpponent = opponent;
      sessions.push({ ...MATCH_SLOT, date: matchDate, opponent });
    }

    sessions.sort((a, b) => a.date.getTime() - b.date.getTime());

    if (sessions.length > 0) {
      weeks.push({ weekStart: cursor, weekEnd, sessions });
    }

    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}
