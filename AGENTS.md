<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture

- The app is 100% client-side (no server functions, no Supabase, no API keys) so it can be hosted statically on Cloudflare Pages: YouTube search runs in the browser via the CORS reader in `src/lib/yt-client.ts`, the TikTok feed uses the curated catalog in `src/lib/catalog.ts`, and likes/favorites live in `localStorage`.
