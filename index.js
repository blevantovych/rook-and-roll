import {Chess} from "https://cdn.jsdelivr.net/npm/chess.mjs@1.2.0/src/chess.mjs/Chess.js"

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

function fetchPuzzles() {
  const eventName = 'Українська ліга 226 Team Battle';
  // const eventName = 'Rated blitz game';
  return fetch(`https://amxmp30651.execute-api.eu-central-1.amazonaws.com/items?tournament=${encodeURIComponent(eventName)}`)
    .then(res => res.json())
}

function renderBoard(puzzleInput) {
  const chess = new Chess()
  const boardContainer = document.createElement('div')
  const boardId = `board${boardIndex++}`
  const containerId = `${boardId}_container`
  boardContainer.style.marginBottom = '20px'
  boardContainer.id = containerId
  boardContainer.innerHTML = `
    <div id="${boardId}" style="width:400px"></div>
    <div id="checkmark">✅</div>
    <div id="crossmark">❌</div>
    <div>${puzzleInput}</div>
  `

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
      emoji.style.left = boundingBox.x + 30;
       var body = document.body;
      var docEl = document.documentElement;
      const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
      emoji.style.top = boundingBox.y + 30 + scrollTop;
      emoji.style.opacity = 1
  }

  function inputHandler(event) {
    // console.log("inputHandler", event)
    if(event.type === INPUT_EVENT_TYPE.movingOverSquare) {
      return // ignore this event
    }
    if(event.type !== INPUT_EVENT_TYPE.moveInputFinished) {
      event.chessboard.removeLegalMovesMarkers()
    }
    if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
      // mark legal moves
      const moves = chess.moves({square: event.squareFrom, verbose: true})
      event.chessboard.addLegalMovesMarkers(moves)
      return moves.length > 0
    } else if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
      const move = {from: event.squareFrom, to: event.squareTo, promotion: event.promotion}

      const result = chess.move(move)
      if (result) {
        event.chessboard.state.moveInputProcess.then(() => { // wait for the move input process has finished
          event.chessboard.setPosition(chess.fen(), true).then(() => { // update position, maybe castled and wait for animation has finished

              if (move.from !== puzzle.moves[moveIndex].from || move.to !== puzzle.moves[moveIndex].to) {
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
                  alert('Success!')
                  return
                }
              }
          })
        })
      } else {
        // promotion?
          let possibleMoves = chess.moves({square: event.squareFrom, verbose: true})
        for (const possibleMove of possibleMoves) {
          if (possibleMove.promotion && possibleMove.to === event.squareTo) {
            event.chessboard.showPromotionDialog(event.squareTo, COLOR.white, (result) => {
              if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
                chess.move({from: event.squareFrom, to: event.squareTo, promotion: result.piece.charAt(1)})
                event.chessboard.setPosition(chess.fen(), true)
                makePuzzleMove(event.chessboard)
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
    moves: puzzlePieces[1].split(' ')
    .map(move => {
      const promotion = move.slice(4)
      return {
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        ...(promotion ? {promotion} : {})
      }
    }),
  }
    // id: puzzlePieces[0],
  chess.load(puzzle.fen)
  const turn = chess.turn()
  const puzzleColor = turn === COLOR.black ? COLOR.white : COLOR.black

  let board;
  setTimeout(() => {
    board = new Chessboard(document.getElementById(boardId), {
      // position: chess.fen(),
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
  })

  setTimeout(() => {
    chess.move(puzzle.moves[0])
    board.movePiece(puzzle.moves[0].from, puzzle.moves[0].to, true)
    moveIndex++
  }, 1000)
}

let puzzleIndex = 0
const puzzles = await fetchPuzzles()

const p = puzzles[0].Puzzle
renderBoard(p)
next_button.addEventListener('click', function() {
  const p = puzzles[++puzzleIndex].Puzzle
  puzzle_container.innerHTML = ''
  renderBoard(p)
})
