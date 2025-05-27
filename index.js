import {Chess} from "https://cdn.jsdelivr.net/npm/chess.mjs@1.2.0/src/chess.mjs/Chess.js"

import {
  Chessboard,
  FEN,
  INPUT_EVENT_TYPE,
  COLOR, 
  BORDER_TYPE
} from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/Chessboard.js"

import {MARKER_TYPE, Markers} from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/extensions/markers/Markers.js"
import {PROMOTION_DIALOG_RESULT_TYPE, PromotionDialog} from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/extensions/promotion-dialog/PromotionDialog.js"
import {Accessibility} from "https://cdn.jsdelivr.net/npm/cm-chessboard@8/src/extensions/accessibility/Accessibility.js"

const chess = new Chess()

let moveIndex = 0
window.chess = chess
let seed = 71;
function random() {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function makeEngineMove(chessboard) {
  const possibleMoves = chess.moves({verbose: true})
  if (possibleMoves.length > 0) {
    const randomIndex = Math.floor(random() * possibleMoves.length)
    const randomMove = possibleMoves[randomIndex]
    setTimeout(() => { // smoother with 500ms delay
      chess.move({from: randomMove.from, to: randomMove.to})
      chessboard.setPosition(chess.fen(), true)
      chessboard.enableMoveInput(inputHandler, COLOR.white)
    }, 500)
  }
}

function makePuzzleMove(chessboard) {
  // const possibleMoves = chess.moves({verbose: true})
  // if (possibleMoves.length > 0) {
  //   const randomIndex = Math.floor(random() * possibleMoves.length)
  //   const randomMove = possibleMoves[randomIndex]

    setTimeout(() => { // smoother with 500ms delay
      chess.move(puzzle.moves[moveIndex++])
      chessboard.setPosition(chess.fen(), true)
      chessboard.enableMoveInput(inputHandler, puzzleColor)
    }, 500)
  // }
}


function inputHandler(event) {
  console.log("inputHandler", event)
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
    console.log(puzzle.moves[moveIndex], move)
    if (move.from !== puzzle.moves[moveIndex].from || move.to !== puzzle.moves[moveIndex].to) {
      alert('Wrong move!')
      return
    }

    const result = chess.move(move)
    if (result) {
      moveIndex++
      event.chessboard.state.moveInputProcess.then(() => { // wait for the move input process has finished
        event.chessboard.setPosition(chess.fen(), true).then(() => { // update position, maybe castled and wait for animation has finished
          if (puzzle.moves.length === moveIndex) {
            alert('Success!')
            return
          }

          // makeEngineMove(event.chessboard)
          makePuzzleMove(event.chessboard)
        })
      })
    } else {
      // promotion?
        let possibleMoves = chess.moves({square: event.squareFrom, verbose: true})
      for (const possibleMove of possibleMoves) {
        if (possibleMove.promotion && possibleMove.to === event.squareTo) {
          event.chessboard.showPromotionDialog(event.squareTo, COLOR.white, (result) => {
            console.log("promotion result", result)
            if (result.type === PROMOTION_DIALOG_RESULT_TYPE.pieceSelected) {
              chess.move({from: event.squareFrom, to: event.squareTo, promotion: result.piece.charAt(1)})
              event.chessboard.setPosition(chess.fen(), true)
              makeEngineMove(event.chessboard)
            } else {
              // promotion canceled
              event.chessboard.enableMoveInput(inputHandler, COLOR.white)
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
const puzzleInput = '00sO1,1k1r4/pp3pp1/2p1p3/4b3/P3n1P1/8/KPP2PN1/3rBR1R b - - 2 31,b8c7 e1a5 b7b6 f1d1,998,85,94,293,advantage discoveredAttack master middlegame short,https://lichess.org/vsfFkG0s/black#62'

const puzzlePieces = puzzleInput.split(',')
const puzzle = {
  id: puzzlePieces[0],
  fen: puzzlePieces[1],
  moves: puzzlePieces[2].split(' ').map(move => ({from: move.slice(0, 2), to: move.slice(2, 4) })),
}
chess.load(puzzle.fen)
const turn = chess.turn()
const puzzleColor = turn === COLOR.black ? COLOR.white : COLOR.black

const board = new Chessboard(document.getElementById("board"), {
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

setTimeout(() => {
  chess.move(puzzle.moves[0])
  board.movePiece(puzzle.moves[0].from, puzzle.moves[0].to, true)
  moveIndex++
}, 1000)
