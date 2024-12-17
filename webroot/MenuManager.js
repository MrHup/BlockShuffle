import { GridCreator } from "./GridCreator.js";
import { RushHour } from "./RushHour.js";

class MenuManager {
  constructor() {
    this.victoryContainer = document.getElementById("victory-container");
    this.menuContainer = document.getElementById("menu-container");
    this.createContainer = document.getElementById("create-container");
    this.howtoContainer = document.getElementById("howto-container");
    this.leaderboardContainer = document.getElementById(
      "leaderboard-container"
    );
    this.usernameLabel = document.querySelector("#username");

    this.initializeListeners();

    window.addEventListener("message", (ev) => {
      const { type, data } = ev.data;
      if (type === "devvit-message") {
        const { message } = data;

        if (message.type === "initialData") {
          const { username, gridData } = message.data;
          this.usernameLabel.innerText = username;

          // Initialize game immediately
          window.gameInstance = new RushHour(gridData);
          window.gameInstance.render();
        } else if (message.type === "leaderboardData") {
          const leaderboardContent = document.getElementById(
            "leaderboard-content"
          );
          const { leaderboard } = message.data;

          if (!leaderboard || leaderboard.length === 0) {
            leaderboardContent.innerHTML =
              '<div class="leaderboard-entry">No one beat this yet!</div>';
            return;
          }

          // Create leaderboard HTML
          const leaderboardHTML = leaderboard
            .map(
              (entry, index) => `
                <div class="leaderboard-entry">
                    <span>#${index + 1} ${entry.member}</span>
                    <span>${entry.score} moves</span>
                </div>
                `
            )
            .join("");

          leaderboardContent.innerHTML = leaderboardHTML;
        }
      }
    });
  }

  formatMoveHistory(moveHistory) {
    return moveHistory
      .map((move) => `(${move.from.row},${move.from.col})`)
      .join(", ");
  }

  initializeListeners() {
    document
      .getElementById("create-button")
      .addEventListener("click", () => this.showScreen("create"));
    document
      .getElementById("howto-button")
      .addEventListener("click", () => this.showScreen("howto"));
    document
      .getElementById("leaderboard-button")
      .addEventListener("click", () => this.showScreen("leaderboard"));
    document
      .getElementById("back-from-create")
      .addEventListener("click", () => this.showScreen("main"));
    document
      .getElementById("back-from-howto")
      .addEventListener("click", () => this.showScreen("main"));
    document
      .getElementById("back-from-leaderboard")
      .addEventListener("click", () => this.showScreen("main"));
    document
      .getElementById("back-from-victory")
      .addEventListener("click", () => this.showScreen("main"));
    document.getElementById("post-solution").addEventListener("click", () => {
      if (window.lastWinningSolution) {
        const formattedMoves = this.formatMoveHistory(
          window.lastWinningSolution
        );
        console.log("Solution positions:", formattedMoves);
        window.parent.postMessage(
          {
            type: "submitComment",
            data: { history: formattedMoves },
          },
          "*"
        );
      }
    });
  }

  async showLeaderboard() {
    const content = document.getElementById("leaderboard-content");
    content.innerHTML = "Loading...";

    window.parent.postMessage(
      {
        type: "getLeaderboard",
        data: {},
      },
      "*"
    );
  }

  showScreen(screen) {
    // Remove any existing overlay
    const existingOverlay = document.querySelector(".overlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    this.createContainer.classList.add("hidden");
    this.howtoContainer.classList.add("hidden");
    this.leaderboardContainer.classList.add("hidden");
    this.victoryContainer.classList.add("hidden");

    switch (screen) {
      case "main":
        break;
      case "create":
        this.createOverlay();
        this.createContainer.classList.remove("hidden");
        // Initialize the grid creator
        if (!this.gridCreator) {
          this.gridCreator = new GridCreator();
        }
        break;
      case "howto":
        this.createOverlay();
        this.howtoContainer.classList.remove("hidden");
        break;
      case "leaderboard":
        this.createOverlay();
        this.leaderboardContainer.classList.remove("hidden");
        this.showLeaderboard();
        break;
      case "victory":
        this.createOverlay();
        this.victoryContainer.classList.remove("hidden");
        break;
    }
  }

  createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    document.body.appendChild(overlay);
  }
}
