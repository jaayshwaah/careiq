import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ChatIndexPage() {
  // Redirect to root which is the new chat page
  return redirect("/");
}
