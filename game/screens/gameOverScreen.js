import { makeRequest, navigateTo, socket } from "../app.js";

export default function renderGameOverScreen(data) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div id="game-over">
      <h1>Game Over</h1>
      <h2 id="game-result">${data.message}</h2>
      <div id="game-controls" style="margin-top: 20px;">
        <button id="new-round-button" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); margin-right: 10px;">Nueva Ronda</button>
        <button id="restart-button" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">Reiniciar Juego</button>
      </div>
    </div>
  `;

  console.log("data", data);

  const newRoundButton = document.getElementById("new-round-button");
  const restartButton = document.getElementById("restart-button");

  newRoundButton.addEventListener("click", async () => {
    try {
      await makeRequest("/api/game/restart", "POST", {});
    } catch (error) {
      console.error("Error al iniciar nueva ronda:", error);
      alert("Error al iniciar nueva ronda");
    }
  });

  restartButton.addEventListener("click", async () => {
    try {
      await makeRequest("/api/game/reset", "POST", {});
    } catch (error) {
      console.error("Error al reiniciar el juego:", error);
      alert("Error al reiniciar el juego");
    }
  });

  // Keep the socket.on listener for game start event
  socket.on("startGame", (role) => {
    navigateTo("/game", { nickname: data.nickname, role });
  });

  // Escuchar restart del juego (nuevos roles)
  socket.on("restartGame", (newRole) => {
    navigateTo("/game", { nickname: data.nickname, role: newRole });
  });
}
