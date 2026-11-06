import { requireChatGPTUser } from './chatgpt-auth';
import { ForeignDeskShortlistPrototype } from './dashboard';
export const dynamic = 'force-dynamic';
export default async function Home() { await requireChatGPTUser('/'); return <ForeignDeskShortlistPrototype/>; }
