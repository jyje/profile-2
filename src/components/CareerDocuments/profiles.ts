import config from '@site/src/generated/career-layout.json';

export type CareerLocale = 'ko' | 'en';
export type CareerVariant = 'resume' | 'selected-cv' | 'cv';
export type CareerRole = 'platform' | 'agents' | 'inference';
export type ResumeSelection = {
  work: {index: number; items: {index: number; text: 'summary' | 'detail'}[]}[];
  projects: {index: number; items: {index: number; text: 'summary' | 'detail'}[]}[];
  skills: {index: number; keywords: number[]}[];
  education: number[]; certificates: number[]; languages: number[];
};
export type DetailedSelection = {
  projectText: Record<number, 'summary' | 'detail'>; workText: Record<number, 'summary' | 'detail'>;
  work: number[]; projects: number[]; skills: number[]; education: number[];
  certificates: number[]; languages: number[]; volunteer: number[];
};
export type CareerProfile = {
  title: string; summary: Record<CareerLocale, string>;
  resume: ResumeSelection; selectedCv: DetailedSelection;
};
// The source compiler validates field modes before emitting this JSON.
export const profiles = config.profiles as Record<CareerRole, CareerProfile>;
export const defaultRole = config.defaultRole as CareerRole;
export const careerRoles = Object.keys(profiles) as CareerRole[];
export function resolveRole(value: string | null): CareerRole {
  return careerRoles.includes(value as CareerRole) ? value as CareerRole : defaultRole;
}
export const documentLabels: Record<CareerLocale, Record<CareerVariant, string>> = {
  ko: {resume: '이력서', 'selected-cv': '경력기술서', cv: '전체 CV'},
  en: {resume: 'Resume', 'selected-cv': 'Selected CV', cv: 'Full CV'},
};
