# Ledgerly and Threadmere

Ledgerly and Threadmere are independent repositories. In this workspace they are checked out next to each other under `repos/`. Each has its own history, package manager, and product README. Use this page to pick a repo and start it. Run commands, demo behavior, and architecture rules stay in that repo's own README.

| | Ledgerly | Threadmere |
| --- | --- | --- |
| Checkout | `repos/ledgerly` | `repos/threadmere` |
| GitHub | [njm-cursor-x/ledgerly](https://github.com/njm-cursor-x/ledgerly) | [njm-cursor-x/threadmere](https://github.com/njm-cursor-x/threadmere) |
| Default branch | `main` | `master` |
| Role | Fictional B2B billing and collections app for Grok Build demos. Fieldnote Workspace. Operator Avery Quinn. | Fictional discussions and comments app. The Vite app is a rebrand of `apps/react-vite` from [bulletproof-react](https://github.com/alan2207/bulletproof-react). |
| Stack | Next.js, React, Prisma, SQLite, Tailwind CSS | React, Vite, TypeScript, TanStack Query, MSW. The repo also keeps Next.js App Router and Pages examples. |
| Package manager | npm | Yarn 1.22+ |
| Node | 20 | 20+ |
| App URL | http://localhost:43173 | http://localhost:3000 for the Vite app |
| Data | Seeded SQLite. Demo clock is 23 August 2026. | Mock API in the browser. Optional sample discussions when a team is registered. |
| Auth | None | Mock register and login |
| License | Private demo. No license file. | [MIT](https://github.com/njm-cursor-x/threadmere/blob/master/LICENSE). Upstream copyright remains in that file. |

## Ledgerly

Catalog prices are only Starter **$49**, Growth **$99**, and Scale **$249**. Customer names come from `prisma/seed.ts` and `prisma/extra-accounts.ts`.

Surfaces: Dashboard, Invoices, Collections, Disputes, Settings.

From the Ledgerly repo root (`repos/ledgerly` in this workspace):

```bash
npm i
npx prisma generate
npx prisma db seed
npm run dev
```

Open http://localhost:43173. The `start-ledgerly` skill does the same start: it seeds only when the database is missing or empty, and opens `runbooks.html` in a Cursor Canvas.

Demo tracks are **101**, **201**, and **301**. Beats live in `runbooks.html` (`runbooks.html?track=201`, `runbooks.html?track=301`). Before a session, run the `preflight-checker` subagent with the track id. It reports pass, fail, or blocked and does not install, seed, start the server, or stage Linear. Reset a demo with `npm run demo:reset`.

One planted test stays red on a clean tree: `tests/suggested-credit-api.test.ts`. Leave that test, both suggested-credit routes, and the seed alone. The suite count and the rest of the demo setup — agents, skills, and the Linear team steps — are in [README.md](README.md).

## Threadmere

Teams keep a decision and the comments under it in one workspace. In `apps/react-vite`:

- Threaded discussions with Markdown comments
- A workspace per team; the first user to register a team is its admin
- Admins create, edit, and delete discussions. Members comment and can delete their own comments
- Profiles (name and bio)
- Optional sample discussions for a new workspace: onboarding, weekly ops review, release go/no-go, UI naming

From the Threadmere repo root (`repos/threadmere` in this workspace):

```bash
cd apps/react-vite
cp .env.example .env
yarn install
yarn dev
```

Open http://localhost:3000, choose **Get started**, and register a team. MSW serves the API in the browser. Mock state is stored in `localStorage` under `msw-db`.

| Variable | Purpose |
| --- | --- |
| `VITE_APP_API_URL` | API base URL |
| `VITE_APP_ENABLE_API_MOCKING` | `true` uses the in-browser mocks |
| `VITE_APP_SEED_DEMO_DATA` | `true` seeds sample teammates, discussions, and comments for a new team. Off in unit tests and e2e. |

Scripts in that app: `yarn dev`, `yarn build`, `yarn test` (Vitest), `yarn test-e2e` (Playwright; copy `.env.example-e2e` to `.env` first), `yarn lint`, `yarn check-types`.

The other two apps are the upstream examples, still named for bulletproof-react:

| App | Path | Start |
| --- | --- | --- |
| Vite (Threadmere) | `apps/react-vite` | Commands above. Port 3000. |
| Next.js App Router | `apps/nextjs-app` | `yarn run-mock-server` (http://localhost:8080/api), then `yarn dev` on port 3000. |
| Next.js Pages | `apps/nextjs-pages` | Same mock server. Feature code lives under `app` and is re-exported through `pages`. |

From the Threadmere root, `yarn prepare` installs all three apps. Feature-folder rules, server state, and test layout are in `AGENTS.md` and the root [README.md](https://github.com/njm-cursor-x/threadmere/blob/master/README.md). Threadmere-specific setup is in [`apps/react-vite/README.md`](https://github.com/njm-cursor-x/threadmere/blob/master/apps/react-vite/README.md).

Threadmere is built on bulletproof-react by Alan Alickovic (upstream commit `9506629` for the Vite rebrand). The rebrand changes the name, visuals, copy, and demo data. The original copyright stays in the repository `LICENSE`.

## Boundaries

- Install inside the repo you are running. Ledgerly uses npm. Threadmere uses Yarn.
- Ledgerly listens on port **43173**. Threadmere's Vite app listens on port **3000**. Both can run at once.
- Ledgerly data is `prisma/dev.db`. Threadmere keeps mock state in the browser (`localStorage`, key `msw-db`).
- Keep Ledgerly prices and customer names inside Ledgerly. Keep Threadmere teams, discussions, and comments inside Threadmere.

When a run command or a planted demo behavior changes, update that repo's README. This page only points at those details, so it goes stale if it starts restating them.
