//Redux Setup
const createStore = Redux.createStore
const combineReducers = Redux.combineReducers
const middleware = Redux.applyMiddleware
const Provider = ReactRedux.Provider
const connect = ReactRedux.connect

//Dungeon Utilities
let Dungeon = {
  dMap: [],
  mapSize: 64,
  mapBoundary: (playerRow, playerCol, mobileControls, toggleAction, playerMoved = true, resizing = false) => {
    let tileSize = 20 //Update if CSS value changes
    let offset = window.innerHeight * .2 //This  must be updated if header height in CSS is changed
    let gameMap = document.getElementById('map')
    let width = window.innerWidth
    let height

    if ( toggleAction === 'closing' ) {
      //Closing mobile controls panel
      height = gameMap.clientHeight + offset
    } else if ( toggleAction === 'opening' ) {
      //Opening mobile controls panel
      height = gameMap.clientHeight - offset
    } else if ( gameMap ) {
      //Standard player move OR Resizing window
      height = gameMap.clientHeight
    } else {
      offset += 20 // Must account for CSS borders on initial game load since borders are not accounted for yet
      height = window.innerHeight - offset
    }

    let maxRows = Math.floor(height / tileSize)
    let maxCols = Math.floor(width / tileSize)

    let startRow = playerRow - Math.floor( maxRows / 2 )
    if ( startRow < 0 ) { startRow = 0 }
    if ( startRow + maxRows > Dungeon.mapSize ) { startRow = Dungeon.mapSize - maxRows }
    let stopRow = startRow + maxRows

    let startCol = playerCol - Math.floor( maxCols / 2 )
    if ( startCol < 0 ) { startCol = 0 }
    if ( startCol + maxCols > Dungeon.mapSize ) { startCol = Dungeon.mapSize - maxCols }
    let stopCol = startCol + maxCols

    return {
      startRow: startRow,
      stopRow: stopRow,
      startCol: startCol,
      stopCol: stopCol
    }
  },
  rooms: [],
  countEnemies: 10,
  enemies: [],
  countExit: 1,
  countBoss: 0,
  boss: {},
  countHealth: 8,
  countWeapons: 1,
  items: {
    health: 50,
    weapons: {
      1: {
        name: 'Dagger',
        attack: 2
      },
      2: {
        name: 'Sword',
        attack: 3
      },
      3: {
        name: 'Lazer',
        attack: 4
      },
      4: {
        name: 'Fart of Fury',
        attack: 99
      }
    }
  },
  countPlayer: 1,
  player: {
    position: [],
    xp: 0,
    health: 250,
    weapon: {
      name: 'Fists',
      attack: 1
    },
    lvl: 1,
    attack: ( lvl, weaponAttack ) => {
      return Math.floor(Math.random() * ( 10 - 5 ) + 5) * lvl * weaponAttack
    }
  },
  calcPlayerLevel: ( currentXP ) => {
      let level
      if ( currentXP > 0 && currentXP < 100 ) {
        level = 1
      } else if ( currentXP >= 100 && currentXP < 250 ) {
        level = 2
      } else if ( currentXP >= 250 && currentXP < 600 ) {
        level = 3
      } else if ( currentXP >= 600 && currentXP < 1000 ) {
        level = 4
      } else if ( currentXP >= 1000 && currentXP < 1500 ) {
        level = 5
      } else if ( currentXP >= 1500 && currentXP < 1800 ) {
        level = 6
      } else if ( currentXP >= 1800 ) {
        level = 7
      }
      return level
    },
  generate: function(level, levelAdvance) {
    // Initialize map array with default tile values equal to 0
    for (var x=0; x<this.mapSize; x++) {
      this.dMap[x] = []
      for (var y=0; y<this.mapSize; y++) {
        this.dMap[x][y] = 0
      }
    }

    // Set room boudry values and generate room positions and sizes
    let roomCount = this.getRandom(10, 20)
    let minRoomSize = 5
    let maxRoomSize = 15

    this.rooms = []
    for (var i=0; i<roomCount; i++) {
      let newRoom = {}

      // Room Coordinates
      newRoom.x = this.getRandom(1, this.mapSize - maxRoomSize - 1)
      newRoom.y = this.getRandom(1, this.mapSize - maxRoomSize - 1)
      // Room Size
      newRoom.w = this.getRandom(minRoomSize, maxRoomSize)
      newRoom.h = this.getRandom(minRoomSize, maxRoomSize)

      // Check if newRoom overlaps existing room(s), if so rerun current loop iteration until they don't collide
      if (this.collides(newRoom)) {
        i--
        continue
      }

      // Adjust room dimensions by 1 to create space for walls
      newRoom.w--
      newRoom.h--

      // Add room to the list
      this.rooms.push(newRoom)
    }

    // Reduce space between rooms to make dungeon more compact
    //this.condenseRooms();

    // For each room, find the closest room. Then get two random cartesian coord. sets in each room. Then connect these two points.
    for (var i=0; i<roomCount; i++) {
      let roomA = this.rooms[i]
      let roomB = this.getClosestRoom(roomA)
      let pointA = {
        x: this.getRandom(roomA.x, roomA.x + roomA.w),
        y: this.getRandom(roomA.y, roomA.y + roomA.h)
      }
      let pointB = {
        x: this.getRandom(roomB.x, roomB.x + roomB.w),
        y: this.getRandom(roomB.y, roomB.y + roomB.h)
      }

      // Map out floor tiles for connections between rooms. Floor tiles are represented in the dMap array with the number 1
      while ((pointB.x != pointA.x) || (pointB.y != pointA.y)) {
        if (pointB.x != pointA.x) {
            if (pointB.x > pointA.x) {
              pointB.x--
            } else {
              pointB.x++
            }
        } else if (pointB.y != pointA.y) {
            if (pointB.y > pointA.y) {
              pointB.y--
            } else {
              pointB.y++
            }
        }
          this.dMap[pointB.x][pointB.y] = 1;
        }
    }

    // Fill each room with floor tiles (1).
    for(var i=0; i<roomCount; i++) {
      let room = this.rooms[i]
      for(var x = room.x; x < room.x + room.w; x++) {
        for(var y = room.y; y < room.y + room.h; y++) {
          this.dMap[x][y] = 1
        }
      }
    }

    // Expand each room by one unit in all directions. Line each room with 2.
    for (var x=0; x<this.mapSize; x++) {
        for (var y=0; y<this.mapSize; y++) {
            if (this.dMap[x][y] == 1) {
                for (var a = (x - 1); a <= (x + 1); a++) {
                    for (var b = (y - 1); b <= (y + 1); b++) {
                        if (this.dMap[a][b] == 0) {
                          this.dMap[a][b] = 2;
                        }
                    }
                }
            }
        }
    }

    // Change 2 into 1 (floors).
    for (var x=0; x<this.dMap.length; x++) {
      this.dMap[x] = this.dMap[x].map((v) => {
        if (v === 2) {
          v = 1
        }
        return v
      })
    }

    // Quality check the generated map
    this.qualityCheck(() => {
      this.checkFlood(level, levelAdvance)
    })

  },
  condenseRooms: function() {
    for (var i=0; i<10; i++) {
            for (var j=0; j<this.rooms.length; j++) {
                let room = this.rooms[j];
                while (true) {
                    let oldPosition = {
                        x: room.x,
                        y: room.y
                    };
                    if (room.x > 1) room.x--
                    if (room.y > 1) room.y--
                    if ((room.x == 1) && (room.y == 1)) break;
                    if (this.collides(room, j)) {
                        room.x = oldPosition.x
                        room.y = oldPosition.y
                        break
                    }
                }
            }
        }
  },
  collides: function(room, ignore) {
    for (var i=0; i<this.rooms.length; i++) {
      if (i == ignore) continue
      let check = this.rooms[i]
      if (!((room.x + room.w < check.x) || (room.x > check.x + check.w) || (room.y + room.h < check.y) || (room.y > check.y + check.h))) return true
    }
    return false
  },
  getClosestRoom: function(room) {
    let middle = {
      x: room.x + (room.w / 2),
      y: room.y + (room.y / 2)
    }
    let closest = null
    let closestDistance = 1000
    for (var i=0; i<this.rooms.length; i++) {
      let check = this.rooms[i]
      if (check == room) { continue }
      let checkMiddle = {
        x: check.x + (check.w / 2),
        y: check.y + (check.y / 2)
      }
      // TODO: Need to refine this more...
      let distance = Math.min(Math.abs(middle.x - checkMiddle.x) - (room.w / 2) - (check.w / 2), Math.abs(middle.y - checkMiddle.y) - (room.h / 2) - (check.h / 2))
      if (distance < closestDistance) {
        closestDistance = distance
        closest = check
      }
    }
    return closest
  },
  getRandom: function(low, high) {
    return Math.floor((Math.random() * (high - low)) + low)
  },
  qualityCheck: function(callback) {
    // Start flood at first instance of a 1 value. Flooding with 9.
    for (let x=0; x<this.mapSize; x++) {
      for (let y=0; y<this.mapSize; y++) {
        if ( this.dMap[x][y] === 1) {
          //Start Flood
          let startNode = {
            value: this.dMap[x][y],
            xy: [x, y]
          }
          this.flood(startNode)
          callback()
          return
        }
      }
    }
  },
  flood: function(node) {

      if ( node.value != 1 ) {
        return
      }

      let x = node.xy[0]
      let y = node.xy[1]

      this.dMap[x][y] = 9

      let neighbors = [[x, y+1], [x+1, y], [x, y-1], [x-1, y]]

      for (let i=0; i<4; i++) {
        let nX = neighbors[i][0]
        let nY = neighbors[i][1]

        try{
          if ( typeof this.dMap[nX][nY] == 'undefined' ) {
            continue
          } else {
            let nextNode = {
              value: this.dMap[nX][nY],
              xy: neighbors[i]
            }
            this.flood(nextNode)
          }
        }catch(e){
          if(e) { continue }
        }
      }

      return
  },
  checkFlood: function(level, levelAdvance) {
  // Check map for any remaining 1 (floor) values
    let goodDungeon = true
    for (let x=0; x<this.mapSize; x++) {
      for (let y=0; y<this.mapSize; y++) {
        if ( this.dMap[x][y] === 1) {
          //Set Failed Flag
          goodDungeon = false
        }
      }
    }

    if ( goodDungeon ) {
      // Change 9's back to 1's
      this.dMap = this.dMap.map( (v, i) => {
        return this.dMap[i].map( (v, i) => {
          if ( v === 9 ) {
            v = 1
            return v
          }
          return v
        })
      })

      // Populate dungeon with things and stuff
      this.populate(level, levelAdvance)
    } else {
      this.generate(level, levelAdvance)
    }
  },
  populate: function(level, levelAdvance) {
    let population = []
    let row = 0
    let col = 0

    //Collect array of available floor tiles for the incoming population
    for (var r=0; r<this.dMap.length; r++) {
      this.dMap[r].map((v,c) => {
        if ( v === 1 ) {
          population.push([v,c,r])
        }
      })
    }

    /****
    Generate population locations, mapping them to available floor tiles
    0 = Wall
    1 = Floor
    2 = Boss
    3 = Exit
    4 = Player
    5 = Enemy
    6 = Health
    7 = Weapon
    ****/
    if ( level > 1 ) { this.enemies = [] } //Clear enemy array on level advances
    if ( level < 4 ) {
      this.countBoss = 0
      this.countExit = 1
    }
    if ( level === 4 ) {
      this.countBoss = 1
      this.countExit = 0
    }
    let popCounts = [this.countEnemies, this.countHealth, this.countExit, this.countBoss, this.countWeapons, this.countPlayer]

    for (let l=0; l<popCounts.length; l++) {
      for (let p=0; p<popCounts[l]; p++) {
        row = Math.floor(Math.random() * (population.length))
        if ( population[row][0] === 1 ) {
          let rowCoord = population[row][2]
          let colCoord = population[row][1]
          switch(l) {
            // Enemy = 5
            case 0:
              population[row][0] = 5
              this.enemies.push({
                position: [rowCoord, colCoord],
                health: 50 * level,
                xp: 20 * level,
                lvl: level,
                attack: 12  * level
              })
            break

            // Health = 6
            case 1:
              population[row][0] = 6
            break

            // Exit = 3
            case 2:
              population[row][0] = 3
            break

            // Boss = 2
            case 3:
              population[row][0] = 2
              this.boss = {
                health: 9999,
                lvl: 99,
                attack: 150
              }
            break

            // Weapon = 7
            case 4:
              population[row][0] = 7
            break

            // Player = 4
            case 5:
              population[row][0] = 4
              this.player.position = []
              this.player.position.push(rowCoord, colCoord)
            break
          }

        } else {
          l--
        }
      }
    }

    //Update Dungeon Map with population locations array
    for (var x=0; x<population.length; x++) {
      let uRow, uCol, uValue = 0;
      population[x].map((v,i) => {
        switch(i) {
          case 0:
            uValue = v
          break

          case 1:
            uCol = v
          break

          case 2:
            uRow = v
          break
        }
      })

      this.dMap[uRow][uCol] = uValue
    }

    if ( typeof levelAdvance == 'function' ) {
      levelAdvance()
    }
  }
}

