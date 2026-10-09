import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { useApp } from '@/lib/store';
import type { ModDef, Rec } from '@/lib/data';

export type App = ReturnType<typeof useApp>;
export type Role = NonNullable<App['user']>['role'];
export type ModalState = { kind: string; rec?: Rec } | null;
export type FormValue = Record<string, string>;

/** Everything a per-module view needs from the Module shell (state, permissions, project data, helpers). */
export interface ModuleCtx extends Pick<App, 'act' | 'add' | 'say' | 'upload' | 'token' | 'clients' | 'myProjects' | 'recsFor'> {
  mod: string;
  pid?: string;
  def: ModDef;
  role: Role;
  staff: boolean;
  staffWrite: boolean;
  pm: boolean;
  client: boolean;
  list: Rec[];
  pids: string[];
  tp: string;
  pj: (id: string) => App['myProjects'][number];
  f: string;
  setF: Dispatch<SetStateAction<string>>;
  modal: ModalState;
  setModal: Dispatch<SetStateAction<ModalState>>;
  form: FormValue;
  setForm: Dispatch<SetStateAction<FormValue>>;
  file: File | null;
  setFile: Dispatch<SetStateAction<File | null>>;
  comment: string;
  setComment: Dispatch<SetStateAction<string>>;
  method: string;
  setMethod: Dispatch<SetStateAction<string>>;
  stars: Record<string, number>;
  setStars: Dispatch<SetStateAction<Record<string, number>>>;
  close: () => void;
  openForm: (kind: string, r?: Rec) => void;
  st: (r: Rec, s: string, what: string, extra?: Partial<Rec>) => ReturnType<App['act']>;
}

/** One module's UI. Every hook is optional; Module.tsx supplies sensible defaults. */
export interface ModuleView {
  /** Header buttons (add / create). */
  actions?: (c: ModuleCtx) => ReactNode[];
  /** Summary stats (or a banner) shown above the list. */
  top?: (c: ModuleCtx) => ReactNode;
  /** One record. Used by the default per-project list body. */
  card?: (r: Rec, c: ModuleCtx) => ReactNode;
  /** Replaces the default per-project list body entirely (e.g. timeline). */
  body?: (c: ModuleCtx) => ReactNode;
  /** Render the body even when there are no records (e.g. client feedback form). */
  keepWhenEmpty?: (c: ModuleCtx) => boolean;
  /** 'grid' lays cards out 2-3 across; default is a vertical stack. */
  layout?: 'grid' | 'stack';
  /** Set to false for modules that must see every record (timeline order, payment totals, separate collections). Default: paginated. */
  paginate?: boolean;
  /** Module-specific modals (payments, agreements). */
  modals?: (c: ModuleCtx) => ReactNode;
}
