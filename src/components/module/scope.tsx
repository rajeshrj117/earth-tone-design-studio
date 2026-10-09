import { addButton } from './helpers';
import { genericCard } from './GenericCard';
import type { ModuleView } from './types';

export const scope: ModuleView = {
  actions:c=>addButton(c,['admin','pm']),
  card:(r,c)=>genericCard(r,c),
};