// Initialize Game
Dungeon.generate(1)

//INITIAL STATE
let initState = {
  level: 1,
  dMap: Dungeon.dMap,
  player: Dungeon.player,
  enemies: Dungeon.enemies,
  boss: Dungeon.boss,
  mapBoundary: Dungeon.mapBoundary( Dungeon.player.position[0], Dungeon.player.position[1], '', false, false, false)
}


/*
*REDUCERS
*/

const mobilePanelReducer = (state = {isShowing: false, lights: false}, action) => {
  switch(action.type) {
    case 'TOGGLE_MOBILE':
      return Object.assign({}, state, {
          isShowing: !state.isShowing
      })
    break

    case 'TOGGLE_LIGHTS':
      return Object.assign({}, state, {
        lights: !state.lights
      })
    break

    default:
      return state
  }
}

const dungeonMapReducer = ( state = initState , action ) => {
  switch(action.type) {

      case 'MOVE_PLAYER':
        const mpState = Object.assign({}, state, {
          player: Object.assign({}, state.player, {
            position: action.next
          }),
          playerAtkMsg: '',
          enemyAtkMsg: '',
          updateMsg: ''
        })
        mpState.dMap[action.current[0]][action.current[1]] = 1
        mpState.dMap[action.next[0]][action.next[1]] = 4
        return mpState
      break

      case 'PICKUP_HEALTH':
        return Object.assign({}, state, {
          player: Object.assign({}, state.player, {
            health: action.health + state.player.health
          }),
          updateMsg: '+' + action.health + ' Health'
        })
      break

      case 'PICKUP_WEAPON':
        return Object.assign({}, state, {
          player: Object.assign({}, state.player, {
            weapon: action.weapon
          }),
          updateMsg: 'Found ' + action.weapon.name + '!'
        })
      break

      case 'ATTACK_ENEMY':
        const aeState = Object.assign({}, state, {
          player: Object.assign({}, state.player, {
            health: action.playerHealth
          }),
          playerAtkMsg: action.playerAtkMsg,
          enemyAtkMsg: action.enemyAtkMsg
        })
        state.enemies[action.enemyTargetIndex].health = action.enemyHealth
        return aeState
      break

      case 'ATTACK_BOSS':
        const abState = Object.assign({}, state, {
          player: Object.assign({}, state.player, {
            health: action.playerHealth
          }),
          boss: Object.assign({}, state.boss, {
            health: action.enemyHealth
          }),
          playerAtkMsg: action.playerAtkMsg,
          enemyAtkMsg: action.enemyAtkMsg
        })
        return abState
      break

      case 'PLAYER_WINS':
        const pwState = Object.assign({}, state, {
          player: Object.assign({}, state.player, {
            health: action.playerHealth
          }),
          boss: Object.assign({}, state.boss, {
            health: action.enemyHealth
          }),
          playerAtkMsg: action.playerAtkMsg
        })
        return pwState
      break

      case 'PLAYER_DIED':
        const aepdState = Object.assign({}, state, {
          player: Object.assign({}, state.player, {
            health: 0
          }),
          playerAtkMsg: '',
          enemyAtkMsg: action.enemyAtkMsg
        })
        return aepdState
      break

      case 'ATTACK_ENEMY_WIN':
        let currentLvl = Dungeon.calcPlayerLevel(state.player.xp)
        let newXP = state.player.xp + state.enemies[action.enemyTargetIndex].xp
        let checkLvl = Dungeon.calcPlayerLevel(newXP)

        const aewState = Object.assign({}, state, {
          player: Object.assign({}, state.player, {
            health: action.playerHealth,
            xp: newXP,
            lvl: checkLvl
          }),
          playerAtkMsg: action.playerAtkMsg,
          enemyAtkMsg: action.enemyAtkMsg
        })
        state.enemies[action.enemyTargetIndex].health = 0
        return aewState
      break

      case 'ADVANCE_LEVEL':
        const alState = Object.assign({}, {
          level: state.level + 1,
          dMap: action.dMap,
          player: Object.assign({}, state.player, {
            position: action.position
          }),
          enemies: action.enemies,
          boss: action.boss,
          mapBoundary: Dungeon.mapBoundary( action.position[0], action.position[1], state.isShowing, '', false, false)
        })
        return alState
      break

      case 'RESET_GAME':
        const goState = Object.assign({}, {
            level: 1,
            dMap: Dungeon.dMap,
            player: Dungeon.player,
            enemies: Dungeon.enemies,
            boss: Dungeon.boss,
            mapBoundary: Dungeon.mapBoundary( Dungeon.player.position[0], Dungeon.player.position[1], state.isShowing, '', false, false)
        })
        return goState
      break

      case 'RESIZE_MAP':
        const rmState = Object.assign({}, state, {
          mapBoundary: Object.assign({}, {
            startRow: action.startRow,
            stopRow: action.stopRow,
            startCol: action.startCol,
            stopCol: action.stopCol
          })
        })
        return rmState
      break

      default:
        return state
  }
}

