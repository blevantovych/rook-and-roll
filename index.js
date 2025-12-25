import {Chess} from "https://cdn.jsdelivr.net/npm/chess.mjs@1.3.1/src/chess.mjs/Chess.js"

import {
  Chessboard,
  INPUT_EVENT_TYPE,
  COLOR, 
  BORDER_TYPE
} from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/Chessboard.js"

import {MARKER_TYPE, Markers} from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/extensions/markers/Markers.js"
import {PROMOTION_DIALOG_RESULT_TYPE, PromotionDialog} from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/extensions/promotion-dialog/PromotionDialog.js"
import {Accessibility} from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/extensions/accessibility/Accessibility.js"

let boardIndex = 0;

/**
  * @param puzzles {Array<{Puzzle: string}>}
  * @param solvedPuzzles {Array<string>}
  * @param {number} [puzzleIndex=0]
  * @returns {number} the index of the next puzzle to show
*/
const getPuzzleIndex = (puzzles, solvedPuzzles, puzzleIndex = 0) => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const start = urlParams.get('start');
  if (!puzzleIndex) {
    puzzleIndex = Number(start) - 1 || 0
  }
  return puzzles.findIndex(({ Puzzle }, i) => i > puzzleIndex && !solvedPuzzles.includes(Puzzle))
}

/**
  * @returns {Array<string>} list of solved puzzles in the form: ["1Q3r2/p5pk/8/2p3q1/p5p1/2B5/6PK/8 w - - 0 51,b8f8 g5h6 h2g3 h6e3 g3g4 e3c3 f8f5 g7g6"]
*/
const getSolvedPuzzles = () => {
  const solvedPuzzles = localStorage.getItem('solved_puzzles') ? JSON.parse(localStorage.getItem('solved_puzzles')) : []
  return solvedPuzzles;
}

const addToSolvedPuzzles = (puzzle) => {
  const solvedPuzzles = getSolvedPuzzles()
  localStorage.setItem('solved_puzzles', JSON.stringify([...solvedPuzzles, puzzle]))
}

const getMoveThatThisOldChessjsVersionUnderstands = move => {
  const promotion = move.slice(4)
  return {
    from: move.slice(0, 2),
    to: move.slice(2, 4),
    ...(promotion ? {promotion} : {})
  }
}

/**
 * Gets puzzles from DB
 *
 * @returns {{ Black: string, CombinedElo: string, DateTime: string, Event: string, Puzzle: string, Site: string, White: string }[]} user - The user object.
 */
async function fetchPuzzles() {
  // const eventName = 'Українська ліга 226 Team Battle';
  // const eventName = 'Українська ліга 243 Team Battle';
  // const eventName = 'Titled-Tuesday-Blitz-October-07-2025';
  const eventName = 'Winter Cup 100 000 UAH';
  // const eventName = 'Rated blitz game';
  return fetch(`https://ev0ntrlhjg.execute-api.eu-central-1.amazonaws.com/items?tournament=${encodeURIComponent(eventName)}`)
    .then(res => res.json())
}

