/**
 * Unified NFL API Client
 *
 * This module provides a unified interface for accessing NFL data,
 * supporting multiple API providers (RapidAPI and API-Sports).
 *
 * The provider is selected based on the NFL_API_PROVIDER environment variable.
 * Default is 'rapidapi' if not specified.
 */

import { RapidApiNFLClient, rapidApiNFLClient } from './rapidapi-nfl-client'
import { NFLApiClient, nflApiClient } from './nfl-client'
import type { NFLGame, NFLTeam, NFLLeague, NFLSeason } from '@/lib/types/nfl-api-types'

// Provider type
export type NFLApiProvider = 'rapidapi' | 'api-sports'

// Get the configured provider
const getProvider = (): NFLApiProvider => {
    const provider = process.env.NFL_API_PROVIDER?.toLowerCase()
    if (provider === 'api-sports') {
        return 'api-sports'
    }
    return 'rapidapi' // Default to rapidapi
}

/**
 * Unified NFL API Client Interface
 * Wraps both RapidAPI and API-Sports clients with a common interface
 */
export interface INFLApiClient {
    fetchTeams(leagueId?: number, season?: number): Promise<NFLTeam[]>
    fetchGames(season: number, leagueId?: number): Promise<NFLGame[]>
    fetchGameById(gameId: number | string): Promise<NFLGame | null>
    fetchGamesByIds(gameIds: (number | string)[]): Promise<NFLGame[]>
    fetchSeasons(leagueId?: number): Promise<NFLSeason[]>
    fetchLeagues(): Promise<NFLLeague[]>
}

/**
 * Extended RapidAPI client interface with additional methods
 */
export interface IRapidApiNFLClient extends INFLApiClient {
    fetchPlayoffGames(season: number, week?: number): Promise<NFLGame[]>
    fetchGamesByWeek(season: number, week: number, seasonType?: number): Promise<NFLGame[]>
    fetchLiveScores(): Promise<NFLGame[]>
    fetchScoreboardByDay(date: string): Promise<NFLGame[]>
}

/**
 * Get the appropriate NFL API client based on configuration
 */
export function getNFLApiClient(): INFLApiClient {
    const provider = getProvider()

    if (provider === 'api-sports') {
        console.log('Using API-Sports NFL client')
        return nflApiClient
    }

    console.log('Using RapidAPI NFL client')
    return rapidApiNFLClient
}

/**
 * Get the RapidAPI client specifically (for accessing extended methods)
 */
export function getRapidApiClient(): RapidApiNFLClient {
    return rapidApiNFLClient
}

/**
 * Get the API-Sports client specifically
 */
export function getApiSportsClient(): NFLApiClient {
    return nflApiClient
}

/**
 * Check if RapidAPI is the configured provider
 */
export function isRapidApiProvider(): boolean {
    return getProvider() === 'rapidapi'
}

/**
 * The default NFL API client instance
 * Uses RapidAPI by default, or API-Sports if configured
 */
export const nflApi = getNFLApiClient()

// Re-export types for convenience
export type { NFLGame, NFLTeam, NFLLeague, NFLSeason } from '@/lib/types/nfl-api-types'
export { mapGameStatus, mapPlayoffRound, extractConference, extractDivision } from '@/lib/types/nfl-api-types'

// Re-export the individual clients for direct access if needed
export { RapidApiNFLClient, rapidApiNFLClient } from './rapidapi-nfl-client'
export { NFLApiClient, nflApiClient } from './nfl-client'

// Re-export season type constants
export { RAPIDAPI_SEASON_TYPES } from '@/lib/types/rapidapi-nfl-types'