//combining reducers and the Store
const reducers = combineReducers({
  mobilePanelState: mobilePanelReducer,
  dungeonMapState: dungeonMapReducer
})
const store = createStore(reducers);

/**
**  ENTRY CONTAINER
**
**/
class GameCanvas extends React.Component {
  constructor(props) {
    super(props)
    window.addEventListener('keydown', this.handleKeyPress.bind(this), false)
  }
  componentDidMount() {
    window.addEventListener("resize", this.handleResize.bind(this), false)
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.handleResize.bind(this), false)
  }
  handleResize(e) {
    let newBoundary = Dungeon.mapBoundary(this.props.player.position[0], this.props.player.position[1], this.props.isShowing, '', false, true)
    this.props.updateMapSize(newBoundary)
  }
  handleKeyPress(e) {
    //disabling keys if the player is dead
    if ( this.props.player.health <= 0 || this.props.boss.health <= 0 ) {
      return
    }

    let direction
    if (e.target.id) {direction = e.target.id}
    if (e.keyCode) {direction = e.keyCode}

    // Players position vars
    let nextTileVal = this.props.dMap
    let playerRow = this.props.player.position[0]
    let playerCol = this.props.player.position[1]
    let currentPos = [playerRow, playerCol]
    let nextPos

    switch (direction) {
      case 38: // Up
      case 'up':
        nextPos = [playerRow - 1, playerCol]
      break

      case 39: // Right
      case 'right':
        nextPos = [playerRow, playerCol + 1]
      break

      case 40: // Down
      case 'down':
        nextPos = [playerRow + 1, playerCol]
      break

      case 37: // Left
      case 'left':
        nextPos = [playerRow, playerCol - 1]
      break
    }

    if ( nextTileVal[nextPos[0]][nextPos[1]] != 0 ) {
      this.handleMove( currentPos, nextPos, nextTileVal[nextPos[0]][nextPos[1]] )
    }
  }
  handleMove(currentPos, nextPos, nextTileVal) {
    switch( nextTileVal ) {
      // Floor
      case 1:
        if ( this.props.player.health > 0 ) {
          this.props.movePlayer(currentPos, nextPos, this.props.isShowing)
        }
        break

      // Boss
      // Enemy
      case 2:
      case 5:
        //Index the correct enemy to attack
        let enemyTarget, enemyTargetIndex
        if ( nextTileVal == 5 ) {
          for ( let i=0; i<this.props.enemies.length; i++) {
            if ( this.props.enemies[i].position[0] == nextPos[0] && this.props.enemies[i].position[1] == nextPos[1] ) {
              enemyTarget = this.props.enemies[i]
              enemyTargetIndex = i
            }
          }
        } else if ( nextTileVal == 2 ) {
          enemyTarget = this.props.boss
        }
        //Run attack calculations
        let playerAttack = this.props.player.attack(this.props.player.lvl, this.props.player.weapon.attack)
        let enemyAttack = enemyTarget.attack
        let playerHealth = this.props.player.health - enemyAttack
        let enemyHealth = enemyTarget.health - playerAttack
        let playerAtkMsg = 'Damage dealt: ' + playerAttack.toString()
        let enemyAtkMsg = 'Damage taken: ' + enemyAttack.toString()
        let enemyDefeated = false
        let playerDefeated = false
        let bossDefeated = false

        // Update attack messages based on outcome of attack round
        if ( enemyHealth <= 0 ) {
          enemyHealth = 0
          if ( nextTileVal == 2 ) {
            playerAtkMsg += ' - Boss Defeated! YOU WIN!! Resetting...'
            bossDefeated = true
          } else {
            playerAtkMsg += ' - Enemy defeated!!'
          }
          enemyAtkMsg = ''
          enemyDefeated = true
          playerHealth = this.props.player.health

          //Enemy died, time to move player
          this.props.movePlayer(currentPos, nextPos, this.props.isShowing)

        } else if ( playerHealth  <= 0 ) {
          playerHealth = 0
          enemyAtkMsg += ' - YOU DIED! Resetting...'
          playerDefeated = true
        }

        //Dispatch appropriate attack update action
        this.props.attackUpdate(enemyTargetIndex, enemyHealth, playerHealth, playerAtkMsg, enemyAtkMsg, enemyDefeated, playerDefeated, bossDefeated)
      break

      // Exit
      case 3:
        const level = parseInt(this.props.level)
        Dungeon.generate( (level + 1), () => {
          this.props.levelAdvance( level + 1 )
        })
      break

      // Health
      case 6:
        this.props.movePlayer(currentPos, nextPos, this.props.isShowing)
        this.props.pickUpItem('health', this.props.level)
      break

      // Weapon
      case 7:
        this.props.movePlayer(currentPos, nextPos, this.props.isShowing)
        this.props.pickUpItem('weapon', this.props.level)
      break

      default:
        break
    }
  }
  render() {
     return (
       <div id="dungeon-crawler" className="dungeon-crawler">
        <StatSheet />
        <DungeonTrace />
        <MobileControls move= {this.handleKeyPress.bind(this)} />
       </div>
     )
  }
}

