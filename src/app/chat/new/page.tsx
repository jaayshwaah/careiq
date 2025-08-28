import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";

// Ensure this route is always dynamic (no static caching)
export const dynamic = "force-dynamic";

export default async function NewChatPage() {
  // Derive origin safely for local + prod. Allow override via env.
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protoRaw = h.get("x-forwarded-proto") ?? "http";
  const protocol = protoRaw.split(",")[0]; // handle potential "https,http"
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${protocol}://${host}` : "http://localhost:3000");

  // Forward cookies to preserve session/auth for the API route
  const cookieHeader = cookies().getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const res = await fetch(`${origin}/api/chats`, {
    method: "POST",
    // Make sure this never caches
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    // If your API expects a body, add it here. Leaving empty to match your current behavior.
    // body: JSON.stringify({}),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    // Optionally log or report here
    return redirect("/");
  }

  // Defensive parse
  let data: any;
  try {
    data = await res.json();
  } catch {
    return redirect("/");
  }

  const id = data?.chat?.id || data?.id || data?.chat_id;
  if (!id || typeof id !== "string") {
    return redirect("/");
  }

  return redirect(`/chat/${id}`);
}
