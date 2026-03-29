# CSTracker

> An esports tracking platform for League of Legends — player profiles, tournaments, teams, and official competitive data in one place.

CSTracker lets you look up any League of Legends player by their in-game name and tag to view their ranked stats, champion mastery, and profile details. The platform also covers official competitive events with full tournament browsing, team profiles, and player career tracking.

---

## Features

### Currently available
- **Player profile search** — search by `GameName#TAG` across all major regions
- **Ranked statistics** — Solo/Duo and Flex queues with tier, division, LP, wins/losses, and win rate
- **Champion mastery** — top 5 champions with icons, mastery level, and total points
- **Multi-platform support** — EUW, EUNE, NA, KR, BR, TR, JP
- **Official tournament browser** — LCK, LEC, LCS, LPL, MSI, Worlds, First Stand; filtered by league and year
- **Tournament detail** — match scores (BO series), official standings, team rosters
- **Group & bracket views** — automatic format detection, enriched standings (series/games/streak), head-to-head matrix, bracket view for single/double elimination and mixed formats
- **Team profiles** — current roster sorted by role, former players, team logos
- **Esport player profiles** — career history, per-match statistics

### Roadmap
- Tournament creation and management (community brackets)
- In-depth player history and match timeline

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Backend | Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL |
| Frontend | React 18, Vite, TypeScript, Zustand, React Router 7 |
| External APIs | Riot Games API, League of Legends DDragon, lol.fandom.com Cargo API, LoL Esports API |

---

## Getting Started (Docker)

**Prerequisites:** Docker + Docker Compose

```bash
git clone <repo-url>
cd CSTracker
cp .env.example .env   # fill in your values
docker compose up --build
```

- **App** → [http://localhost:3000](http://localhost:3000)
- **pgAdmin** → [http://localhost:5050](http://localhost:5050) (admin@admin.com / admin)

---

## Configuration

Copy `.env.example` to `.env` at the project root and fill in:

| Variable | Description |
|---|---|
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `RIOT_API_KEY` | Riot Games API key — get one at [developer.riotgames.com](https://developer.riotgames.com) (expires every 24h) |
| `LEAGUEPEDIA_USERNAME` | Leaguepedia bot username (`User@BotName`) |
| `LEAGUEPEDIA_PASSWORD` | Leaguepedia bot password |

> The `DATABASE_URL` is built automatically from `DB_USER` and `DB_PASSWORD` — no need to set it manually.

---

## Running in Development (without Docker)

**Prerequisites:** Node.js ≥ 18, PostgreSQL running locally

```bash
# Backend
cd backend
cp .env.example .env   # fill in your local DB credentials and API keys
npm install
npx prisma db push
npm run dev            # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev            # http://localhost:3000
```

> Vite automatically proxies `/api` requests to `http://localhost:5000` — no CORS setup needed.
>
> The `backend/.env.example` contains all required variables for local dev. In Docker, these are injected by `docker-compose.yml` instead.

---

## API Endpoints

### Riot / Player

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/message` | Health check |
| `GET` | `/api/lol/profile/:gameName/:tagLine` | Player profile (`?platform=euw1`) |

### Esport — Historical data (Leaguepedia → DB)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/esport/sync` | Sync Leaguepedia → DB (`?league=LCK&season=2025`) |
| `GET` | `/api/esport/tournaments` | List tournaments (`?league=LCK&year=2025`) |
| `GET` | `/api/esport/tournaments/:id` | Tournament detail (matches, standings, rosters) |
| `GET` | `/api/esport/players` | Search players (`?q=Faker`) |
| `GET` | `/api/esport/players/:id` | Esport player profile |
| `GET` | `/api/esport/teams/:id` | Team profile |

### Esport — Live data (LoL Esports API)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/esport/live/leagues` | All leagues |
| `GET` | `/api/esport/live/schedule` | Match schedule (`?league=lck`) |
| `GET` | `/api/esport/live/tournaments` | Live tournaments (`?league=lck`) |
| `GET` | `/api/esport/live/standings` | Live standings (`?tournamentId=...`) |

---

## Project Structure

```
CSTracker/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── prisma/schema.prisma
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       └── types/
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── pages/
        ├── services/
        └── types/
```

---

## Notes

- **Riot developer API keys** expire every 24 hours — regenerate yours at [developer.riotgames.com](https://developer.riotgames.com)
- Tournament data is synced on demand via `POST /api/esport/sync` — run it once per league/season before browsing
- This project is not endorsed by Riot Games