//mapStateToProps
const mapStateToProps_GameCanvas = (store) => {
  return {
    level: store.dungeonMapState.level,
    dMap: store.dungeonMapState.dMap,
    player: store.dungeonMapState.player,
    enemies: store.dungeonMapState.enemies,
    boss: store.dungeonMapState.boss,
    playerAtkMsg: store.dungeonMapState.playerAtkMsg,
    enemyAtkMsg: store.dungeonMapState.enemyAtkMsg,
    mapBoundary: store.dungeonMapState.mapBoundary,
    isShowing: store.mobilePanelState.isShowing
  }
}
//mapDispatchToProps
const mapDispatchToProps_GameCanvas = (dispatch, ownProps) => {
  return {

    movePlayer: (currentPos, nextPos, mobilePanel) => {
      let newBoundary = Dungeon.mapBoundary(nextPos[0], nextPos[1], mobilePanel, '', true, false)
      dispatch({
        type: "MOVE_PLAYER",
        current: currentPos,
        next: nextPos
      })
      dispatch({
        type: "RESIZE_MAP",
        startRow: newBoundary.startRow,
        stopRow: newBoundary.stopRow,
        startCol: newBoundary.startCol,
        stopCol: newBoundary.stopCol
      })
    },

    pickUpItem: (item, level) => {
      if ( item == 'health' ) {
        dispatch({
          type: "PICKUP_HEALTH",
          health: Dungeon.items.health * level
        })
      }
      if ( item == 'weapon' ) {
        let theWeapon= Dungeon.items.weapons[level]
        dispatch({
          type: "PICKUP_WEAPON",
          weapon: theWeapon
        })
      }
    },

    attackUpdate: (enemyTargetIndex, enemyHealth, playerHealth, playerAtkMsg, enemyAtkMsg, enemyDefeated, playerDefeated, bossDefeated) => {
      let theType = "ATTACK_ENEMY"
      if ( playerDefeated ) {
        theType = "PLAYER_DIED"
      }
      if ( enemyDefeated ) {
        theType = "ATTACK_ENEMY_WIN"
      }
      if ( enemyTargetIndex == undefined ) {
        theType = "ATTACK_BOSS"
      }
      if ( bossDefeated ) {
        theType = "PLAYER_WINS"
      }
      dispatch({
        type: theType,
        enemyTargetIndex: enemyTargetIndex,
        playerHealth: parseInt(playerHealth),
        enemyHealth: enemyHealth,
        playerAtkMsg: playerAtkMsg,
        enemyAtkMsg: enemyAtkMsg
      })

      if ( playerDefeated || bossDefeated ) {
        const reset = setTimeout( () => {
          Dungeon.generate(1, () => {
            dispatch({
              type: "RESET_GAME"
            })
          })
        }, 3000)
      }
    },

    levelAdvance: (level) => {
      dispatch({
        type: "ADVANCE_LEVEL",
        dMap: Dungeon.dMap,
        position: Dungeon.player.position,
        enemies: Dungeon.enemies,
        boss: Dungeon.boss
      })
    },

    updateMapSize: (newBoundary) => {
      dispatch({
        type: "RESIZE_MAP",
        startRow: newBoundary.startRow,
        stopRow: newBoundary.stopRow,
        startCol: newBoundary.startCol,
        stopCol: newBoundary.stopCol
      })
    }

  }
}
GameCanvas = connect(mapStateToProps_GameCanvas,mapDispatchToProps_GameCanvas)(GameCanvas)


