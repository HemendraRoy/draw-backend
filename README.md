# DrawStorm Backend

A real-time multiplayer drawing and guessing game inspired by Skribbl.io, built with Node.js, TypeScript, Express, and Socket.IO.

## Features

### Multiplayer Rooms

* Create private game rooms
* Join rooms using room code
* Automatic host assignment
* Host migration when the current host disconnects
* Player kick system
* Ban kicked players from rejoining
* Automatic room cleanup after inactivity

### Reconnection Support

Players can reconnect using:

* Same username
* Same password

Scores, game state, and room membership are preserved.

### Real-Time Gameplay

* Multiple rounds
* Automatic drawer rotation
* Word selection phase
* Drawing phase
* Result phase
* Live leaderboard updates
* Live chat system
* Real-time guessing

### Drawing Features

* Real-time canvas synchronization
* Brush size control
* Color selection
* Fill tool
* Clear canvas
* Undo support
* Drawing history synchronization
* Reconnect canvas restoration

### Scoring System

Guessers receive:

| Guess Order | Points |
| ----------- | ------ |
| 1st         | 100    |
| 2nd         | 80     |
| 3rd         | 60     |
| Others      | 40     |

Drawer receives:

50 × number of players who guessed correctly

### Hint System

Hints are automatically revealed during drawing:

* After 25 seconds → First letter
* After 50 seconds → First two letters

### Game Rules

* Maximum 3 rounds
* Every connected player draws once per round
* Game ends after round 3
* Highest score wins

---

# Tech Stack

* Node.js
* TypeScript
* Express
* Socket.IO

---

# Project Structure

```text
src
├── game
│   ├── ChatManager.ts
│   ├── GameManager.ts
│   ├── WordManager.ts
│   └── wordBank.ts
│
├── rooms
│   └── RoomManager.ts
│
├── sockets
│   ├── handlers
│   │   ├── canvasHandler.ts
│   │   ├── gameHandler.ts
│   │   └── roomHandler.ts
│   │
│   ├── utils
│   │   └── gameHelpers.ts
│   │
│   └── gameSocket.ts
│
├── types
│   └── game.ts
│
├── utils
│   └── normalizeWord.ts
│
└── server.ts
```

---

# Installation

```bash
git clone <repository-url>

cd drawstorm-backend

npm install
```

---

# Running Locally

Development:

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

Server runs on:

```text
http://localhost:10000
```

or

```text
PORT environment variable
```

---

# Socket Events

## Client → Server

### Room Management

```text
create-room
join-room
kick-player
```

### Game

```text
start-game
restart-game
choose-word
chat-message
```

### Canvas

```text
draw-event
start-stroke
stroke-point

change-color
change-brush-size

clear-canvas
fill-canvas

undo-stroke
undo-draw
```

---

## Server → Client

### Room Events

```text
room-created
room-joined

join-error
kick-error

players-update
holder-update
```

### Game Events

```text
game-state
game-started

drawer-update

choose-word

drawing-started

word-mask
hint-update

chat-message

leaderboard-update

all-players-guessed

turn-ended

drawer-skipped

game-ended
```

### Canvas Events

```text
drawing-history
canvas-sync

draw-event

start-stroke
stroke-point

clear-canvas
canvas-cleared

undo-draw

fill-canvas

color-changed
brush-size-changed
```

### Moderation

```text
kicked
```

---

# Game Flow

1. Create or join a room
2. Host starts the game
3. Drawer receives 3 word choices
4. Drawer selects a word within 10 seconds
5. Drawing phase begins (75 seconds)
6. Players guess using chat
7. Points awarded based on guess order
8. Result screen shown for 5 seconds
9. Next player becomes drawer
10. After 3 rounds, winner is declared

---

# Reconnection Flow

If a player disconnects:

* Their score remains stored
* Their room membership remains stored
* They can reconnect using the same username and password

If the room becomes empty:

* A 5-minute expiration timer starts
* Room is automatically deleted afterward

---

# Default Word Bank

The project currently includes a small sample word bank.

Additional words can be added in:

```text
src/game/wordBank.ts
```

---

# Future Improvements

* Difficulty levels
* Private/public rooms
* Spectator mode
* Custom word packs
* Database persistence
* User accounts
* Match history
* Mobile optimization
* Emoji reactions
* Drawing replay system
* Rate limiting and anti-spam

```
```
