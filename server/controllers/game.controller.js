const playersDb = require("../db/players.db");
const {
  emitEvent,
  emitToSpecificClient,
} = require("../services/socket.service");

const joinGame = async (req, res) => {
  try {
    const { nickname, socketId } = req.body;
    playersDb.addPlayer(nickname, socketId);

    const gameData = playersDb.getGameData();
    emitEvent("userJoined", gameData);

    res.status(200).json({ success: true, players: gameData.players });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const startGame = async (req, res) => {
  try {
    const playersWithRoles = playersDb.assignPlayerRoles();

    playersWithRoles.forEach((player) => {
      emitToSpecificClient(player.id, "startGame", player.role);
    });

    // Emitir leaderboard inicial a results-screen
    const leaderboard = playersDb.getLeaderboard();
    emitEvent("leaderboardUpdate", { 
      players: leaderboard,
      winner: null 
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const notifyMarco = async (req, res) => {
  try {
    const { socketId } = req.body;
    const marcoPlayer = playersDb.findPlayerById(socketId);

    const rolesToNotify = playersDb.findPlayersByRole([
      "polo",
      "polo-especial",
    ]);

    rolesToNotify.forEach((player) => {
      emitToSpecificClient(player.id, "notification", {
        message: "Marco!!!",
        userId: socketId,
        fromPlayer: marcoPlayer.nickname,
      });
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const notifyPolo = async (req, res) => {
  try {
    const { socketId } = req.body;
    const poloPlayer = playersDb.findPlayerById(socketId);

    console.log("Polo gritando:", poloPlayer.nickname, "con rol:", poloPlayer.role);

    const rolesToNotify = playersDb.findPlayersByRole("marco");

    console.log("Marco(s) a notificar:", rolesToNotify.map(p => p.nickname));

    rolesToNotify.forEach((player) => {
      console.log("Enviando notificación a Marco:", player.nickname);
      emitToSpecificClient(player.id, "notification", {
        message: "Polo!!",
        userId: socketId,
        fromPlayer: poloPlayer.nickname,
      });
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const selectPolo = async (req, res) => {
  try {
    const { socketId, poloId } = req.body;

    const myUser = playersDb.findPlayerById(socketId);
    const poloSelected = playersDb.findPlayerById(poloId);
    const allPlayers = playersDb.getAllPlayers();

    let gameMessage = "";
    let isWinner = false;

    if (myUser.role === "marco") {
      if (poloSelected.role === "polo-especial") {
        // Marco atrapó al Polo Especial: +50 puntos para Marco, -10 para Polo Especial
        playersDb.updatePlayerScore(socketId, 50);
        playersDb.updatePlayerScore(poloId, -10);
        gameMessage = `El marco ${myUser.nickname} atrapó al Polo Especial ${poloSelected.nickname}! +50 pts para Marco, -10 pts para Polo Especial`;
      } else {
        // Marco atrapó un Polo normal: -10 puntos para Marco, +10 para Polo
        playersDb.updatePlayerScore(socketId, -10);
        playersDb.updatePlayerScore(poloId, 10);
        gameMessage = `El marco ${myUser.nickname} atrapó a ${poloSelected.nickname}! -10 pts para Marco, +10 pts para Polo`;
      }
    }

    // Verificar condición de victoria
    const winner = playersDb.checkWinningCondition();
    if (winner) {
      isWinner = true;
      gameMessage += ` ¡${winner.nickname} ha ganado con ${winner.score} puntos!`;
    }

    // Actualizar leaderboard
    const leaderboard = playersDb.getLeaderboard();

    // Emitir actualización del leaderboard a results-screen
    emitEvent("leaderboardUpdate", { 
      players: leaderboard,
      winner: winner 
    });

    // Emitir actualización de puntuación a todos los jugadores
    allPlayers.forEach((player) => {
      emitToSpecificClient(player.id, "scoreUpdate", {
        players: leaderboard,
        message: gameMessage,
        isWinner: isWinner
      });
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const { alphabetical } = req.query;
    const leaderboard = playersDb.getLeaderboard(alphabetical === 'true');
    const winner = playersDb.checkWinningCondition();
    
    res.status(200).json({ 
      players: leaderboard,
      winner: winner 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const handlePoloEspecialNotCaught = async (req, res) => {
  try {
    const { socketId } = req.body;
    
    // Polo Especial no fue atrapado: +10 puntos
    playersDb.updatePlayerScore(socketId, 10);
    
    // Actualizar leaderboard
    const leaderboard = playersDb.getLeaderboard();
    const winner = playersDb.checkWinningCondition();
    
    // Emitir actualización del leaderboard a results-screen
    emitEvent("leaderboardUpdate", { 
      players: leaderboard,
      winner: winner 
    });
    
    // Emitir actualización de puntuación a todos los jugadores
    const allPlayers = playersDb.getAllPlayers();
    allPlayers.forEach((player) => {
      emitToSpecificClient(player.id, "scoreUpdate", {
        players: leaderboard,
        message: `Polo Especial no fue atrapado! +10 pts`,
        isWinner: false
      });
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const restartGame = async (req, res) => {
  try {
    // Reiniciar roles pero mantener puntuaciones
    playersDb.resetRoles();
    
    // Asignar nuevos roles
    const playersWithRoles = playersDb.assignPlayerRoles();
    
    // Emitir nuevos roles a cada jugador
    playersWithRoles.forEach((player) => {
      emitToSpecificClient(player.id, "restartGame", player.role);
    });

    // Emitir actualización del leaderboard
    const leaderboard = playersDb.getLeaderboard();
    emitEvent("leaderboardUpdate", { 
      players: leaderboard,
      winner: null 
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const resetGame = async (req, res) => {
  try {
    playersDb.resetScores();
    
    // Emitir evento de reinicio a todos los clientes
    emitEvent("gameReset", { 
      players: playersDb.getAllPlayers() 
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  joinGame,
  startGame,
  notifyMarco,
  notifyPolo,
  selectPolo,
  getLeaderboard,
  handlePoloEspecialNotCaught,
  restartGame,
  resetGame,
};