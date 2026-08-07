export const CATEGORIES = ['U7', 'U9', 'U11', 'U13', 'FSGT', 'LOISIR'] as const;

export interface Member {
  id: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F' | '';
  dateNaissance: string; // ISO date (yyyy-mm-dd)
  categorie: string;
  email: string;
  telephone: string;
  cotisationPayee: number;
  cotisationDue: number;
  numeroLicenceFFBB: string;
}

export type MemberInput = Omit<Member, 'id'>;

export function emptyMember(): MemberInput {
  return {
    nom: '',
    prenom: '',
    sexe: '',
    dateNaissance: '',
    categorie: '',
    email: '',
    telephone: '',
    cotisationPayee: 0,
    cotisationDue: 0,
    numeroLicenceFFBB: '',
  };
}
