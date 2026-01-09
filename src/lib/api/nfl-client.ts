/**
 * NFL API Client for API-Sports
 * Handles all interactions with the API-Sports NFL endpoint
 */

import { createClient } from '@/lib/supabase/server'
import type {
    NFLApiResponse,
    NFLGame,
    NFLTeam,
    NFLLeague,
    NFLSeason,
} from '@/lib/types/nfl-api-types'

const NFL_API_BASE_URL = process.env.NFL_API_BASE_URL || 'https://v1.american-football.api-sports.io'
const NFL_API_KEY = process.env.NFL_API_KEY

if (!NFL_API_KEY) {
    console.warn('NFL_API_KEY is not set. API calls will fail.')
}

// NFL League ID for API-Sports (1 = NFL)
const NFL_LEAGUE_ID = 1

interface ApiSyncLogEntry {
    sync_type: 'games' | 'scores' | 'teams'
    status: 'success' | 'failed' | 'partial'
    api_provider: string
    records_updated: number
    error_message?: string
    response_time_ms: number
    started_at: string
}

export class NFLApiClient {
    private baseUrl: string
    private apiKey: string
    private supabase: ReturnType<typeof createClient> | null = null

    constructor(apiKey?: string, baseUrl?: string) {
        this.apiKey = apiKey || NFL_API_KEY || ''
        this.baseUrl = baseUrl || NFL_API_BASE_URL
    }

    /**
     * Initialize Supabase client for logging (server-side only)
     */
    private async initSupabase() {
        if (!this.supabase) {
            try {
                this.supabase = await createClient()
            } catch (error) {
                // If we're outside Next.js context (e.g., running seed scripts),
                // Supabase client won't work. That's okay, we'll skip logging.
                console.warn('Supabase client not available (running outside Next.js context)')
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
            const supabase = await this.initSupabase()
            if (!supabase) {
                // Skip logging if Supabase isn't available
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
     * Make a request to the NFL API
     */
    private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<NFLApiResponse<T>> {
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
                    'x-apisports-key': this.apiKey,
                },
            })

            const responseTime = Date.now() - startTime

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`)
            }

            const data: NFLApiResponse<T> = await response.json()

            // Check for API errors
            if (data.errors && Object.keys(data.errors).length > 0) {
                const errorMsg = JSON.stringify(data.errors)
                throw new Error(`API returned errors: ${errorMsg}`)
            }

            // Log rate limit headers
            const rateLimitRemaining = response.headers.get('x-ratelimit-requests-remaining')
            const rateLimitLimit = response.headers.get('x-ratelimit-requests-limit')

            if (rateLimitRemaining && rateLimitLimit) {
                console.log(`API Rate Limit: ${rateLimitRemaining}/${rateLimitLimit} remaining`)
            }

            return data
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            console.error('NFL API request failed:', errorMessage)

            throw error
        }
    }

    /**
     * Fetch all teams for a specific league
     */
    async fetchTeams(leagueId: number = NFL_LEAGUE_ID, season?: number): Promise<NFLTeam[]> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            const params: Record<string, any> = { league: leagueId }
            if (season) {
                params.season = season
            }

            const response = await this.request<NFLTeam>('/teams', params)
            const responseTime = Date.now() - startTime

            await this.logSync({
                sync_type: 'teams',
                status: 'success',
                api_provider: 'api-sports',
                records_updated: response.results,
                response_time_ms: responseTime,
                started_at,
            })

            return response.response
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'teams',
                status: 'failed',
                api_provider: 'api-sports',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }

    /**
     * Fetch games for a specific season and league
     */
    async fetchGames(season: number, leagueId: number = NFL_LEAGUE_ID): Promise<NFLGame[]> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            const response = await this.request<NFLGame>('/games', {
                league: leagueId,
                season,
            })
            const responseTime = Date.now() - startTime

            await this.logSync({
                sync_type: 'games',
                status: 'success',
                api_provider: 'api-sports',
                records_updated: response.results,
                response_time_ms: responseTime,
                started_at,
            })

            return response.response
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'games',
                status: 'failed',
                api_provider: 'api-sports',
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
     */
    async fetchGameById(gameId: number): Promise<NFLGame | null> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            const response = await this.request<NFLGame>('/games', { id: gameId })
            const responseTime = Date.now() - startTime

            await this.logSync({
                sync_type: 'scores',
                status: 'success',
                api_provider: 'api-sports',
                records_updated: response.results,
                response_time_ms: responseTime,
                started_at,
            })

            return response.response[0] || null
        } catch (error) {
            const responseTime = Date.now() - startTime
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            await this.logSync({
                sync_type: 'scores',
                status: 'failed',
                api_provider: 'api-sports',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }

    /**
     * Fetch multiple games by their IDs (for batch score updates)
     */
    async fetchGamesByIds(gameIds: number[]): Promise<NFLGame[]> {
        const startTime = Date.now()
        const started_at = new Date().toISOString()

        try {
            // API-Sports doesn't support batch requests, so we need to make individual calls
            // To avoid rate limiting, we'll make sequential requests with a small delay
            const games: NFLGame[] = []

            for (const gameId of gameIds) {
                const game = await this.fetchGameById(gameId)
                if (game) {
                    games.push(game)
                }
                // Small delay to avoid rate limiting (adjust as needed)
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            const responseTime = Date.now() - startTime

            await this.logSync({
                sync_type: 'scores',
                status: 'success',
                api_provider: 'api-sports',
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
                api_provider: 'api-sports',
                records_updated: 0,
                error_message: errorMessage,
                response_time_ms: responseTime,
                started_at,
            })

            throw error
        }
    }

    /**
     * Fetch available seasons for a league
     */
    async fetchSeasons(leagueId: number = NFL_LEAGUE_ID): Promise<NFLSeason[]> {
        const response = await this.request<NFLSeason>('/seasons', { league: leagueId })
        return response.response
    }

    /**
     * Fetch available leagues
     */
    async fetchLeagues(): Promise<NFLLeague[]> {
        const response = await this.request<NFLLeague>('/leagues')
        return response.response
    }
}

// Export a singleton instance
export const nflApiClient = new NFLApiClient()
