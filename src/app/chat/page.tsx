import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ChatIndexPage() {
  // Redirect to a fresh chat (ChatGPT-style)
  return redirect("/chat/new");
}
