# CSTracker

> An esports tracking platform for League of Legends — player profiles, tournaments, teams, and official competitive data in one place.

CSTracker lets you look up any League of Legends player by their in-game name and tag to view their ranked stats, champion mastery, and profile details. The platform is being extended to cover community tournament creation, official competitive events, and full team management.

---

## Features

### Currently available
- **Player profile search** — search by `GameName#TAG` across all major regions
- **Ranked statistics** — Solo/Duo and Flex queues with tier, division, LP, wins/losses, and win rate
- **Champion mastery** — top 5 champions with icons, mastery level, and total points
- **Multi-platform support** — EUW, EUNE, NA, KR, BR, TR, JP

### Roadmap
- Tournament creation and management (community brackets)
- Official competitive tournament browser (Worlds, LEC, LCS, …)
- Team profiles with rosters and stats
- In-depth player history and match timeline

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Backend | Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL |
| Frontend | React 18, Vite, TypeScript, Zustand, React Router 7 |
| External APIs | Riot Games API, League of Legends DDragon (static data) |

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

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/message` | Health check |
| `GET` | `/api/lol/profile/:gameName/:tagLine` | Player profile (`?platform=euw1`) |

---

## Project Structure

```
CSTracker/
├── backend/
│   └── src/
│       ├── routes/       # Express route definitions
│       ├── controllers/  # Request handlers
│       ├── services/     # Business logic & Riot API calls
│       └── types/        # Shared TypeScript types
└── frontend/
    └── src/
        ├── pages/        # React page components
        ├── store/        # Zustand global state
        ├── services/     # API client (fetch wrappers)
        └── types/        # Shared TypeScript types
```

---

## Usage

1. Go to [http://localhost:3000/profile_section](http://localhost:3000/profile_section)
2. Enter a summoner name in the format `Name#TAG` (e.g. `Faker#KR1`)
3. Select the correct platform from the dropdown
4. Click **Search**

---

## Notes

- **Riot developer API keys** expire every 24 hours — regenerate yours at [developer.riotgames.com](https://developer.riotgames.com)
- The PostgreSQL database schema (Prisma) is not yet defined — tournament and team features require models to be added
- This project is not endorsed by Riot Games
