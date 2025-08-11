import NewChatClient from "@/components/NewChatClient";

export default function HomePage() {
  // Server Component: only renders a Client wrapper (safe)
  return <NewChatClient />;
}
