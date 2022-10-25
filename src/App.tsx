import React, { useEffect, useState } from 'react';
import Gun from "gun"
import { Subject } from "rxjs"
import "./App.css"

type CardStatus = "DECK" | "PLAYER1" | "PLAYER2" | "PICK"
type Player = "PLAYER1" | "PLAYER2"

const START_NBR_CARDS = 12
const FIELD_WIDTH = 8
const FIELD_HEIGHT = 8
const POINT_MIN_TO_KNOCK = 50
const FULL_WIN_BONUS = 50;
const SANCTION_KNOCK_SUPERIOR = 50;
const START_SCORE = 200

const HERO_EARLY_KNOCK_ADD = 15;

export const makeId = () => {
  return Math.floor((1 + Math.random()) * 0x100000000000)
    .toString(32)
}

const engine = () => {
  type Card = ReturnType<typeof getNewBoard>[number][number];

  const op = {
    PLAYER1: "PLAYER2",
    PLAYER2: "PLAYER1",
  } as {
    "PLAYER1": Player
    "PLAYER2": Player
  }

  const heros = {
    mirror: {
      id: "mirror",
      name: "Mirror of darkness",
      image: "/heros/mirror.jpg",
      text: "The points on the battlefield are on reverse order.<br/>Only for him",
    },
    watch: {
      id: "watch",
      name: "Early fang",
      image: "/heros/watch.jpg",
      text: `Can knock with ${POINT_MIN_TO_KNOCK + HERO_EARLY_KNOCK_ADD} points instead of ${POINT_MIN_TO_KNOCK}`,
    },
    tank: {
      id: "tank",
      name: "Strong David",
      image: "/heros/tank.jpg",
      text: "When he win the round, win 30% more points",
    },
    cloporte: {
      id: "cloporte",
      name: "Weak joe",
      image: "/heros/cloporte.jpg",
      text: "When he loses the round, loses 30% less points",
    },

    // chien2: {
    //   id: "chien",
    //   name: "Chien rouge",
    //   image: "/heros/chien.jpg",
    //   text: "Can throw away garbage at the store<br/> if the store is full then die and stuff you know",
    // },
    // chien3: {
    //   id: "chien",
    //   name: "Chien rouge",
    //   image: "/heros/chien.jpg",
    //   text: "Can throw away garbage at the store, if the store is full then die and stuff you know",
    // },
    // chien4: {
    //   id: "chien",
    //   name: "Chien rouge",
    //   image: "/heros/chien.jpg",
    //   text: "Can throw away garbage at the store, if the store is full then die and stuff you know",
    // },
    // chien5: {
    //   id: "chien",
    //   name: "Chien rouge",
    //   image: "/heros/chien.jpg",
    //   text: "Can throw away garbage at the store, if the store is full then die and stuff you know",
    // },
    // chien6: {
    //   id: "chien",
    //   name: "Chien rouge",
    //   image: "/heros/chien.jpg",
    //   text: "Can throw away garbage at the store, if the store is full then die and stuff you know",
    // },
  }

  const state = {
    game: {
      id: "",
      PLAYER1: { seated: false, ready: false, score: START_SCORE },
      PLAYER2: { seated: false, ready: false, score: START_SCORE },
      ready: false,
    },
    board: getNewBoard(),
    playerTurn: "PLAYER1" as "PLAYER1" | "PLAYER2",
    started: false,
    pick: null as null | { x: number, y: number },
    nextAction: "TAKE" as "TAKE" | "GIVE",
    choosingHero: false,
    PLAYER1: { pointsRemaining: [0], total: 0, hero: null as null | keyof typeof heros },
    PLAYER2: { pointsRemaining: [0], total: 0, hero: null as null | keyof typeof heros },
    gameResult: null as null | {
      winner: Player
      score: number
    }
  }

  const stateEvent = new Subject<typeof state>()
  // stateEvent.next(state);

  function getNewBoard() {
    return Array.from({ length: FIELD_HEIGHT })
      .map((e, y) => Array.from({ length: FIELD_WIDTH })
        .map((ee, x) => ({
          x,
          y,
          value: x + 1 + y + 1,
          status: "DECK" as CardStatus,
          PLAYER1: { justTook: false, opTook: false, opDiscarded: false, status: "DECK" as CardStatus, inStreak: false, hori: false, verti: false },
          PLAYER2: { justTook: false, opTook: false, opDiscarded: false, status: "DECK" as CardStatus, inStreak: false, hori: false, verti: false },
        })))
  }

  function pickRandomFromDeck() {
    while (true) {
      const x = Math.floor(Math.random() * FIELD_WIDTH);
      const y = Math.floor(Math.random() * FIELD_HEIGHT);
      if (state.board[y][x].status === "DECK") {
        return state.board[y][x];
      }
    }
  }

  const distribute = (player: Player) => {
    for (let i = 0; i < START_NBR_CARDS; i++) {
      const card = pickRandomFromDeck()
      card.status = player;
      card[player].status = player;
    }
  }

  function endAction() {
    state.nextAction = state.nextAction === "GIVE" ? "TAKE" : "GIVE";
    if (state.nextAction === "TAKE") {
      for (let line of state.board) {
        for (let card of line) {
          card.PLAYER1.justTook = false;
          card.PLAYER2.justTook = false;
        }
      }
      state.playerTurn = state.playerTurn === "PLAYER1" ? "PLAYER2" : "PLAYER1"
    }
    evaluate("PLAYER1")
    evaluate("PLAYER2")
    stateEvent.next({ ...state });
  }

  const give = (card: Card) => {
    if (!state.started) return;
    if (!state.started) return;
    if (state.nextAction !== "GIVE") return;

    card.status = "PICK"
    card[op[state.playerTurn]].opDiscarded = true;
    state.pick = { x: card.x, y: card.y };
    card[state.playerTurn].status = "PICK";
    state.board[state.pick.y][state.pick.x][op[state.playerTurn]].opTook = false;
    endAction();
  }

  const takePick = () => {
    if (!state.pick) return;
    if (!state.started) return;
    if (state.nextAction !== "TAKE") return;
    state.board[state.pick.y][state.pick.x].status = state.playerTurn
    state.board[state.pick.y][state.pick.x][state.playerTurn].status = state.playerTurn;
    state.board[state.pick.y][state.pick.x][state.playerTurn].justTook = true;
    state.board[state.pick.y][state.pick.x][op[state.playerTurn]].opTook = true;
    state.pick = null;
    endAction();
  }

  const takeRandom = () => {
    if (!state.started) return;
    if (state.nextAction !== "TAKE") return;
    const card = pickRandomFromDeck();
    state.board[state.pick!.y][state.pick!.x][op[state.playerTurn]].opDiscarded = true;
    card.status = state.playerTurn;
    card[state.playerTurn].status = state.playerTurn;
    card[state.playerTurn].justTook = true;
    state.pick = null;
    endAction();
  }

  const isCardClickable = (card: Card, player: Player) => {
    return (
      state.playerTurn === player
      && state.nextAction === "GIVE"
      && card.status === player
    )
  }

  const evaluate = (player: Player) => {
    const horiStreak = []
    const vertiStreak = []
    const board = getBoardOfPlayer(player)
    for (let y = 0; y < FIELD_HEIGHT; y++) {
      let streak = [];
      for (let x = 0; x < FIELD_WIDTH; x++) {
        const card = board[y][x]
        if (card.status === player) {
          streak.push(card);
        }
        if (card.status !== player || x + 1 === FIELD_WIDTH) {
          if (streak.length >= 3) {
            horiStreak.push(streak);
          }
          streak = [];
        }
      }
    }

    for (let x = 0; x < FIELD_WIDTH; x++) {
      let streak = [];
      for (let y = 0; y < FIELD_HEIGHT; y++) {
        const card = board[y][x]
        if (card.status === player) {
          streak.push(card);
        }
        if (card.status !== player || y + 1 === FIELD_HEIGHT) {
          if (streak.length >= 3) {
            vertiStreak.push(streak);
          }
          streak = [];
        }
      }
    }

    for (let line of board) {
      for (let card of line) {
        card[player].inStreak = false;
        card[player].hori = false;
        card[player].verti = false;
      }
    }

    for (let hori of horiStreak) {
      for (let card of hori) {
        card[player].inStreak = true;
        card[player].hori = true;
      }
    }
    for (let verti of vertiStreak) {
      for (let card of verti) {
        card[player].inStreak = true;
        card[player].verti = true;
      }
    }

    const pointsRemaining = [];
    for (let line of board) {
      for (let card of line) {
        if (card.status === player && !card[player].inStreak) {
          pointsRemaining.push(card.value);
        }
      }
    }
    pointsRemaining.sort((a, b) => a - b);
    let amount = 0;
    for (let point of pointsRemaining) {
      amount += point;
    }
    state[player].pointsRemaining = pointsRemaining
    state[player].total = amount
  }

  const getPointsForKnock = (player: Player) => {
    // return state[player].total - state[player].pointsRemaining[state[player].pointsRemaining.length - 1]
    return state[player].total
  }

  const chooseHero = (player: Player, hero: keyof typeof heros) => {
    game.state[player].hero = hero;
    evaluate("PLAYER1")
    evaluate("PLAYER2")
    if (game.state[op[player]].hero) {
      game.state.choosingHero = false;
    }
    stateEvent.next(state)
  }

  const startGame = () => {
    state.playerTurn = state.playerTurn === "PLAYER1" ? "PLAYER2" : "PLAYER1";
    state.board = getNewBoard();
    (["PLAYER1", "PLAYER2"] as Player[]).forEach(player => {
      distribute(player);
    })
    state.started = true;
    state.choosingHero = true;
    state.pick = pickRandomFromDeck();
    state.PLAYER1 = { pointsRemaining: [0], total: 0, hero: null };
    state.PLAYER2 = { pointsRemaining: [0], total: 0, hero: null };
    evaluate("PLAYER1")
    evaluate("PLAYER2")
    state.nextAction = "TAKE";
    state.gameResult = null;
    stateEvent.next(state)
  }

  const canIKnock = (player: Player) => {
    const points = getPointsForKnock(player);
    return (points <= (state[player].hero === "watch" ? (POINT_MIN_TO_KNOCK + HERO_EARLY_KNOCK_ADD) : POINT_MIN_TO_KNOCK))
  }

  const knock = (player: Player) => {
    const points = getPointsForKnock(player);
    const pointsOp = getPointsForKnock(op[player]);
    if (!canIKnock(player)) return;

    let score = 0;
    let winner = player;
    if (points === 0) {
      score += FULL_WIN_BONUS
    }
    const diff = pointsOp - points;
    if (diff <= 0 && pointsOp !== 0) {
      winner = op[player];
      score += SANCTION_KNOCK_SUPERIOR;
    }
    score += Math.abs(diff);
    const baseScore = score;
    if (state[winner].hero === "tank") {
      score += Math.ceil(baseScore * 0.3);
    }
    if (state[op[winner]].hero === "cloporte") {
      score += -Math.floor(baseScore * 0.3);
    }
    state.gameResult = {
      score,
      winner,
    }
    state.game[winner].score += score;
    state.game[op[winner]].score += -score;
    state.game.PLAYER1.ready = false;
    state.game.PLAYER2.ready = false;
    state.started = false;
    stateEvent.next({ ...state });
  }

  const setReady = (player: Player) => {
    state.game[player].ready = true;
    if (state.game.PLAYER1.ready && state.game.PLAYER2.ready) {
      game.state.game.ready = true;
      game.startGame()
    }
    stateEvent.next({ ...state });
  }

  const isCardPick = (card: Card) => {
    if (!state.pick) return false;
    return card.x === state.pick.x && card.y === state.pick.y
  }

  const getBoardOfPlayer = (player: Player) => {
    if (state[player].hero !== "mirror") return state.board;
    const final: typeof state.board = [];
    for (let line of state.board) {
      const finalLine: typeof line = [];
      for (let point of line) {
        finalLine.push({
          ...point,
          value: 18 - point.value
        })
      }
      final.push(finalLine);
    }
    return final;
  }

  return {
    stateEvent,
    state,
    chooseHero,
    takePick,
    startGame,
    isCardClickable,
    give,
    takeRandom,
    isCardPick,
    getPointsForKnock,
    knock,
    setReady,
    canIKnock,
    getBoardOfPlayer,
    op,
    heros,

  }
}

