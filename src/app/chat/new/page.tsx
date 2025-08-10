import { redirect } from 'next/navigation';

export default async function NewChatPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/conversations`, {
    method: 'POST',
    cache: 'no-store'
  });
  const data = await res.json();
  if (!res.ok) return redirect('/');
  return redirect(`/chat/${data.id}`);
}
