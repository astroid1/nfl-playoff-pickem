/**
 * TypeScript types for API-Sports NFL API responses
 * API Documentation: https://api-sports.io/documentation/nfl/v1
 */

// Generic API response wrapper
export interface NFLApiResponse<T> {
    get: string
    parameters: Record<string, any>
    errors: Record<string, string> | []
    results: number
    paging: {
        current: number
        total: number
    }
    response: T[]
}

// Team data from API
export interface NFLTeam {
    id: number
    name: string
    code: string
    city: string
    logo: string
    conference?: {
        name: string // "American Football Conference" or "National Football Conference"
    }
    division?: {
        name: string // e.g., "AFC East", "NFC North"
    }
}

// Game status enum
export type NFLGameStatus =
    | 'NS'    // Not Started (scheduled)
    | 'Q1'    // 1st Quarter
    | 'Q2'    // 2nd Quarter
    | 'Q3'    // 3rd Quarter
    | 'Q4'    // 4th Quarter
    | 'HT'    // Halftime
    | 'OT'    // Overtime
    | 'BT'    // Break Time
    | 'P'     // Postponed
    | 'SUSP'  // Suspended
    | 'INT'   // Interrupted
    | 'FT'    // Finished
    | 'AET'   // After Extra Time
    | 'PEN'   // Penalties
    | 'CANC'  // Cancelled
    | 'ABD'   // Abandoned
    | 'AWD'   // Technical Loss
    | 'WO'    // WalkOver
    | 'LIVE'  // In Progress

// Score data for a team (quarter breakdown + total)
export interface NFLScore {
    quarter_1: number | null
    quarter_2: number | null
    quarter_3: number | null
    quarter_4: number | null
    overtime: number | null
    total: number | null
}

// Game data from API
export interface NFLGame {
    game: {
        id: number
        stage: string // e.g., "Wild Card", "Divisional", "Conference Championship", "Super Bowl"
        week: string
        date: {
            timezone: string
            date: string // ISO 8601 format
            time: string // HH:MM format
            timestamp: number
        }
        venue: {
            name: string
            city: string
        }
        status: {
            short: NFLGameStatus
            long: string
            timer: string | null
        }
    }
    league: {
        id: number
        name: string
        season: string
        logo: string
        country: {
            name: string
            code: string
            flag: string
        }
    }
    teams: {
        home: NFLTeam
        away: NFLTeam
    }
    scores: {
        home: NFLScore
        away: NFLScore
    }
}

// League data
export interface NFLLeague {
    id: number
    name: string
    type: string
    logo: string
    country: {
        name: string
        code: string
        flag: string
    }
}

// Season data
export interface NFLSeason {
    season: string
    current: boolean
    start: string
    end: string
}

// Mapped game status for our database
export type GameStatus = 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'cancelled'

// Helper function to map API status to our database status
export function mapGameStatus(apiStatus: NFLGameStatus): GameStatus {
    switch (apiStatus) {
        case 'NS':
            return 'scheduled'
        case 'Q1':
        case 'Q2':
        case 'Q3':
        case 'Q4':
        case 'HT':
        case 'OT':
        case 'BT':
        case 'LIVE':
            return 'in_progress'
        case 'FT':
        case 'AET':
        case 'PEN':
            return 'final'
        case 'P':
        case 'SUSP':
        case 'INT':
            return 'postponed'
        case 'CANC':
        case 'ABD':
        case 'AWD':
        case 'WO':
            return 'cancelled'
        default:
            return 'scheduled'
    }
}

// Helper function to determine playoff round from API week field
export function mapPlayoffRound(week: string): string {
    const weekLower = week.toLowerCase()

    if (weekLower.includes('wild')) {
        return 'Wild Card'
    }
    if (weekLower.includes('divisional')) {
        return 'Divisional'
    }
    if (weekLower.includes('conference') || weekLower.includes('championship')) {
        return 'Championship'
    }
    if (weekLower.includes('super bowl')) {
        return 'Super Bowl'
    }
    if (weekLower.includes('pro bowl')) {
        return 'Pro Bowl'
    }

    // Default fallback
    return week
}

// Helper to extract conference from team data
export function extractConference(team: NFLTeam): 'AFC' | 'NFC' | null {
    const conferenceName = team.conference?.name?.toLowerCase() || ''

    if (conferenceName.includes('american')) {
        return 'AFC'
    }
    if (conferenceName.includes('national')) {
        return 'NFC'
    }

    return null
}

// Helper to extract division from team data
export function extractDivision(team: NFLTeam): string | null {
    return team.division?.name || null
}
