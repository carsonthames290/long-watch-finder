import { Link } from "@tanstack/react-router";

export function SiteNav() {
  const cls = "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground";
  const active = { className: "rounded-md px-3 py-1.5 text-sm bg-secondary text-foreground" };
  return (
    <nav className="mx-auto flex max-w-6xl items-center gap-2 px-6 pt-6">
      <span className="mr-4 font-bold">Longform</span>
      <Link to="/" className={cls} activeProps={active} activeOptions={{ exact: true }}>Library</Link>
      <Link to="/youtube" className={cls} activeProps={active}>YouTube</Link>
      <Link to="/tiktok" className={cls} activeProps={active}>TikTok</Link>
    </nav>
  );
}