const game = engine();

// root.style.setProperty('--mainframe-margin-left', `${marginLeft}px`);

function Hero(p: { hero: typeof game.heros[(keyof (typeof game.heros))] }) {
  return <><div className='hero-header'>
    {p.hero.name}
  </div>
    <div className='hero-image-grid'>
      <div className='hero-image' style={{
        backgroundImage: `url(${p.hero.image})`
      }}>
      </div>
    </div>
    <div className='hero-text' dangerouslySetInnerHTML={{ __html: p.hero.text }}>
    </div>
  </>
}

function Board(p: { state: ReturnType<typeof engine>["state"], player: Player }) {
  const [infos, setInfos] = useState("")

  useEffect(() => {
    if (game.state.playerTurn === p.player) {
      setTimeout(() => {
        // game.startGame()
      }, 0)
    }

  }, [])

  useEffect(() => {
    const getInfos = () => {
      if (p.state.gameResult) {
        const winner = p.state.gameResult.winner === p.player ? "You" : "Scumbag"
        return `${winner} won ${p.state.gameResult.score} points`
      }
      if (p.state.choosingHero) {
        if (p.state[p.player].hero && !p.state[game.op[p.player]].hero) {
          return "Waiting for scumbag to choose hero"
        }
        return "Choose a Hero";
      }
      if (p.state.playerTurn !== p.player) {
        return "It is the scumbag turn to play"
      }
      if (p.state.nextAction === "TAKE") {
        return "Take the green card or a random card"
      }
      if (p.state.nextAction === "GIVE") {
        return "Throw a card or knock"
      }
      return ""
    }
    setInfos(getInfos())

  }, [p.state])

  return <>
    <div className="board-flex">
      <div className='selected-hero-cont'>
        {!p.state.choosingHero && p.state[p.player].hero && <div className='selected-hero-cont-cont'>
          <Hero hero={game.heros[p.state[p.player].hero!]}></Hero>
        </div>}
      </div>

      <div className='board'>
        <div className='score'>
          <div className='score-item' style={{
            width: `${(p.state.game[p.player].score / (START_SCORE * 2)) * 100}%`,
            background: "#16ff29",
          }}>
            You : {p.state.game[p.player].score}
          </div>
          <div >
            Scumbag : {p.state.game[game.op[p.player]].score}
          </div>
        </div>

        {game.getBoardOfPlayer(p.player).map((line, y) => <div className='board-line' key={y}>
          {line.map((card, x) => <div key={x} className="card-flex-col">
            <div className='card-flex-row'>
              <div className={`
            card-paper
            ${card[p.player].status === p.player ? "card-player-1" : ""}
            ${card[p.player].status === p.player && card[p.player].justTook ? "card-just-took" : ""}
            ${card[p.player].opTook ? "card-op-took" : ""}
            ${game.isCardPick(card) ? "card-top-pick" : ""}
            ${game.isCardClickable(card, p.player) ? "card-clickable" : ""}
            ${p.state.gameResult && card.status === game.op[p.player] ? "card-op-took" : ""}
        `}
                style={{
                  cursor: game.isCardClickable(card, p.player) ? "pointer" : "inherit"
                }}
                onClick={() => {
                  if (!game.isCardClickable(card, p.player)) return;
                  game.give(card);
                }}
              >
                {card[p.player].opDiscarded && <div className='op-discarded-flex-col'>
                  <div className='op-discarded-flex-row'>
                    <div className='op-discarded'></div>
                  </div>
                </div>}
                <div className='value'>{card.value}</div>

                {(card[p.player].verti || (p.state.gameResult && card[game.op[p.player]].verti)) && <div className='streak-verti'></div>}
                {(card[p.player].hori || (p.state.gameResult && card[game.op[p.player]].hori)) && <div className='streak-hori'></div>}
              </div>
            </div>
          </div>
          )}

        </div>)}
        <div className='infos'>
          {p.state[p.player].total} points
        </div>
        <div className='infos' dangerouslySetInnerHTML={{ __html: infos }}>
        </div>
      </div>

      <div className='selected-hero-cont'>
        {!p.state.choosingHero && p.state[game.op[p.player]].hero && <div className='selected-hero-cont-cont'>
          <Hero hero={game.heros[p.state[game.op[p.player]].hero!]}></Hero>
        </div>}
      </div>
    </div>
    {p.state.started && <>
      <div className='bottom'>
        {p.state.choosingHero && !p.state[p.player].hero && <>
          <div className='hero-cont'>
            {Object.values(game.heros).map((hero, i) => <div key={i} className="hero"
              onClick={() => {
                game.chooseHero(p.player, hero.id as keyof typeof game.heros)
              }}
            >
              <Hero hero={hero}></Hero>
            </div>

            )}
          </div>
        </>}
        {!p.state.choosingHero && <>
          {p.state.playerTurn === p.player && <>
            <div className='buttons'>
              {p.state.nextAction === "TAKE" && p.state.playerTurn === p.player && <>
                <div className='button button-take-pick' onClick={() => {
                  game.takePick()
                }}>
                  Take Pick
                </div>
                <div className='button button-take-random' onClick={() => {
                  game.takeRandom()
                }}>
                  Take Random
                </div>
              </>}
              {p.state.nextAction === "GIVE" && <>
                <div className='give-flex'>
                  <div className='knock'
                    onClick={() => {
                      game.knock(p.player)
                    }}
                    style={{
                      opacity: !game.canIKnock(p.player) ? "0.3" : "1",
                      pointerEvents: !game.canIKnock(p.player) ? "none" : "initial",
                    }}>
                    Knock {game.getPointsForKnock(p.player)}
                  </div>
                </div>
              </>}

            </div>
          </>}
        </>}
      </div>
    </>}
  </>
}

