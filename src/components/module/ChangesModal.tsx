import type { Rec } from '@/lib/data';
import { Modal } from '../ui';
import { today } from './helpers';
import type { ModuleCtx } from './types';

export function ChangesModal({c}:{c:ModuleCtx}){const{modal,comment,setComment,close,st,say}=c;return <Modal open={modal?.kind==='changes'} onClose={close}><h3 className="serif text-2xl">Request changes</h3><textarea className="input mt-4 min-h-32" placeholder="What should be changed?" value={comment} onChange={e=>setComment(e.target.value)}/><div className="flex gap-2 mt-5"><button className="btn primary flex-1 justify-center" onClick={async()=>{if(!comment.trim())return say('Please add a comment');if(modal?.rec)await st(modal.rec,'Changes requested','Client requested changes',{d:today(),changeRequest:comment.trim()} as Partial<Rec>);close();say('Changes requested')}}>Submit</button><button className="btn" onClick={close}>Cancel</button></div></Modal>}
