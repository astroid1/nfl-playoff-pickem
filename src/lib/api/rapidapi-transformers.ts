/**
 * Transformation functions to convert RapidAPI NFL responses
 * to the existing NFLGame/NFLTeam types used by the application
 */

import type {
    NFLGame,
    NFLTeam,
    NFLScore,
    NFLGameStatus,
} from '@/lib/types/nfl-api-types'

import type {
    RapidApiTeam,
    RapidApiEvent,
    RapidApiCompetitor,
    RapidApiLinescore,
    RapidApiStatus,
    RapidApiScoreboardResponse,
} from '@/lib/types/rapidapi-nfl-types'

import { RAPIDAPI_SEASON_TYPES, RAPIDAPI_PLAYOFF_WEEKS } from '@/lib/types/rapidapi-nfl-types'

/**
 * Map RapidAPI status to our NFLGameStatus type
 */
function mapRapidApiStatus(status: RapidApiStatus): NFLGameStatus {
    const statusName = status.type.name

    // Map based on state first
    switch (status.type.state) {
        case 'pre':
            return 'NS' // Not Started
        case 'post':
            if (statusName.includes('OVERTIME')) {
                return 'AET' // After Extra Time
            }
            return 'FT' // Final
        case 'in':
            // In progress - check period
            if (statusName === 'STATUS_HALFTIME') {
                return 'HT'
            }
            switch (status.period) {
                case 1:
                    return 'Q1'
                case 2:
                    return 'Q2'
                case 3:
                    return 'Q3'
                case 4:
                    return 'Q4'
                default:
                    if (status.period > 4) {
                        return 'OT'
                    }
                    return 'LIVE'
            }
    }

    // Handle specific status names
    if (statusName === 'STATUS_POSTPONED') {
        return 'P'
    }
    if (statusName === 'STATUS_CANCELED') {
        return 'CANC'
    }
    if (statusName === 'STATUS_SUSPENDED') {
        return 'SUSP'
    }

    // Default to not started
    return 'NS'
}

/**
 * Convert RapidAPI linescores to our NFLScore format
 */
function convertLinescores(linescores: RapidApiLinescore[] | undefined, totalScore: string): NFLScore {
    const score: NFLScore = {
        quarter_1: null,
        quarter_2: null,
        quarter_3: null,
        quarter_4: null,
        overtime: null,
        total: totalScore ? parseInt(totalScore, 10) : null,
    }

    if (!linescores) {
        return score
    }

    for (const ls of linescores) {
        switch (ls.period) {
            case 1:
                score.quarter_1 = ls.value
                break
            case 2:
                score.quarter_2 = ls.value
                break
            case 3:
                score.quarter_3 = ls.value
                break
            case 4:
                score.quarter_4 = ls.value
                break
            default:
                // Overtime periods (5+)
                if (ls.period > 4) {
                    score.overtime = (score.overtime || 0) + ls.value
                }
        }
    }

    return score
}

/**
 * Convert RapidAPI competitor to our NFLTeam format
 */
function convertCompetitorToTeam(competitor: RapidApiCompetitor): NFLTeam {
    const team = competitor.team

    return {
        id: parseInt(team.id, 10),
        name: team.displayName,
        code: team.abbreviation,
        city: team.location,
        logo: team.logo,
        // RapidAPI doesn't include conference/division in scoreboard data
        // We'll need to infer or look up separately
        conference: undefined,
        division: undefined,
    }
}

/**
 * Determine playoff round from week number and season type
 */
function getPlayoffRound(weekNumber: number, seasonType: number): string {
    if (seasonType === RAPIDAPI_SEASON_TYPES.POSTSEASON) {
        return RAPIDAPI_PLAYOFF_WEEKS[weekNumber] || `Playoff Week ${weekNumber}`
    }

    if (seasonType === RAPIDAPI_SEASON_TYPES.REGULAR) {
        return `Week ${weekNumber}`
    }

    if (seasonType === RAPIDAPI_SEASON_TYPES.PRESEASON) {
        return `Preseason Week ${weekNumber}`
    }

    return `Week ${weekNumber}`
}

/**
 * Transform a RapidAPI team to our NFLTeam format
 */
export function transformRapidApiTeam(team: RapidApiTeam): NFLTeam {
    // Find the default logo
    const defaultLogo = team.logos.find(
        logo => logo.rel.includes('default')
    ) || team.logos[0]

    return {
        id: parseInt(team.id, 10),
        name: team.displayName,
        code: team.abbreviation,
        city: team.location,
        logo: defaultLogo?.href || '',
        // Conference and division not included in team list
        // Would need separate lookup or team info endpoint
        conference: undefined,
        division: undefined,
    }
}

/**
 * Transform a RapidAPI event to our NFLGame format
 */
