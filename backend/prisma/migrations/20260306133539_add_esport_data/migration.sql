-- CreateTable
CREATE TABLE "EsportTournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "region" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "prizepool" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsportTournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsportTeam" (
    "id" TEXT NOT NULL,
    "short" TEXT,
    "image" TEXT,
    "region" TEXT,
    "location" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsportTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsportPlayer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT,
    "country" TEXT,
    "birthdate" TEXT,
    "role" TEXT,
    "residency" TEXT,
    "isRetired" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsportPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsportRoster" (
    "id" SERIAL NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" TEXT,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsportRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsportMatch" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT,
    "team1" TEXT,
    "team2" TEXT,
    "winner" TEXT,
    "dateTime" TEXT,
    "round" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsportMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsportStanding" (
    "id" SERIAL NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamShort" TEXT,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsportStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsportPlayerStat" (
    "id" SERIAL NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "champion" TEXT,
    "kills" INTEGER,
    "deaths" INTEGER,
    "assists" INTEGER,
    "gold" INTEGER,
    "cs" INTEGER,
    "damageToChampions" INTEGER,
    "visionScore" INTEGER,
    "team" TEXT,
    "win" BOOLEAN,
    "role" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EsportPlayerStat_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EsportPlayer" ADD CONSTRAINT "EsportPlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EsportTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsportRoster" ADD CONSTRAINT "EsportRoster_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "EsportTournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsportRoster" ADD CONSTRAINT "EsportRoster_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EsportTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsportRoster" ADD CONSTRAINT "EsportRoster_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "EsportPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsportMatch" ADD CONSTRAINT "EsportMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "EsportTournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsportStanding" ADD CONSTRAINT "EsportStanding_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "EsportTournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsportPlayerStat" ADD CONSTRAINT "EsportPlayerStat_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "EsportMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsportPlayerStat" ADD CONSTRAINT "EsportPlayerStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "EsportPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
