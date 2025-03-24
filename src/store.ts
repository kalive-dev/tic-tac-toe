import { create } from "zustand";
import { io, Socket } from "socket.io-client";

type Player = "X" | "O" | null;
type Board = Player[];

interface GameState {
  board: Board;
  currentPlayer: Player;
  winner: Player;
  moveCount: number;
  history: Board[];
  isDraw: boolean;
  socket: Socket | null;
  roomId: string | null;
  playerSymbol: Player;
  isOnline: boolean;
  isWaiting: boolean;
  error: string | null;
  playMove: (index: number) => void;
  resetGame: () => void;
  undoMove: () => void;
  createRoom: () => Promise<string>;
  joinRoom: (roomId: string) => Promise<void>;
  disconnect: () => void;
}

const checkWinner = (board: Board): Player => {
  const winningCombinations = [
    [0, 1, 2], // Rows
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6], // Columns
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8], // Diagonals
    [2, 4, 6],
  ];
  for (const [a, b, c] of winningCombinations) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
};

const checkDraw = (board: Board): boolean => {
  return board.every((cell) => cell !== null);
};

export const useGameStore = create<GameState>((set, get) => {
  let socket: Socket | null = null;

  const initSocket = () => {
    if (!socket) {
      socket = io("http://localhost:3001");

      socket.on("gameStart", ({ players }) => {
        console.log("Game started with players:", players);
      });

      socket.on("gameUpdate", (gameState) => {
        set({
          board: gameState.board,
          currentPlayer: gameState.currentPlayer,
          moveCount: gameState.moveCount,
          winner: gameState.winner,
          isDraw: gameState.isDraw,
        });
      });

      socket.on("playerLeft", () => {
        set({ error: "Opponent left the game" });
        get().disconnect();
      });
    }
    return socket;
  };

  return {
    board: Array(9).fill(null),
    currentPlayer: "X",
    winner: null,
    moveCount: 0,
    history: [Array(9).fill(null)],
    isDraw: false,
    socket: null,
    roomId: null,
    playerSymbol: null,
    isOnline: false,
    isWaiting: false,
    error: null,

    createRoom: async () => {
      const socket = initSocket();
      set({ socket, isWaiting: true, isOnline: true, playerSymbol: "X" });

      return new Promise((resolve) => {
        socket.emit("createRoom", (roomId: string) => {
          set({ roomId, isWaiting: true });
          resolve(roomId);
        });
      });
    },

    joinRoom: async (roomId: string) => {
      const socket = initSocket();
      set({ socket, isOnline: true });

      return new Promise((resolve, reject) => {
        socket.emit(
          "joinRoom",
          roomId,
          (response: {
            error?: string;
            success?: boolean;
            player?: Player;
          }) => {
            if (response.error) {
              set({ error: response.error });
              reject(response.error);
            } else {
              set({
                roomId,
                playerSymbol: response.player || null,
                isWaiting: false,
              });
              resolve();
            }
          }
        );
      });
    },

    playMove: (index) => {
      const state = get();
      if (state.board[index] || state.winner || state.isDraw) return;

      if (state.isOnline) {
        if (state.currentPlayer !== state.playerSymbol) return;
        state.socket?.emit("makeMove", { roomId: state.roomId, index });
      } else {
        const newBoard = [...state.board];
        newBoard[index] = state.currentPlayer;
        const winner = checkWinner(newBoard);
        const isDraw = !winner && checkDraw(newBoard);

        set({
          board: newBoard,
          currentPlayer: winner
            ? state.currentPlayer
            : state.currentPlayer === "X"
            ? "O"
            : "X",
          winner,
          moveCount: state.moveCount + 1,
          history: [...state.history, newBoard],
          isDraw,
        });
      }
    },

    disconnect: () => {
      const state = get();
      state.socket?.disconnect();
      set({
        socket: null,
        roomId: null,
        playerSymbol: null,
        isOnline: false,
        isWaiting: false,
        error: null,
      });
    },

    undoMove: () => {
      const state = get();
      if (state.isOnline) return; // Disable undo in online mode

      if (state.moveCount === 0) return;

      const newHistory = [...state.history];
      newHistory.pop();
      const previousBoard = newHistory[newHistory.length - 1];

      set({
        board: previousBoard,
        currentPlayer: state.currentPlayer === "X" ? "O" : "X",
        winner: null,
        moveCount: state.moveCount - 1,
        history: newHistory,
        isDraw: false,
      });
    },

    resetGame: () => {
      const state = get();
      if (state.isOnline) {
        state.disconnect();
      }

      set({
        board: Array(9).fill(null),
        currentPlayer: "X",
        winner: null,
        moveCount: 0,
        history: [Array(9).fill(null)],
        isDraw: false,
      });
    },
  };
});