export function transformRapidApiEvent(event: RapidApiEvent): NFLGame {
    const competition = event.competitions[0]

    if (!competition) {
        throw new Error(`Event ${event.id} has no competitions`)
    }

    // Find home and away competitors
    const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home')
    const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away')

    if (!homeCompetitor || !awayCompetitor) {
        throw new Error(`Event ${event.id} missing home or away competitor`)
    }

    const gameDate = new Date(event.date)
    const status = mapRapidApiStatus(event.status)

    return {
        game: {
            id: parseInt(event.id, 10),
            stage: getPlayoffRound(event.week.number, event.season.type),
            week: `Week ${event.week.number}`,
            date: {
                timezone: 'UTC',
                date: gameDate.toISOString().split('T')[0],
                time: gameDate.toISOString().split('T')[1].substring(0, 5),
                timestamp: Math.floor(gameDate.getTime() / 1000),
            },
            venue: {
                name: competition.venue?.fullName || 'Unknown Venue',
                city: competition.venue?.address?.city || 'Unknown City',
            },
            status: {
                short: status,
                long: event.status.type.description,
                timer: event.status.displayClock || null,
                quarter: event.status.period || null,
            },
        },
        league: {
            id: 1, // NFL
            name: 'NFL',
            season: String(event.season.year),
            logo: 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
            country: {
                name: 'United States',
                code: 'US',
                flag: 'https://media.api-sports.io/flags/us.svg',
            },
        },
        teams: {
            home: convertCompetitorToTeam(homeCompetitor),
            away: convertCompetitorToTeam(awayCompetitor),
        },
        scores: {
            home: convertLinescores(homeCompetitor.linescores, homeCompetitor.score),
            away: convertLinescores(awayCompetitor.linescores, awayCompetitor.score),
        },
    }
}

/**
 * Transform RapidAPI scoreboard response to array of NFLGame
 */
export function transformRapidApiScoreboard(response: RapidApiScoreboardResponse): NFLGame[] {
    if (!response.events) {
        return []
    }

    return response.events.map(event => transformRapidApiEvent(event))
}

/**
 * Transform a single boxscore response to NFLGame
 * The boxscore endpoint may return data in a slightly different format
 */
export function transformRapidApiBoxscore(data: any): NFLGame | null {
    // Handle if the response contains an events array
    if (data.events && data.events.length > 0) {
        return transformRapidApiEvent(data.events[0])
    }

    // Handle if the response is a single event-like structure
    if (data.id && data.competitions) {
        // Construct an event-like object
        const event: RapidApiEvent = {
            id: data.id,
            uid: data.uid || '',
            date: data.date || data.competitions[0]?.date || '',
            name: data.name || '',
            shortName: data.shortName || '',
            season: data.season || { year: new Date().getFullYear(), type: 2, slug: 'regular-season' },
            week: data.week || { number: 1 },
            competitions: data.competitions,
            links: data.links || [],
            status: data.status || data.competitions[0]?.status,
        }
        return transformRapidApiEvent(event)
    }

    return null
}

/**
 * Extract playoff games from a scoreboard response
 * Filters to only include postseason games
 */
export function filterPlayoffGames(games: NFLGame[]): NFLGame[] {
    const playoffRounds = ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl']

    return games.filter(game => {
        const stage = game.game.stage.toLowerCase()
        return playoffRounds.some(round => stage.includes(round.toLowerCase()))
    })
}

/**
 * Get conference from team location/name (fallback when API doesn't provide it)
 * This is a lookup table for all 32 NFL teams
 */
const NFL_TEAM_CONFERENCES: Record<string, 'AFC' | 'NFC'> = {
    // AFC East
    'BUF': 'AFC', 'MIA': 'AFC', 'NE': 'AFC', 'NYJ': 'AFC',
    // AFC North
    'BAL': 'AFC', 'CIN': 'AFC', 'CLE': 'AFC', 'PIT': 'AFC',
    // AFC South
    'HOU': 'AFC', 'IND': 'AFC', 'JAX': 'AFC', 'TEN': 'AFC',
    // AFC West
    'DEN': 'AFC', 'KC': 'AFC', 'LV': 'AFC', 'LAC': 'AFC',
    // NFC East
    'DAL': 'NFC', 'NYG': 'NFC', 'PHI': 'NFC', 'WAS': 'NFC', 'WSH': 'NFC',
    // NFC North
    'CHI': 'NFC', 'DET': 'NFC', 'GB': 'NFC', 'MIN': 'NFC',
    // NFC South
    'ATL': 'NFC', 'CAR': 'NFC', 'NO': 'NFC', 'TB': 'NFC',
    // NFC West
    'ARI': 'NFC', 'LA': 'NFC', 'LAR': 'NFC', 'SF': 'NFC', 'SEA': 'NFC',
}

export function getTeamConference(abbreviation: string): 'AFC' | 'NFC' | null {
    return NFL_TEAM_CONFERENCES[abbreviation.toUpperCase()] || null
}

/**
 * NFL team divisions lookup
 */
const NFL_TEAM_DIVISIONS: Record<string, string> = {
    // AFC East
    'BUF': 'AFC East', 'MIA': 'AFC East', 'NE': 'AFC East', 'NYJ': 'AFC East',
    // AFC North
    'BAL': 'AFC North', 'CIN': 'AFC North', 'CLE': 'AFC North', 'PIT': 'AFC North',
    // AFC South
    'HOU': 'AFC South', 'IND': 'AFC South', 'JAX': 'AFC South', 'TEN': 'AFC South',
    // AFC West
    'DEN': 'AFC West', 'KC': 'AFC West', 'LV': 'AFC West', 'LAC': 'AFC West',
    // NFC East
    'DAL': 'NFC East', 'NYG': 'NFC East', 'PHI': 'NFC East', 'WAS': 'NFC East', 'WSH': 'NFC East',
    // NFC North
    'CHI': 'NFC North', 'DET': 'NFC North', 'GB': 'NFC North', 'MIN': 'NFC North',
    // NFC South
    'ATL': 'NFC South', 'CAR': 'NFC South', 'NO': 'NFC South', 'TB': 'NFC South',
    // NFC West
    'ARI': 'NFC West', 'LA': 'NFC West', 'LAR': 'NFC West', 'SF': 'NFC West', 'SEA': 'NFC West',
}

export function getTeamDivision(abbreviation: string): string | null {
    return NFL_TEAM_DIVISIONS[abbreviation.toUpperCase()] || null
}
