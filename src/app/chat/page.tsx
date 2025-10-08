import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ChatIndexPage() {
  // Redirect to new chat page
  return redirect("/chat/new");
}
