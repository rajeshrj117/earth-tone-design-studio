import { Rec, Project } from './data';

// Projects now live in Firestore; the store pushes the live list here so money() stays a pure helper.
let PROJ: Project[] = [];
export const setProjectsForCalc = (p: Project[]) => { PROJ = p; };

export const money = (recs: Rec[], pid: string) => {
  const own = PROJ.find(p => p.id === pid)?.value ?? 0;
  const v = recs.filter(r => r.p === pid && r.m === 'variations' && r.s === 'Approved').reduce((a, b) => a + (b.amt ?? 0), 0);
  const sum = (s: string) => recs.filter(r => r.p === pid && r.m === 'payments' && r.s === s).reduce((a, b) => a + (b.amt ?? 0), 0);
  return { orig: own, vars: v, current: own + v, paid: sum('Received'), due: sum('Due'), upcoming: sum('Upcoming') };
};
