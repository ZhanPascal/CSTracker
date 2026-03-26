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
- **Group & bracket views** — automatic format detection, enriched standings (series/games/streak), head-to-head matrix, single and double elimination bracket view
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

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** running locally (or a remote instance)
- **Riot Games API key** — get one at [developer.riotgames.com](https://developer.riotgames.com)
  > Development keys expire every 24 hours and must be regenerated.

---

## Installation

```bash
git clone <repo-url>
cd CSTracker

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

---

## Configuration

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5000
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DATABASE_URL="postgresql://user:password@localhost:5432/cstracker_db"
```

Then apply the database schema:

```bash
cd backend && npx prisma db push
```

> The Vite dev server automatically proxies `/api` requests to `http://localhost:5000` — no additional CORS setup needed during development.

---

## Running in Development

Open two terminals:

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:3000)
cd frontend && npm run dev
```

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
├── backend/
│   ├── prisma/
│   │   └── schema.prisma     # Database schema (Prisma)
│   └── src/
│       ├── routes/           # Express route definitions
│       ├── controllers/      # Request handlers
│       ├── services/         # Business logic, Riot API, Leaguepedia, LoL Esports
│       └── types/            # Shared TypeScript types
└── frontend/
    └── src/
        ├── pages/            # React page components (ProfileSection, TournamentSection)
        ├── services/         # API client (fetch wrappers)
        └── types/            # Shared TypeScript types
```

---

## Usage

1. Go to [http://localhost:3000/profile_section](http://localhost:3000/profile_section)
2. Enter a summoner name in the format `Name#TAG` (e.g. `Faker#KR1`)
3. Select the correct platform from the dropdown
4. Click **Search**

For the tournament browser, navigate to [http://localhost:3000/tournament_section](http://localhost:3000/tournament_section) and select a league and year.

---

## Notes

- **Riot developer API keys** expire every 24 hours — regenerate yours at [developer.riotgames.com](https://developer.riotgames.com)
- Tournament data is synced on demand via `POST /api/esport/sync` — run it once per league/season before browsing
- This project is not endorsed by Riot Games