/*
*STATESHEET CONTAINER
**/

class StatSheet extends React.Component {
  handleToggleMobileControls(e) {
    const map = document.getElementById('map')
    const mobile = document.getElementById('mobile-controls')
    const toggleBtn = document.getElementById('mobile-toggle')
    let toggleAction = ''

    switch(this.props.isShowing) {
       case false:
         map.className += ' condensed'
         mobile.className += ' expanded'
         toggleBtn.className += ' on'
         toggleAction = 'opening'
       break

       case true:
          map.className = 'map'
          mobile.className = 'mobile-controls'
          toggleBtn.className = 'mobile-toggle'
          toggleAction = 'closing'
        break
    }
    const newBoundary = Dungeon.mapBoundary( this.props.player.position[0], this.props.player.position[1], this.props.isShowing, toggleAction, false )
    this.props.toggle(newBoundary)
  }
  handleToggleLights(e) {
    const toggleBtn = document.getElementById('lights-toggle')

    switch(this.props.lights) {

      case false:
        toggleBtn.className += ' on'
      break

      case true:
        toggleBtn.className = 'lights-toggle'
      break
    }
    this.props.lightSwitch()
  }
  displayMsg() {
    const updateMsg = this.props.updateMsg
    const plyrAtkMsg = this.props.plyrAtk
    const enmyAtkMsg = this.props.enmyAtk

    if ( plyrAtkMsg ) {
      return plyrAtkMsg + ' ' + enmyAtkMsg
    } else if ( enmyAtkMsg ) {
      return enmyAtkMsg
    } else if ( updateMsg ) {
      return updateMsg
    } else {
      return
    }
  }
  render() {
    return(
      <div id="stats" className="stats">
        <h1>Rogue Crawler</h1>
        <div className="mobile-toggle" id="mobile-toggle" onClick={this.handleToggleMobileControls.bind(this)}>Mobile Controls</div>
        <div className="lights-toggle" id="lights-toggle" onClick={this.handleToggleLights.bind(this)}>Lights</div>
        <div className="player-stats">
          <ul className="stat">
            <li><span>Floor:</span> {this.props.level}</li>
            <li><span>Health:</span> {this.props.player.health}</li>
            <li><span>Weapons:</span> {this.props.player.weapon.name}</li>
            <li><span>XP:</span> {this.props.player.xp}</li>
            <li><span>level:</span> {this.props.player.lvl}</li>
          </ul>
        </div>
        <div className="enemy-stats">
          <ul className="stat">
          </ul>
        </div>
        <div id="messages" className="messages"><p>{this.displayMsg()}</p></div>
      </div>
    )
  }
}
const mapStateToProps_StatSheet = (store) => {
  return {
    level: store.dungeonMapState.level,
    isShowing: store.mobilePanelState.isShowing,
    lights: store.mobilePanelState.lights,
    player: store.dungeonMapState.player,
    plyrAtk: store.dungeonMapState.playerAtkMsg,
    enmyAtk: store.dungeonMapState.enemyAtkMsg,
    updateMsg: store.dungeonMapState.updateMsg
  }
}
const mapDispatchToProps_StatSheet = (dispatch, ownProps) => {
  return {

    toggle: (newBoundary) => {
      dispatch({
        type: "TOGGLE_MOBILE"
      })
      dispatch({
        type: "RESIZE_MAP",
        startRow: newBoundary.startRow,
        stopRow: newBoundary.stopRow,
        startCol: newBoundary.startCol,
        stopCol: newBoundary.stopCol
      })
    },

    lightSwitch: () => {
      dispatch({
        type: "TOGGLE_LIGHTS"
      })
    }
  }
}
StatSheet = connect(mapStateToProps_StatSheet,mapDispatchToProps_StatSheet)(StatSheet)

