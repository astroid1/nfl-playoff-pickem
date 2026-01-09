/**
 * Run Complete Playoff Simulation
 *
 * This script runs a complete playoff simulation from start to finish.
 * Run with: npm run simulate-all
 */

import { runSimulation, simulateGames, WILD_CARD_GAMES, DIVISIONAL_GAMES, CHAMPIONSHIP_GAMES, SUPER_BOWL } from './simulate-playoffs'

async function main() {
  console.log('🏈 Running Complete Playoff Simulation\n')

  // Setup teams, games, and picks
  await runSimulation()

  // Wait a bit before simulating games
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Simulate all games
  console.log('\n🎮 Now simulating all games...\n')

  await simulateGames('Wild Card', WILD_CARD_GAMES)
  console.log('\n⏳ Waiting 2 seconds...\n')
  await new Promise(resolve => setTimeout(resolve, 2000))

  await simulateGames('Divisional', DIVISIONAL_GAMES)
  console.log('\n⏳ Waiting 2 seconds...\n')
  await new Promise(resolve => setTimeout(resolve, 2000))

  await simulateGames('Conference', CHAMPIONSHIP_GAMES)
  console.log('\n⏳ Waiting 2 seconds...\n')
  await new Promise(resolve => setTimeout(resolve, 2000))

  await simulateGames('Super Bowl', SUPER_BOWL)

  console.log('\n\n🏆 SIMULATION COMPLETE! 🏆')
  console.log('\nCheck your app to see:')
  console.log('- Updated leaderboard with scores')
  console.log('- User stats on dashboard')
  console.log('- Pool picks showing what everyone selected')
  console.log('- Correct/incorrect picks marked')
  console.log('\nGo to http://localhost:3000/dashboard to see the results!')
}

main()
