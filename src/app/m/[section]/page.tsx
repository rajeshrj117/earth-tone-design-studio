'use client';
import { useParams } from 'next/navigation';
import Shell from '@/components/Shell';
import Module from '@/components/Module';
import { Head } from '@/components/ui';
import { MODULES } from '@/lib/data';

const SUB: Record<string, string> = {
  scope: 'Trade-wise scope and delivery status.', quotations: 'Approved quotations and revisions.', variations: 'Additional work, with approvals.', payments: 'Invoices, receipts and upcoming stages.',
  timeline: 'Phases, extensions and handover plan with progress milestones.', floorplans: 'Interactive floor plans for each level and space.', materials: 'Client material selections, approvals and pending choices.', expenses: 'Internal project expense tracking by trade and vendor.', tasks: 'Internal work in progress.', approvals: 'Designs and decisions that need a sign-off.', documents: 'Drawings, renders and signed papers.',
  updates: 'Photo updates from site.', meetings: 'Site visits and meetings.', requests: 'Questions and change requests.', snags: 'Defects raised and rectified.',
  agreements: 'Contracts and addenda.', completion: 'Final steps before handover.', feedback: 'Your experience with ETDS.',
};
export default function Section() {
  const { section } = useParams<{ section: string }>(); const m = MODULES.find(x => x.key === section);
  return <Shell><Head eyebrow="ETDS" title={m?.label ?? 'Module'} sub={SUB[section]} />{m ? <Module key={section} mod={section} /> : <p>Module not found.</p>}</Shell>;
}
