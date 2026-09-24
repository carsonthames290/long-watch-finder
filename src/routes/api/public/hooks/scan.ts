import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/scan")({
  server: {
    handlers: {
      POST: async () => {
        const { runScan } = await import("@/lib/scan.server");
        try {
          const result = await runScan();
          return Response.json(result);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("scan failed", message);
          return Response.json({ status: "error", message }, { status: 500 });
        }
      },
    },
  },
});
