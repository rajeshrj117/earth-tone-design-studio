import { addButton } from './helpers';
import { decide } from './recordActions';
import { genericCard } from './GenericCard';
import type { ModuleView } from './types';

export const approvals: ModuleView = {
  actions:c=>addButton(c,['admin','pm','designer']),
  card:(r,c)=>genericCard(r,c,decide(r,c)),
};
