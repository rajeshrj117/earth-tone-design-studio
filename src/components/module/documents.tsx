import { addButton } from './helpers';
import { fileCard } from './FileCard';
import type { ModuleView } from './types';

export const documents: ModuleView = {
  actions:c=>addButton(c,['admin','pm','designer']),
  layout:'grid',
  card:fileCard,
};