// const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
// const gun = Gun(['http://51.15.246.203:8765/gun']);
// const gun = Gun(['https://board.modez.pro/gun']);
const gun = Gun({
  localStorage: false,
  peers: ['https://board.modez.pro/gun'],
});


const queryString = window.location.search;
const urlRoomId = new URLSearchParams(queryString).get("game");

function App() {
  const [state, setState] = useState<ReturnType<typeof engine>["state"]>(game.state)
  const [player, setPlayer] = useState<Player>("PLAYER1");

  const updateNet = async () => {
    console.log("UPDATE NET");
    const net = gun.get('gin-board').get(game.state.game.id);
    await new Promise(r => net.put(JSON.stringify(game.state), r));
  }

  const listenNet = (id: string) => {
    const net = gun.get('gin-board').get(id);
    net.on((value) => {
      const data = JSON.parse(value) as ReturnType<typeof engine>["state"];
      Object.keys(game.state).forEach((key) => {
        (game.state as any)[key] = (data as any)[key];
      })
      console.log("listen net :", game);
      setState({ ...game.state })
    })

  }

  const newGame = async () => {
    const gameId = makeId();
    console.log("GAME ID", gameId);
    const net = gun.get('gin-board').get(gameId);
    localStorage.setItem(gameId, "PLAYER1")
    setPlayer("PLAYER1")
    game.state.game.id = gameId;
    game.state.game.PLAYER1.seated = true;
    await updateNet()
    window.location.href = `${window.location.origin}?game=${game.state.game.id}`
  }

  const openGame = (gameId: string) => {
    const net = gun.get('gin-board').get(gameId);
    let viewed = false;
    console.log("GAME ID", gameId);

    net.on((value) => {
      if (!viewed) {
        viewed = true;
        const data = JSON.parse(value) as ReturnType<typeof engine>["state"];
        Object.keys(game.state).forEach((key) => {
          (game.state as any)[key] = (data as any)[key];
        })
        const localPlayer = localStorage.getItem(gameId) as Player;
        if (!localPlayer && game.state.game.PLAYER1.seated && game.state.game.PLAYER2.seated) {
          alert("Table pleine, degage");
          window.location.href = `${window.location.origin}`
        }
        if (!localPlayer) {
          localStorage.setItem(gameId, "PLAYER2")
          game.state.game.PLAYER2.seated = true;
          setPlayer("PLAYER2")
        } else {
          setPlayer(localPlayer as Player)
          game.state.game[localPlayer].seated = true;
        }
        window.history.replaceState(null, "", `${window.location.origin}?game=${game.state.game.id}`);
        updateNet()
        listenNet(gameId);
      }
    })
  }

  useEffect(() => {
    const listener = game.stateEvent.subscribe((state) => {
      updateNet()
    })

    if (urlRoomId) {
      openGame(urlRoomId);
    }

    ; (async () => {
      let currentWidth = 0;
      let currentHeight = 0;
      const root = document.documentElement

      root.style.setProperty('amount-card-width', `${FIELD_WIDTH}`);
      root.style.setProperty('amount-card-height', `${FIELD_HEIGHT}`);

      while (true) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        let changed = false;
        if (currentWidth !== width) {
          currentWidth = width;
          changed = true;
        }
        if (currentHeight !== height) {
          currentHeight = height;
          changed = true;
        }
        if (changed) {
          root.style.setProperty('--width', `${width}px`);
          root.style.setProperty('--width', `${width}px`);

        }
        await new Promise(r => requestAnimationFrame(r))
      }
    })()

    return () => {
      listener.unsubscribe();
    }
  }, [])

  return <>
    {!state.game.id && <div>
      <button onClick={() => {
        newGame()

      }}>New online game</button>
    </div>}
    {state.game.id && <>
      {state.game.ready && <>
        <Board state={state} player={player}></Board>
        {/* <Board state={state} hero={player === "PLAYER1" ? "PLAYER2" : "PLAYER1"}></Board> */}
      </>}
      {!state.game.PLAYER1.seated || !state.game.PLAYER2.seated && <div>
        Waiting for player 2... <br />
        invitation link : {window.location.href}
      </div>}
      {/* {state.game.PLAYER1.seated && state.game.PLAYER2.seated && (!state.game[game.op[player]].ready) && <div>
        Waiting for all player to be ready
      </div>} */}
      {!state.started && state.game.PLAYER1.seated && state.game.PLAYER2.seated && !state.game[player].ready && <>
        <div className='button ready' onClick={() => {
          game.setReady(player);
        }}>
          I am ready
        </div>
      </>}
    </>}
  </>
}

export default App;
