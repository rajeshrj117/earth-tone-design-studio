import { addButton } from './helpers';
import { fileCard } from './FileCard';
import type { ModuleView } from './types';

export const updates: ModuleView = {
  actions:c=>addButton(c,['admin','pm','designer']),
  card:fileCard,
};