function renderBoard({Puzzle: puzzleInput, White, Black, Site}) {
  const chess = new Chess()
  const boardContainer = document.createElement('div')
  const boardId = `board${boardIndex++}`
  const containerId = `${boardId}_container`
  boardContainer.style.marginBottom = '20px'
  boardContainer.style.width = '100%'
  boardContainer.id = containerId
  boardContainer.innerHTML = `
    <div id="${boardId}" class="board" style="width:35vw"></div>
    <div id="checkmark">✅</div>
    <div id="crossmark">❌</div>
    <div id="players" style="text-align: center; padding: 10px">${White} - ${Black}</div>
    <div id="search_term" style="text-align: center; padding: 10px; cursor: pointer;">Copy search term</div>
  `
  setTimeout(() => {
    const searchElem = document.querySelector('#search_term')
    searchElem.addEventListener('click', () => {
      const searchTerm = `${White}.*\\n.*${Black}`
      navigator.clipboard.writeText(searchTerm)
        .then(() => {
          console.log(`${searchTerm} copied to clipboard`);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }, {once: true})
  }, 0)

  const curFavorites = localStorage.getItem('favorites')
  let favorites = curFavorites ? JSON.parse(curFavorites) : []
  if (favorites.includes(puzzles[puzzleIndex].Puzzle)) {
    add_to_fav.textContent = 'Remove from favorites'
  } else {
    add_to_fav.textContent = 'Add to favorites'
  }
  const new_add_to_fav = add_to_fav.cloneNode(true);
  add_to_fav.replaceWith(new_add_to_fav);

  const new_show_solution = show_solution.cloneNode(true);
  show_solution.replaceWith(new_show_solution);

  puzzle_container.appendChild(boardContainer)
  let moveIndex = 0

  function makePuzzleMove(chessboard) {
      setTimeout(() => {
        const move = puzzle.moves[moveIndex++]
        chess.move(move)
        chessboard.setPosition(chess.fen(), true)
        chessboard.enableMoveInput(inputHandler, puzzleColor)
      }, 500)
  }

  function drawCorrectnessMoveIndicator(move, correct) {
      const element = document.querySelector(`#${containerId} [data-square="${move}"]`)
      const boundingBox = element.getBoundingClientRect()
      document.querySelector(correct ? '#crossmark' : '#checkmark').style.opacity = 0;
      const selector = correct ? '#checkmark' : '#crossmark'
      const emoji = document.querySelector(`#${containerId} ${selector}`)
      const indicatorOffset = Math.round(boundingBox.width * 0.7) // 70% of total square;
      emoji.style.left = boundingBox.x + indicatorOffset
      var body = document.body;
      var docEl = document.documentElement;
      const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
      emoji.style.top = boundingBox.y + indicatorOffset + scrollTop;
      emoji.style.opacity = 1
  }

  function inputHandler(event) {
    if (event.type === INPUT_EVENT_TYPE.movingOverSquare) {
      return // ignore this event
    }
    if (event.type !== INPUT_EVENT_TYPE.moveInputFinished) {
      event.chessboard.removeLegalMovesMarkers()
    }
    if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
      // mark legal moves
      const moves = chess.moves({square: event.squareFrom, verbose: true})
      event.chessboard.addLegalMovesMarkers(moves)
      return moves.length > 0
    } else if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
      const move = {from: event.squareFrom, to: event.squareTo, promotion: event.promotion}

      const handleUserMove = (move, promotion) => { // update position, maybe castled and wait for animation has finished
        const correctPromotion = !promotion || (puzzle.moves[moveIndex].promotion && promotion === puzzle.moves[moveIndex].promotion)
        if (move.from !== puzzle.moves[moveIndex].from || move.to !== puzzle.moves[moveIndex].to || !correctPromotion) {
          saveFailedAttemptInLocalStorage(puzzle.fen, move, promotion)
          drawCorrectnessMoveIndicator(move.to, false)
          setTimeout(() => {
            chess.undo()
            document.querySelector(`#${containerId} #crossmark`).style.opacity = 0;
            event.chessboard.setPosition(chess.fen(), true)
            event.chessboard.enableMoveInput(inputHandler, puzzleColor)
          }, 500)
          // return
        } else {
          moveIndex++
          drawCorrectnessMoveIndicator(move.to, true)
          makePuzzleMove(event.chessboard)
          if (puzzle.moves.length === moveIndex) {
            const playersElem = document.querySelector('#players')
            const moveNumber = Number(puzzleInput.split(",")?.[0]?.split(' ')?.at(-1)) * 2
            playersElem.innerHTML = `<a href="${Site}${moveNumber ? `#${moveNumber}`: ''}" target="_blank">${puzzleIndex}. ${White} - ${Black}</a>`

            congrats.style.display = 'block'
            addToSolvedPuzzles(puzzleInput)
            return
          }
        }
      }

      const result = chess.move(move)
      if (result) {
        event.chessboard.state.moveInputProcess.then(() => { // wait for the move input process has finished
          event.chessboard.setPosition(chess.fen(), true).then(() => handleUserMove(move))
        })
      } else {
        // promotion?
        let possibleMoves = chess.moves({square: event.squareFrom, verbose: true})
        window.chess = chess
        for (const possibleMove of possibleMoves) {
          if (possibleMove.promotion && possibleMove.to === event.squareTo) {
            event.chessboard.showPromotionDialog(event.squareTo, chess.turn(), (result) => {
              if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
                const promotion = result.piece.charAt(1)
                const move = {from: event.squareFrom, to: event.squareTo, promotion} 
                chess.move(move)
                event.chessboard.setPosition(chess.fen(), true).then(() => {
                  handleUserMove(move, promotion)
                })
              } else {
                // promotion canceled
                event.chessboard.enableMoveInput(inputHandler, puzzle)
                event.chessboard.setPosition(chess.fen(), true)
              }
            })
            return true
          }
        }
      }
      return result
    } else if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
      if(event.legalMove) {
        event.chessboard.disableMoveInput()
      }
    }
  }

  // const puzzleInput = '00sJ9,r3r1k1/p4ppp/2p2n2/1p6/3P1qb1/2NQR3/PPB2PP1/R1B3K1 w - - 5 18,e3g3 e8e1 g1h2 e1c1 a1c1 f4h6 h2g1 h6c1,2671,105,87,325,advantage attraction fork middlegame sacrifice veryLong,https://lichess.org/gyFeQsOE#35,French_Defense French_Defense_Exchange_Variation'
  // const puzzleInput = '00sO1,1k1r4/pp3pp1/2p1p3/4b3/P3n1P1/8/KPP2PN1/3rBR1R b - - 2 31,b8c7 e1a5 b7b6 f1d1,998,85,94,293,advantage discoveredAttack master middlegame short,https://lichess.org/vsfFkG0s/black#62'

  const puzzlePieces = puzzleInput.split(',')
  const puzzle = {
    fen: puzzlePieces[0],
    moves: puzzlePieces[1].split(' ').map(getMoveThatThisOldChessjsVersionUnderstands),
  }
    // id: puzzlePieces[0],
  chess.load(puzzle.fen)
  const turn = chess.turn()
  const puzzleColor = turn === COLOR.black ? COLOR.white : COLOR.black

  const board = new Chessboard(document.getElementById(boardId), {
      position: puzzle.fen,
      assetsUrl: "./assets/",
      style: {borderType: BORDER_TYPE.none, pieces: {file: "pieces/staunty.svg"}, animationDuration: 300},
      orientation: puzzleColor,
      extensions: [
        {class: Markers, props: {autoMarkers: MARKER_TYPE.square}},
        {class: PromotionDialog},
        {class: Accessibility, props: {visuallyHidden: true}}
      ]
    })
    board.enableMoveInput(inputHandler, puzzleColor)

  setTimeout(() => {
    chess.move(puzzle.moves[0])
    // board.movePiece(puzzle.moves[0].from, puzzle.moves[0].to, true)
    // setPosition is bettern in case the first move is a promotion (e.g. b2b1q b3e6 c8b7 c7c8q)
    board.setPosition(chess.fen(), true)
    moveIndex++
  }, 1000)

  function favHandler() {
    const puzzle = puzzles[puzzleIndex].Puzzle
    const curFavorites = localStorage.getItem('favorites')
    let favorites = curFavorites ? JSON.parse(curFavorites) : []
    if (favorites.includes(puzzle)) {
      favorites = favorites.filter(fav => fav !== puzzle)
      add_to_fav.textContent = 'Add to favorites'
    } else {
      favorites.push(puzzle)
      add_to_fav.textContent = 'Remove from favorites'
    }
    localStorage.setItem('favorites', JSON.stringify(favorites))
  }
  add_to_fav.addEventListener('click', favHandler)

  show_solution.addEventListener('click', function() {
    solution_el.innerHTML = '';
    const [fen = '', solution = ''] = puzzles[puzzleIndex].Puzzle.split(',')
    const solutionMoves = solution?.split(' ') ?? [] // excluding the first move because it is the move before the puzzle starts

    solutionMoves.forEach((move, i) => {
      const moveEl = document.createElement('span')
      moveEl.innerText = move;
      moveEl.style.cursor = 'pointer'
      moveEl.style.paddingRight = '5px'
      moveEl.addEventListener('click', () => {
        const c = new Chess()
        c.load(fen)
        for (var j = 0; j <= i; j++) {
          c.move(getMoveThatThisOldChessjsVersionUnderstands(solutionMoves[j]))
        }
        const newfen = c.fen().split(' ')[0]
        
        board.setPosition(newfen)
      })
      solution_el.appendChild(moveEl)
    })
  })
}

