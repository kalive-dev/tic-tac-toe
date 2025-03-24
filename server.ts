import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

interface GameRoom {
  players: string[];
  currentGame: {
    board: (string | null)[];
    currentPlayer: string;
    moveCount: number;
    winner: string | null;
    isDraw: boolean;
  };
}

const rooms = new Map<string, GameRoom>();

const checkWinner = (board: (string | null)[]): string | null => {
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

const checkDraw = (board: (string | null)[]): boolean => {
  return board.every((cell) => cell !== null);
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("createRoom", (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    rooms.set(roomId, {
      players: [socket.id],
      currentGame: {
        board: Array(9).fill(null),
        currentPlayer: "X",
        moveCount: 0,
        winner: null,
        isDraw: false,
      },
    });
    socket.join(roomId);
    callback(roomId);
  });

  socket.on("joinRoom", (roomId: string, callback) => {
    const room = rooms.get(roomId);
    if (!room) {
      callback({ error: "Room not found" });
      return;
    }
    if (room.players.length >= 2) {
      callback({ error: "Room is full" });
      return;
    }
    room.players.push(socket.id);
    socket.join(roomId);
    callback({ success: true, player: "O" });
    io.to(roomId).emit("gameStart", { players: room.players });
  });

  socket.on("makeMove", ({ roomId, index }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const { currentGame } = room;
    if (
      !currentGame.board[index] &&
      !currentGame.winner &&
      !currentGame.isDraw
    ) {
      currentGame.board[index] = currentGame.currentPlayer;
      currentGame.moveCount++;

      // Перевірка на переможця
      const winner = checkWinner(currentGame.board);
      if (winner) {
        currentGame.winner = winner;
      } else {
        // Перевірка на нічию
        const isDraw = checkDraw(currentGame.board);
        if (isDraw) {
          currentGame.isDraw = true;
        }
        // Зміна поточного гравця тільки якщо гра продовжується
        currentGame.currentPlayer =
          currentGame.currentPlayer === "X" ? "O" : "X";
      }

      io.to(roomId).emit("gameUpdate", currentGame);
    }
  });

  socket.on("disconnect", () => {
    rooms.forEach((room, roomId) => {
      if (room.players.includes(socket.id)) {
        io.to(roomId).emit("playerLeft");
        rooms.delete(roomId);
      }
    });
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
