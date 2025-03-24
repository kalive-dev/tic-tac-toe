import { useGameStore } from "./store";
import classNames from "classnames";
import { useState } from "react";

const App = () => {
  const {
    board,
    currentPlayer,
    winner,
    isDraw,
    moveCount,
    playMove,
    resetGame,
    undoMove,
    createRoom,
    joinRoom,
    isOnline,
    isWaiting,
    playerSymbol,
    roomId,
    error,
  } = useGameStore();

  const [joinRoomId, setJoinRoomId] = useState("");

  const handleCreateRoom = async () => {
    const newRoomId = await createRoom();
    console.log("Created room:", newRoomId);
  };

  const handleJoinRoom = async () => {
    try {
      await joinRoom(joinRoomId);
    } catch (err) {
      console.error("Failed to join room:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-4">Tic-Tac-Toe</h1>

      {!isOnline && (
        <div className="mb-8 space-y-4">
          <div className="flex space-x-4">
            <button
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={handleCreateRoom}
            >
              Create Room
            </button>
            <div className="flex space-x-2">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="px-3 py-2 border rounded"
              />
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleJoinRoom}
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      )}

      {isWaiting && (
        <div className="mb-4 text-lg">
          Waiting for opponent... Room ID:{" "}
          <span className="font-mono font-bold">{roomId}</span>
        </div>
      )}

      {error && <div className="mb-4 text-red-500">{error}</div>}

      {isOnline && (
        <div className="mb-4">
          <p className="text-lg">
            Room: <span className="font-mono">{roomId}</span> | You are:{" "}
            <span className="font-bold">{playerSymbol}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, index) => (
          <button
            key={index}
            className={classNames(
              "w-24 h-24 text-4xl font-bold flex items-center justify-center border-2 border-gray-600",
              {
                "bg-green-300": winner && board[index] === winner,
                "cursor-not-allowed":
                  isOnline && currentPlayer !== playerSymbol,
              }
            )}
            onClick={() => playMove(index)}
            disabled={
              !!winner ||
              !!cell ||
              isDraw ||
              (isOnline && currentPlayer !== playerSymbol)
            }
          >
            {cell}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xl font-semibold">
        {isDraw
          ? "It's a draw! 🤝"
          : winner
          ? `Winner: ${winner}! 🎉`
          : `Current Turn: ${currentPlayer}`}
      </p>

      <p className="mt-2 text-gray-600">Moves made: {moveCount}</p>

      <div className="mt-4 space-x-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          onClick={resetGame}
        >
          {isOnline ? "Leave Game" : "Restart Game"}
        </button>
        {!isOnline && (
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
            onClick={undoMove}
            disabled={moveCount === 0}
          >
            Undo Move
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
