/**
 * TypeScript types for RapidAPI NFL API responses
 * Based on the nfl-api-data.p.rapidapi.com endpoints
 *
 * This API uses ESPN-style data structures
 */

// ============================================
// Team List Response (/nfl-team-list)
// ============================================

export interface RapidApiTeamLogo {
    href: string
    alt: string
    rel: string[]
    width: number
    height: number
}

export interface RapidApiTeam {
    id: string
    uid: string
    slug: string
    abbreviation: string
    displayName: string
    shortDisplayName: string
    name: string
    nickname: string
    location: string
    color: string
    alternateColor: string
    isActive: boolean
    isAllStar: boolean
    logos: RapidApiTeamLogo[]
}

export interface RapidApiTeamListResponse {
    teams: RapidApiTeam[]
}

// ============================================
// Scoreboard Response (/nfl-scoreboard-week-type)
// ============================================

export interface RapidApiSeasonType {
    id: string
    type: number
    name: string
    abbreviation: string
}

export interface RapidApiSeason {
    year: number
    startDate: string
    endDate: string
    displayName: string
    type: RapidApiSeasonType
}

export interface RapidApiLeague {
    id: string
    uid: string
    name: string
    abbreviation: string
    slug: string
    season: RapidApiSeason
    logos: RapidApiTeamLogo[]
    calendarType: string
    calendarIsWhitelist: boolean
    calendarStartDate: string
    calendarEndDate: string
    calendar: RapidApiCalendarEntry[]
}

export interface RapidApiCalendarEntry {
    label: string
    value: string
    startDate: string
    endDate: string
    entries?: RapidApiCalendarSubEntry[]
}

export interface RapidApiCalendarSubEntry {
    label: string
    alternateLabel: string
    detail: string
    value: string
    startDate: string
    endDate: string
}

export interface RapidApiVenue {
    id: string
    fullName: string
    address: {
        city: string
        state: string
        country?: string
    }
    indoor: boolean
}

export interface RapidApiCompetitorTeam {
    id: string
    uid: string
    location: string
    name: string
    abbreviation: string
    displayName: string
    shortDisplayName: string
    color: string
    alternateColor: string
    isActive: boolean
    venue?: {
        id: string
    }
    logo: string
    links?: Array<{
        rel: string[]
        href: string
        text: string
        isExternal: boolean
        isPremium: boolean
    }>
}

export interface RapidApiLinescore {
    value: number
    displayValue: string
    period: number
}

export interface RapidApiRecord {
    name: string
    abbreviation?: string
    type: string
    summary: string
}

export interface RapidApiCompetitor {
    id: string
    uid: string
    type: string
    order: number
    homeAway: 'home' | 'away'
    winner: boolean
    team: RapidApiCompetitorTeam
    score: string
    linescores?: RapidApiLinescore[]
    statistics: any[]
    records: RapidApiRecord[]
}

export interface RapidApiStatusType {
    id: string
    name: string
    state: 'pre' | 'in' | 'post'
    completed: boolean
    description: string
    detail: string
    shortDetail: string
}

export interface RapidApiStatus {
    clock: number
    displayClock: string
    period: number
    type: RapidApiStatusType
    isTBDFlex?: boolean
}

export interface RapidApiBroadcast {
    market: string
    names: string[]
}

export interface RapidApiCompetition {
    id: string
    uid: string
    date: string
    attendance: number
    type: {
        id: string
        abbreviation: string
    }
    timeValid: boolean
    neutralSite: boolean
    conferenceCompetition: boolean
    playByPlayAvailable: boolean
    recent: boolean
    venue: RapidApiVenue
    competitors: RapidApiCompetitor[]
    notes: any[]
    status: RapidApiStatus
    broadcasts: RapidApiBroadcast[]
    leaders?: any[]
    format?: {
        regulation: {
            periods: number
        }
    }
    startDate: string
    broadcast?: string
    geoBroadcasts?: any[]
    headlines?: Array<{
        type: string
        description: string
        shortLinkText?: string
    }>
    highlights?: any[]
}

export interface RapidApiEvent {
    id: string
    uid: string
    date: string
    name: string
    shortName: string
    season: {
        year: number
        type: number
        slug: string
    }
    week: {
        number: number
    }
    competitions: RapidApiCompetition[]
    links: Array<{
        language: string
        rel: string[]
        href: string
        text: string
        shortText: string
        isExternal: boolean
        isPremium: boolean
    }>
    status: RapidApiStatus
}

export interface RapidApiScoreboardResponse {
    leagues: RapidApiLeague[]
    season: {
        type: number
        year: number
    }
    week: {
        number: number
    }
    events: RapidApiEvent[]
}

// ============================================
// Boxscore Response (/nfl-boxscore)
// ============================================

export interface RapidApiBoxscoreResponse {
    // The boxscore endpoint likely returns similar event structure
    // but with more detailed statistics
    // We'll use the same event structure for now
    events?: RapidApiEvent[]
    // Single game response might be structured differently
    id?: string
    competitions?: RapidApiCompetition[]
    status?: RapidApiStatus
}

// ============================================
// Season Type Constants
// ============================================

export const RAPIDAPI_SEASON_TYPES = {
    PRESEASON: 1,
    REGULAR: 2,
    POSTSEASON: 3,
    OFFSEASON: 4,
} as const

// ============================================
// Status Name Constants
// ============================================

export const RAPIDAPI_STATUS_NAMES = {
    SCHEDULED: 'STATUS_SCHEDULED',
    IN_PROGRESS: 'STATUS_IN_PROGRESS',
    HALFTIME: 'STATUS_HALFTIME',
    END_PERIOD: 'STATUS_END_PERIOD',
    FINAL: 'STATUS_FINAL',
    FINAL_OVERTIME: 'STATUS_FINAL_OVERTIME',
    POSTPONED: 'STATUS_POSTPONED',
    CANCELED: 'STATUS_CANCELED',
    SUSPENDED: 'STATUS_SUSPENDED',
    DELAYED: 'STATUS_DELAYED',
} as const

// ============================================
// Playoff Week Mapping
// ============================================

export const RAPIDAPI_PLAYOFF_WEEKS: Record<number, string> = {
    1: 'Wild Card',
    2: 'Divisional Round',
    3: 'Conference Championship',
    4: 'Pro Bowl',
    5: 'Super Bowl',
}