/*
* DUNGEON CONTAINER
**/
class DungeonTrace extends React.Component {
  constructor(props) {
    super(props)
  }
  drawMap() {

    const lights = this.props.lights
    const startRow = this.props.mapBoundary.startRow
    const stopRow = this.props.mapBoundary.stopRow
    const startCol = this.props.mapBoundary.startCol
    const stopCol = this.props.mapBoundary.stopCol

    return (
      this.props.dMap.map((v,i) => {
        if ( i < startRow || i > stopRow ) {
          return
        }
        return (
          <div className="row" data-row={i}>
            {this.drawTiles(i, startCol, stopCol, lights)}
          </div>
        )
      })
    )
  }

  drawTiles(row, startCol, stopCol, lights) {
    const playerRow = this.props.player.position[0]
    const playerCol = this.props.player.position[1]

    return(
      this.props.dMap[row].map((v,col) => {

        if ( col < startCol || col > stopCol ) {
          return
        }

        let tileClass = 'tile '

        switch(v) {
          case 0:
            tileClass += 'wall'
            break

          case 1:
            tileClass += 'floor'
          break

          case 2:
            tileClass += 'boss'
          break

          case 3:
            tileClass += 'exit'
          break

          case 4:
            tileClass += 'player'
          break

          case 5:
            tileClass += 'enemy'
          break

          case 6:
            tileClass += 'health'
          break

          case 7:
            tileClass += 'weapon'
          break
        }

        //Define visible area with lights turned off
        switch(row) {
          case playerRow - 5:
          case playerRow + 5:
            if ( col >= playerCol - 3 && col <= playerCol + 3 ) {
            } else if ( !lights ) {
              tileClass = 'tile dark'
            }
          break

          case playerRow - 4:
          case playerRow + 4:
            if ( col >= playerCol - 4 && col <= playerCol + 4 ) {
            } else if ( !lights ) {
              tileClass = 'tile dark'
            }
          break

          case playerRow - 3:
          case playerRow + 3:
            if ( col >= playerCol - 5 && col <= playerCol + 5 ) {
            } else if ( !lights ) {
              tileClass = 'tile dark'
            }
          break

          case playerRow -2:
          case playerRow -1:
          case playerRow:
          case playerRow + 1:
          case playerRow + 2:
            if ( col >= playerCol - 5 && col <= playerCol + 5 ) {
            } else if ( !lights ) {
              tileClass = 'tile dark'
            }
          break

          default:
            if ( !lights ) {
              tileClass = 'tile dark'
            }
          break
        }

        return(
          <div className={tileClass} data-tile={col}></div>
        )
      })
    )
  }
  render() {
     return (
       <div id="map" className="map dark">
        {this.drawMap()}
       </div>
     )
  }
}
const mapStateToProps_DungeonTrace = (store) => {
  return {
    mapBoundary: store.dungeonMapState.mapBoundary,
    player: store.dungeonMapState.player,
    dMap: store.dungeonMapState.dMap,
    lights: store.mobilePanelState.lights
  }
}
DungeonTrace = connect(mapStateToProps_DungeonTrace)(DungeonTrace)


class MobileControls extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div id="mobile-controls" className="mobile-controls">
        <div id="keys" className="keys">
          <div id="left" onClick={this.props.move}>&#8592;</div>
          <div id="down" onClick={this.props.move}>	&#8595;</div>
          <div id="right" onClick={this.props.move}>&#8594;</div>
          <div id="up" onClick={this.props.move}>&#8593;</div>
        </div>
      </div>
    )
  }
}




/**
** RENDER
**/
ReactDOM.render(
  <Provider store={store}>
    <GameCanvas />
  </Provider>,
  document.body
);