let puzzles = [];
try {
  puzzles = await fetchPuzzles()
} catch(e) {
  console.error('couldn\'t fetch')
  throw e
}
const solvedPuzzles = getSolvedPuzzles()
let puzzleIndex = getPuzzleIndex(puzzles, solvedPuzzles);

const p = puzzles[puzzleIndex]
renderBoard(p)
next_button.addEventListener('click', function() {
  puzzleIndex = getPuzzleIndex(puzzles, solvedPuzzles, puzzleIndex)
  const p = puzzles[puzzleIndex]
  puzzle_container.innerHTML = ''
  solution_el.innerHTML = ''
  congrats.style.display = 'none'
  renderBoard(p)
})
 
function saveFailedAttemptInLocalStorage(fen, move, promotion) {
  const localStorageFailedAttemptsKey = 'attempts'
  let attempts = {}
  try {
    attempts = (localStorage.getItem(localStorageFailedAttemptsKey) && JSON.parse(localStorage.getItem(localStorageFailedAttemptsKey))) ?? {}
  } catch(e) {}
  const userFailedAttempt = `${move.from}${move.to}${promotion ?? ''}`
  if (attempts[fen]) {
    if (!attempts[fen].includes(userFailedAttempt)) {
      attempts[fen] = [...attempts[fen], userFailedAttempt]
    }
  } else {
    attempts[fen] = [userFailedAttempt]
  }
  localStorage.setItem(localStorageFailedAttemptsKey, JSON.stringify(attempts))
}
