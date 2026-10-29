import { createFileRoute } from "@tanstack/react-router";
import { WatchApp } from "@/components/watch-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <WatchApp />;
}
