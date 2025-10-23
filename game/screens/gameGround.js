import { navigateTo, socket, makeRequest } from "../app.js";

export default function renderGameGround(data) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div id="game-ground">
      <h2 id="game-nickname-display">${data.nickname}</h2>
      <p>Tu rol es:</p>
      <h2 id="role-display">${data.role}</h2>
      <div id="score-display">
        <p>Puntuación actual: <span id="current-score">${data.score || 0}</span> pts</p>
      </div>
      <h2 id="shout-display"></h2>
      <div id="pool-players"></div>
      <button id="shout-button">Gritar ${data.role}</button>
      <div id="game-message"></div>
      <div id="game-controls" style="margin-top: 20px;">
        <button id="restart-game" style="display: none; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">Nueva Ronda</button>
      </div>
    </div>
  `;

  const nickname = data.nickname;
  const polos = [];
  const myRole = data.role;
  const shoutbtn = document.getElementById("shout-button");
  const shoutDisplay = document.getElementById("shout-display");
  const container = document.getElementById("pool-players");

  // Configurar botón de gritar según el rol inicial
  if (myRole === "marco") {
    shoutbtn.style.display = "block";
    shoutbtn.textContent = "Gritar marco";
  } else if (myRole === "polo" || myRole === "polo-especial") {
    shoutbtn.style.display = "block";
    shoutbtn.textContent = `Gritar ${myRole}`;
  } else {
    shoutbtn.style.display = "none";
  }

  // Agregar botón especial para Polo Especial
  if (myRole === "polo-especial") {
    const poloEspecialBtn = document.createElement("button");
    poloEspecialBtn.id = "polo-especial-not-caught";
    poloEspecialBtn.textContent = "No fui atrapado (+10 pts)";
    poloEspecialBtn.style.display = "none";
    poloEspecialBtn.style.backgroundColor = "#ff6b6b";
    poloEspecialBtn.style.marginTop = "10px";
    document.getElementById("game-ground").appendChild(poloEspecialBtn);

    // Event listener para el botón del Polo Especial
    poloEspecialBtn.addEventListener("click", async () => {
      await makeRequest("/api/game/polo-especial-not-caught", "POST", {
        socketId: socket.id,
      });
      poloEspecialBtn.style.display = "none";
    });
  }

  shoutDisplay.style.display = "none";

  // Replace socket.emit with HTTP requests
  shoutbtn.addEventListener("click", async () => {
    // Obtener el rol actual del jugador (puede haber cambiado después de restart)
    const currentRoleDisplay = document.getElementById("role-display");
    const currentRole = currentRoleDisplay.textContent;
    
    console.log("Gritando con rol:", currentRole);
    
    if (currentRole === "marco") {
      console.log("Enviando grito de Marco");
      await makeRequest("/api/game/marco", "POST", {
        socketId: socket.id,
      });
    } else if (currentRole === "polo" || currentRole === "polo-especial") {
      console.log("Enviando grito de Polo");
      await makeRequest("/api/game/polo", "POST", {
        socketId: socket.id,
      });
    } else {
      console.log("Rol no reconocido:", currentRole);
    }
    shoutbtn.style.display = "none";
  });

  // Add event listener to the container for all buttons: this is called event delegation
  container.addEventListener("click", async function (event) {
    if (event.target.tagName === "BUTTON") {
      const key = event.target.dataset.key;
      await makeRequest("/api/game/select-polo", "POST", {
        socketId: socket.id,
        poloId: key,
      });
    }
  });

  // Keep socket.on listeners for receiving notifications
  socket.on("notification", (data) => {
    console.log("Notification recibida:", data);
    
    // Obtener el rol actual del jugador (puede haber cambiado después de restart)
    const currentRoleDisplay = document.getElementById("role-display");
    const currentRole = currentRoleDisplay.textContent;
    
    console.log("Rol actual del receptor:", currentRole);
    console.log("Es mi propia notificación?", data.userId === socket.id);
    
    // Solo procesar la notificación si no es del propio jugador
    if (data.userId !== socket.id) {
      if (currentRole === "marco") {
        console.log("Marco procesando notificación de polo");
        container.innerHTML =
          "<p>Haz click sobre el polo que quieres escoger:</p>";
        polos.push(data);
        polos.forEach((elemt) => {
          const button = document.createElement("button");
          button.innerHTML = `Un jugador gritó: ${elemt.message}`;
          button.setAttribute("data-key", elemt.userId);
          container.appendChild(button);
        });
      } else {
        console.log("Polo procesando notificación de marco");
        shoutbtn.style.display = "block";
        shoutDisplay.innerHTML = `${data.fromPlayer} ha gritado: ${data.message}`;
        shoutDisplay.style.display = "block";
        
        // Mostrar botón especial para Polo Especial después de un tiempo
        if (currentRole === "polo-especial") {
          setTimeout(() => {
            const poloEspecialBtn = document.getElementById("polo-especial-not-caught");
            if (poloEspecialBtn) {
              poloEspecialBtn.style.display = "block";
            }
          }, 3000); // Mostrar después de 3 segundos
        }
      }
    } else {
      console.log("Ignorando notificación propia");
    }
  });

  // Keep socket.on listeners for game over notification
  socket.on("notifyGameOver", (data) => {
    navigateTo("/gameOver", { message: data.message, nickname });
  });

  // Escuchar actualizaciones de puntuación
  socket.on("scoreUpdate", (data) => {
    const currentScoreElement = document.getElementById("current-score");
    const gameMessageElement = document.getElementById("game-message");
    const restartButton = document.getElementById("restart-game");
    const resetButton = document.getElementById("reset-game");
    
    // Actualizar puntuación del jugador actual
    const myPlayer = data.players.find(p => p.nickname === nickname);
    if (myPlayer) {
      currentScoreElement.textContent = myPlayer.score || 0;
    }
    
    // Mostrar mensaje del juego
    if (data.message) {
      gameMessageElement.innerHTML = `<p style="color: #76d275; font-weight: bold;">${data.message}</p>`;
    }
    
    // Mostrar botón de control al final de la ronda
    if (data.message && !data.isWinner) {
      setTimeout(() => {
        restartButton.style.display = "inline-block";
      }, 1000);
    }
    
    // Si hay un ganador, navegar a pantalla de fin de juego
    if (data.isWinner) {
      setTimeout(() => {
        navigateTo("/gameOver", { 
          message: data.message, 
          nickname,
          winner: data.players.find(p => p.score >= 100)
        });
      }, 2000);
    }
  });

  // Escuchar restart del juego (nuevos roles)
  socket.on("restartGame", (newRole) => {
    // Actualizar el rol mostrado
    const roleDisplay = document.getElementById("role-display");
    roleDisplay.textContent = newRole;
    
    // Limpiar mensajes y botones
    const gameMessageElement = document.getElementById("game-message");
    gameMessageElement.innerHTML = "";
    
    const container = document.getElementById("pool-players");
    container.innerHTML = "";
    
    const shoutDisplay = document.getElementById("shout-display");
    shoutDisplay.style.display = "none";
    
    // Ocultar botón de control
    const restartButton = document.getElementById("restart-game");
    restartButton.style.display = "none";
    
    // Actualizar texto del botón de gritar según el nuevo rol
    shoutbtn.textContent = `Gritar ${newRole}`;
    
    // Mostrar/ocultar botones según el nuevo rol
    if (newRole === "marco") {
      shoutbtn.style.display = "block";
    } else {
      // Para polo y polo-especial, mostrar el botón pero con comportamiento diferente
      shoutbtn.style.display = "block";
    }
    
    // Manejar botón especial del Polo Especial
    const poloEspecialBtn = document.getElementById("polo-especial-not-caught");
    if (poloEspecialBtn) {
      poloEspecialBtn.style.display = "none";
    }
    
    // Si el nuevo rol es polo-especial, crear el botón especial si no existe
    if (newRole === "polo-especial") {
      let poloEspecialBtn = document.getElementById("polo-especial-not-caught");
      if (!poloEspecialBtn) {
        poloEspecialBtn = document.createElement("button");
        poloEspecialBtn.id = "polo-especial-not-caught";
        poloEspecialBtn.textContent = "No fui atrapado (+10 pts)";
        poloEspecialBtn.style.display = "none";
        poloEspecialBtn.style.backgroundColor = "#ff6b6b";
        poloEspecialBtn.style.marginTop = "10px";
        document.getElementById("game-ground").appendChild(poloEspecialBtn);

        // Event listener para el botón del Polo Especial
        poloEspecialBtn.addEventListener("click", async () => {
          await makeRequest("/api/game/polo-especial-not-caught", "POST", {
            socketId: socket.id,
          });
          poloEspecialBtn.style.display = "none";
        });
      }
    }
    
    // Mostrar mensaje de nueva ronda
    gameMessageElement.innerHTML = `<p style="color: #667eea; font-weight: bold;">¡Nueva ronda! Tu nuevo rol es: ${newRole}</p>`;
  });

  // Event listener para botón de nueva ronda
  const restartButton = document.getElementById("restart-game");

  restartButton.addEventListener("click", async () => {
    try {
      await makeRequest("/api/game/restart", "POST", {});
    } catch (error) {
      console.error("Error al iniciar nueva ronda:", error);
      alert("Error al iniciar nueva ronda");
    }
  });
}
