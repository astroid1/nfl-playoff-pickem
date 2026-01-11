/**
 * NFL API Client for RapidAPI (nfl-api-data)
 * Handles all interactions with the RapidAPI NFL endpoint
 *
 * This client maintains the same interface as the original NFLApiClient
 * to ensure backwards compatibility with existing code.
 */

import { createServiceClient } from '@/lib/supabase/service'
import type {
    NFLGame,
    NFLTeam,
    NFLLeague,
    NFLSeason,
} from '@/lib/types/nfl-api-types'
import type {
    RapidApiTeamListResponse,
    RapidApiScoreboardResponse,
} from '@/lib/types/rapidapi-nfl-types'
import {
    transformRapidApiTeam,
    transformRapidApiScoreboard,
    transformRapidApiBoxscore,
    getTeamConference,
    getTeamDivision,
} from '@/lib/api/rapidapi-transformers'
import { RAPIDAPI_SEASON_TYPES } from '@/lib/types/rapidapi-nfl-types'

const RAPIDAPI_BASE_URL = process.env.RAPIDAPI_NFL_BASE_URL || 'https://nfl-api-data.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'nfl-api-data.p.rapidapi.com'

if (!RAPIDAPI_KEY) {
    console.warn('RAPIDAPI_KEY is not set. API calls will fail.')
}

interface ApiSyncLogEntry {
    sync_type: 'games' | 'scores' | 'teams'
    status: 'success' | 'failed' | 'partial'
    api_provider: string
    records_updated: number
    error_message?: string
    response_time_ms: number
    started_at: string
}

export class RapidApiNFLClient {
    private baseUrl: string
    private apiKey: string
    private apiHost: string
    private supabase: ReturnType<typeof createServiceClient> | null = null

    constructor(apiKey?: string, baseUrl?: string, apiHost?: string) {
        this.apiKey = apiKey || RAPIDAPI_KEY || ''
        this.baseUrl = baseUrl || RAPIDAPI_BASE_URL
        this.apiHost = apiHost || RAPIDAPI_HOST
    }

    /**
     * Initialize Supabase client for logging (server-side only)
     */
    private initSupabase() {
        if (!this.supabase) {
            try {
                this.supabase = createServiceClient()
            } catch (error) {
                console.warn('Supabase client not available:', error)
                return null
            }
        }
        return this.supabase
    }

    /**
     * Log API sync operation to database
     */
    private async logSync(entry: ApiSyncLogEntry) {
        try {
            const supabase = this.initSupabase()
            if (!supabase) {
                return
            }

            await supabase.from('api_sync_log').insert({
                ...entry,
                completed_at: new Date().toISOString(),
            })
        } catch (error) {
            console.error('Failed to log API sync:', error)
        }
    }

    /**
     * Make a request to the RapidAPI NFL endpoint
     */
    private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
        const startTime = Date.now()
        const url = new URL(endpoint, this.baseUrl)

