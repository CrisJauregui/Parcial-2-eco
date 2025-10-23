import { navigateTo, socket } from "../app.js";

// NOTA: Agregar estos estilos al archivo styles.css del results-screen:
/*
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.leaderboard-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.leaderboard-item:hover {
  background: rgba(102, 126, 234, 0.2);
  transform: translateX(5px);
}

.leaderboard-item .rank {
  font-weight: bold;
  color: #667eea;
  min-width: 40px;
}

.leaderboard-item .nickname {
  flex: 1;
  font-weight: 600;
  color: #f0f0f0;
}

.leaderboard-item .score {
  font-weight: bold;
  color: #76d275;
  font-size: 1.1rem;
}

.winner-announcement {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  padding: 30px;
  border-radius: 15px;
  margin: 20px 0;
  color: #1a1a2e;
  text-align: center;
  box-shadow: 0 8px 25px rgba(255, 215, 0, 0.3);
}

.winner-announcement h3 {
  margin: 0;
  font-size: 2rem;
  animation: pulse 2s ease-in-out infinite;
}

.winner-score {
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 10px;
}

.ranking-section {
  margin: 30px 0;
  padding: 20px;
  background: rgba(15, 15, 25, 0.6);
  border-radius: 15px;
}

.top-player {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  margin: 10px 0;
  background: rgba(102, 126, 234, 0.15);
  border-radius: 10px;
}

.top-player .medal {
  font-size: 2rem;
  margin-right: 15px;
}

.top-player .player-name {
  flex: 1;
  font-weight: 600;
  font-size: 1.2rem;
}

.top-player .player-score {
  font-weight: bold;
  color: #76d275;
  font-size: 1.2rem;
}

.final-leaderboard {
  margin: 20px 0;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 30px;
}

.action-buttons button {
  flex: 1;
  min-width: 180px;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
*/

export default function renderScreen2(data) {
  const app = document.getElementById("app");
  
  const winner = data?.winner || { nickname: "Desconocido", score: 0 };
  const players = data?.players || [];

  // Crear ranking mostrando los top 3
  const topPlayers = players.slice(0, 3);
  let rankingHTML = '';
  
  topPlayers.forEach((player, index) => {
    const medals = ['🥇', '🥈', '🥉'];
    rankingHTML += `
      <div class="top-player">
        <span class="medal">${medals[index]}</span>
        <span class="player-name">${player.nickname}</span>
        <span class="player-score">${player.score} pts</span>
      </div>
    `;
  });

  app.innerHTML = `
    <div id="screen2">
      <h2>🎉 ¡Juego Terminado! 🎉</h2>
      <div class="winner-announcement">
        <h3>🏆 Ganador: ${winner.nickname} 🏆</h3>
        <p class="winner-score">${winner.score} puntos</p>
      </div>
      
      <div class="ranking-section">
        <h4>Top 3 Jugadores</h4>
        ${rankingHTML}
      </div>

      <div class="final-leaderboard">
        <h4>Ranking Completo</h4>
        <div id="full-leaderboard-container"></div>
      </div>

      <div class="action-buttons">
        <button id="sort-alphabetical-final">Ordenar Alfabéticamente</button>
        <button id="reset-game">Reiniciar Juego</button>
        <button id="go-screen-back">Ver Tiempo Real</button>
      </div>
    </div>
  `;

  let currentPlayers = [...players];
  let isAlphabetical = false;

  const renderFullLeaderboard = (playersList) => {
    const container = document.getElementById("full-leaderboard-container");
    
    let html = '<div class="leaderboard-list">';
    
    playersList.forEach((player, index) => {
      html += `
        <div class="leaderboard-item">
          <span class="rank">${index + 1}.</span>
          <span class="nickname">${player.nickname}</span>
          <span class="score">${player.score || 0} pts</span>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  };

  // Renderizar leaderboard inicial
  renderFullLeaderboard(currentPlayers);

  // Botón para ordenar alfabéticamente
  const sortButton = document.getElementById("sort-alphabetical-final");
  sortButton.addEventListener("click", () => {
    isAlphabetical = !isAlphabetical;
    
    if (isAlphabetical) {
      const sorted = [...currentPlayers].sort((a, b) => 
        a.nickname.localeCompare(b.nickname)
      );
      renderFullLeaderboard(sorted);
      sortButton.textContent = "Ordenar por Puntuación";
    } else {
      const sorted = [...currentPlayers].sort((a, b) => 
        (b.score || 0) - (a.score || 0)
      );
      renderFullLeaderboard(sorted);
      sortButton.textContent = "Ordenar Alfabéticamente";
    }
  });

  // Botón para reiniciar el juego (limpiar puntuaciones)
  const resetButton = document.getElementById("reset-game");
  resetButton.addEventListener("click", async () => {
    try {
      const BASE_URL = "http://localhost:5050";
      await fetch(`${BASE_URL}/api/game/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      // Volver a la pantalla de tiempo real
      navigateTo("/");
    } catch (error) {
      console.error("Error al reiniciar el juego:", error);
      alert("Error al reiniciar el juego");
    }
  });

  // Botón para volver a tiempo real
  const goBackButton = document.getElementById("go-screen-back");
  goBackButton.addEventListener("click", () => {
    navigateTo("/");
  });

  // Escuchar reset del juego desde otros clientes
  socket.on("gameReset", () => {
    navigateTo("/");
  });
}