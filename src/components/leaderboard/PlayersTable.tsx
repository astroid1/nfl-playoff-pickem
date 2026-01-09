'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useAllPlayers } from '@/lib/hooks/useAllPlayers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

export function PlayersTable() {
  const { user } = useAuth()
  const { data: players, isLoading } = useAllPlayers()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading players...</p>
      </div>
    )
  }

  if (!players || players.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No players have joined yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead className="text-right">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player, index) => {
            const isCurrentUser = user?.id === player.id

            return (
              <TableRow
                key={player.id}
                className={isCurrentUser ? 'bg-primary/5 font-medium' : ''}
              >
                <TableCell className="font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{player.username}</span>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {player.display_name || '—'}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(player.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