        // Add query parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value))
            }
        })

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': this.apiKey,
                    'x-rapidapi-host': this.apiHost,
                },
            })

            const responseTime = Date.now() - startTime

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`)
            }

            const data: T = await response.json()

            // Log rate limit headers if available
            const rateLimitRemaining = response.headers.get('x-ratelimit-requests-remaining')
            const rateLimitLimit = response.headers.get('x-ratelimit-requests-limit')

            if (rateLimitRemaining && rateLimitLimit) {
                console.log(`RapidAPI Rate Limit: ${rateLimitRemaining}/${rateLimitLimit} remaining`)
            }

            return data
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('RapidAPI NFL request failed:', errorMessage)
            throw error
        }
    }

    /**
     * Fetch all teams
     * Uses /nfl-team-list endpoint
     */
    async fetchTeams(leagueId: number = 1, season?: number): Promise<NFLTeam[]> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            const response = await this.request<RapidApiTeamListResponse>('/nfl-team-list')
            const responseTime = Date.now() - startTime

            // Transform RapidAPI response to our NFLTeam format
            // and enrich with conference/division data
            const teams = (response.teams || []).map(team => {
                const transformed = transformRapidApiTeam(team)
                // Enrich with conference and division from our lookup table
                const conference = getTeamConference(team.abbreviation)
                const division = getTeamDivision(team.abbreviation)

                return {
                    ...transformed,
                    conference: conference ? { name: conference === 'AFC' ? 'American Football Conference' : 'National Football Conference' } : undefined,
                    division: division ? { name: division } : undefined,
                }
            })

            await this.logSync({
                sync_type: 'teams',
                status: 'success',
                api_provider: 'rapidapi-nfl',
                records_updated: teams.length,
                response_time_ms: responseTime,
                started_at,
            })

            return teams
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'teams',
                status: 'failed',
                api_provider: 'rapidapi-nfl',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }

    /**
     * Fetch games for a specific season
     * Uses /nfl-scoreboard endpoint with year parameter
     */
    async fetchGames(season: number, leagueId: number = 1): Promise<NFLGame[]> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            const response = await this.request<RapidApiScoreboardResponse>('/nfl-scoreboard', {
                year: season,
            })
            const responseTime = Date.now() - startTime

            // Transform RapidAPI response to our NFLGame format
            const games = transformRapidApiScoreboard(response)

            await this.logSync({
                sync_type: 'games',
                status: 'success',
                api_provider: 'rapidapi-nfl',
                records_updated: games.length,
                response_time_ms: responseTime,
                started_at,
            })

            return games
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'games',
                status: 'failed',
                api_provider: 'rapidapi-nfl',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }

    /**
     * Fetch playoff games for a specific season
     * Uses /nfl-scoreboard-week-type endpoint with seasontype=3 (postseason)
     */
    async fetchPlayoffGames(season: number, week?: number): Promise<NFLGame[]> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            const params: Record<string, any> = {
                year: season,
                seasontype: RAPIDAPI_SEASON_TYPES.POSTSEASON,
            }

            if (week !== undefined) {
                params.week = week
            }

            const response = await this.request<RapidApiScoreboardResponse>('/nfl-scoreboard-week-type', params)
            const responseTime = Date.now() - startTime

            const games = transformRapidApiScoreboard(response)

            await this.logSync({
                sync_type: 'games',
                status: 'success',
                api_provider: 'rapidapi-nfl',
                records_updated: games.length,
                response_time_ms: responseTime,
                started_at,
            })

            return games
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'games',
                status: 'failed',
                api_provider: 'rapidapi-nfl',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }

    /**
     * Fetch games for a specific week
     * Uses /nfl-scoreboard-week-type endpoint
     */
    async fetchGamesByWeek(season: number, week: number, seasonType: number = RAPIDAPI_SEASON_TYPES.REGULAR): Promise<NFLGame[]> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            const response = await this.request<RapidApiScoreboardResponse>('/nfl-scoreboard-week-type', {
                year: season,
                week,
                seasontype: seasonType,
            })
            const responseTime = Date.now() - startTime

            const games = transformRapidApiScoreboard(response)

            await this.logSync({
                sync_type: 'games',
                status: 'success',
                api_provider: 'rapidapi-nfl',
                records_updated: games.length,
                response_time_ms: responseTime,
                started_at,
            })

            return games
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'games',
                status: 'failed',
                api_provider: 'rapidapi-nfl',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }

    /**
     * Fetch a single game by ID
     * Uses /nfl-boxscore endpoint
     */
    async fetchGameById(gameId: number | string): Promise<NFLGame | null> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            const response = await this.request<any>('/nfl-boxscore', {
                id: gameId,
            })
            const responseTime = Date.now() - startTime

            const game = transformRapidApiBoxscore(response)

            await this.logSync({
                sync_type: 'scores',
                status: 'success',
                api_provider: 'rapidapi-nfl',
                records_updated: game ? 1 : 0,
                response_time_ms: responseTime,
                started_at,
            })

            return game
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'scores',
                status: 'failed',
                api_provider: 'rapidapi-nfl',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }

    /**
     * Fetch multiple games by their IDs
     */
    async fetchGamesByIds(gameIds: (number | string)[]): Promise<NFLGame[]> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            const games: NFLGame[] = []

            for (const gameId of gameIds) {
                const game = await this.fetchGameById(gameId)
                if (game) {
                    games.push(game)
                }
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            const responseTime = Date.now() - startTime

            await this.logSync({
                sync_type: 'scores',
                status: 'success',
                api_provider: 'rapidapi-nfl',
                records_updated: games.length,
                response_time_ms: responseTime,
                started_at,
            })

            return games
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'scores',
                status: 'partial',
                api_provider: 'rapidapi-nfl',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }

    /**
     * Fetch live scores for current games
     * Uses /nfl-livescores endpoint
     */
    async fetchLiveScores(): Promise<NFLGame[]> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            const response = await this.request<RapidApiScoreboardResponse>('/nfl-livescores')
            const responseTime = Date.now() - startTime

            const games = transformRapidApiScoreboard(response)

            await this.logSync({
                sync_type: 'scores',
                status: 'success',
                api_provider: 'rapidapi-nfl',
                records_updated: games.length,
                response_time_ms: responseTime,
                started_at,
            })

            return games
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'scores',
                status: 'failed',
                api_provider: 'rapidapi-nfl',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }

    /**
     * Fetch available seasons
     * Note: RapidAPI may not have a dedicated seasons endpoint,
     * returning static data for now
     */
    async fetchSeasons(leagueId: number = 1): Promise<NFLSeason[]> {
        // RapidAPI doesn't seem to have a seasons endpoint
        // Return current and recent seasons
        const currentYear = new Date().getFullYear()
        const seasons: NFLSeason[] = []

        for (let year = currentYear; year >= currentYear - 5; year--) {
            seasons.push({
                season: String(year),
                current: year === currentYear,
                start: `${year}-09-01`,
                end: `${year + 1}-02-15`,
            })
        }

        return seasons
    }

    /**
     * Fetch available leagues
     * Note: This API is NFL-specific, returning NFL league info
     */
    async fetchLeagues(): Promise<NFLLeague[]> {
        // RapidAPI NFL is NFL-specific, return static NFL league info
        return [{
            id: 1,
            name: 'NFL',
            type: 'League',
            logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
            country: {
                name: 'United States',
                code: 'US',
                flag: 'https://media.api-sports.io/flags/us.svg',
            },
        }]
    }

    /**
     * Fetch scoreboard for a specific day
     * Uses /nfl-scoreboard-day endpoint
     */
    async fetchScoreboardByDay(date: string): Promise<NFLGame[]> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            // Date format: YYYYMMDD
            const response = await this.request<RapidApiScoreboardResponse>('/nfl-scoreboard-day', {
                day: date,
            })
            const responseTime = Date.now() - startTime

            const games = transformRapidApiScoreboard(response)

            await this.logSync({
                sync_type: 'games',
                status: 'success',
                api_provider: 'rapidapi-nfl',
                records_updated: games.length,
                response_time_ms: responseTime,
                started_at,
            })

            return games
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'games',
                status: 'failed',
                api_provider: 'rapidapi-nfl',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }
}

// Export a singleton instance
export const rapidApiNFLClient = new RapidApiNFLClient()
