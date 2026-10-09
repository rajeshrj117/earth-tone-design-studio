import { addButton } from './helpers';
import { fileCard } from './FileCard';
import type { ModuleView } from './types';

export const floorplans: ModuleView = {
  actions:c=>addButton(c,['admin','pm','designer']),
  layout:'grid',
  card:fileCard,
};
