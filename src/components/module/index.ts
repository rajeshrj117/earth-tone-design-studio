import { agreements } from './agreements';
import { approvals } from './approvals';
import { completion } from './completion';
import { documents } from './documents';
import { expenses } from './expenses';
import { feedback } from './feedback';
import { floorplans } from './floorplans';
import { materials } from './materials';
import { meetings } from './meetings';
import { payments } from './payments';
import { quotations } from './quotations';
import { requests } from './requests';
import { scope } from './scope';
import { snags } from './snags';
import { tasks } from './tasks';
import { timeline } from './timeline';
import { updates } from './updates';
import { variations } from './variations';
import type { ModuleView } from './types';

export const VIEWS: Record<string, ModuleView> = {
  agreements, approvals, completion, documents, expenses, feedback, floorplans, materials, meetings, payments, quotations, requests, scope, snags, tasks, timeline, updates, variations,
};
