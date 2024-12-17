class RushHour {
  constructor(grid, gameId = crypto.randomUUID()) {
    this.gameId = gameId;
    this.grid = grid;
    this.exitCarId = -1;
    this.cars = new Map();
    this.moves = 0;
    this.exitCarId = -1;
    this.backupGrid = JSON.parse(JSON.stringify(grid));
    this.initializeCars();
  }

  async saveScore(username, moves) {
    const gameData = {
      gameId: this.gameId,
      map: this.grid,
      score: {
        username,
        moves,
        timestamp: Date.now(),
      },
    };

    // Save to Redis using sorted set
    await window.parent.postMessage(
      {
        type: "saveScore",
        data: gameData,
      },
      "*"
    );
  }

  initializeCars() {
    var _a;
    const carPositions = new Map();
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.grid[row].length; col++) {
        const cell = this.grid[row][col];
        if (cell !== 0) {
          if (!carPositions.has(cell)) carPositions.set(cell, []);
          (_a = carPositions.get(cell)) === null || _a === void 0
            ? void 0
            : _a.push({ row, col });
        }
      }
    }
    for (const [id, positions] of carPositions.entries()) {
      const axis = positions.every((pos) => pos.row === positions[0].row)
        ? "horizontal"
        : "vertical";
      this.cars.set(id, { id, positions, axis });
    }
  }

  canMove(car, direction) {
    for (const pos of car.positions) {
      let nextRow = pos.row,
        nextCol = pos.col;
      if (direction === "up") nextRow--;
      else if (direction === "down") nextRow++;
      else if (direction === "left") nextCol--;
      else if (direction === "right") nextCol++;
      if (
        nextRow < 0 ||
        nextRow >= 6 ||
        nextCol < 0 ||
        nextCol >= 6 ||
        (this.grid[nextRow][nextCol] !== 0 &&
          this.grid[nextRow][nextCol] !== car.id)
      ) {
        return false;
      }
    }
    return true;
  }

  moveCar(car, direction) {
    if (!this.canMove(car, direction)) return;
    // Clear old positions
    for (const pos of car.positions) {
      this.grid[pos.row][pos.col] = 0;
    }
    // Update positions
    car.positions = car.positions.map((pos) => {
      if (direction === "up") return { row: pos.row - 1, col: pos.col };
      if (direction === "down") return { row: pos.row + 1, col: pos.col };
      if (direction === "left") return { row: pos.row, col: pos.col - 1 };
      return { row: pos.row, col: pos.col + 1 };
    });
    // Place car in new positions
    for (const pos of car.positions) {
      this.grid[pos.row][pos.col] = car.id;
    }
    this.moves++;
    // Check if game is won
    if (car.id === this.exitCarId && car.positions.some((p) => p.col === 5)) {
      this.saveScore(
        document.getElementById("username").textContent,
        this.moves
      );
      window.parent.postMessage(
        {
          type: "showWinMessage",
          data: { moves: this.moves },
        },
        "*"
      );

      // Reset the game
      this.grid = JSON.parse(JSON.stringify(this.backupGrid));
      console.log("Game reset", this.grid);
      this.cars = new Map();
      this.moves = 0;
      this.initializeCars();
      this.render();

      // Show leaderboard
      menuManager.showScreen("leaderboard");
    }
  }

  handleClick(row, col, clickTop) {
    const carId = this.grid[row][col];
    if (!this.cars.has(carId)) return;
    const car = this.cars.get(carId);
    if (car.axis === "horizontal") {
      // For horizontal cars, compare click position with car's middle point
      const carMiddleCol =
        (car.positions[0].col + car.positions[car.positions.length - 1].col) /
        2;
      const direction = col < carMiddleCol ? "left" : "right";
      this.moveCar(car, direction);
    } else {
      // For vertical cars, use the clickTop parameter
      const direction = clickTop ? "up" : "down";
      this.moveCar(car, direction);
    }
    this.render();
  }

  render() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    const cellSize = 50;

    // Create grid for reference
    for (let row = 0; row < this.grid.length; row++) {
      const tr = document.createElement("tr");
      for (let col = 0; col < this.grid[row].length; col++) {
        const td = document.createElement("td");
        tr.appendChild(td);
      }
      board.appendChild(tr);
    }

    // Render cars
    this.cars.forEach((car) => {
      const carElement = document.createElement("div");
      carElement.className = "car";
      carElement.dataset.axis = car.axis;
      carElement.dataset.id = car.id;

      const length = car.positions.length * cellSize;
      const top =
        car.axis === "vertical"
          ? car.positions[0].row * cellSize + 2 * car.positions[0].row + 10
          : car.positions[0].row * cellSize + 2 * car.positions[0].row + 3;
      const left =
        car.axis === "horizontal"
          ? car.positions[0].col * cellSize + 2 * car.positions[0].col + 10
          : car.positions[0].col * cellSize + 3 * car.positions[0].col + 3;

      carElement.style.width =
        car.axis === "horizontal" ? `${length - 10}px` : `${40}px`;
      carElement.style.height =
        car.axis === "vertical" ? `${length - 10}px` : `${40}px`;
      carElement.style.top = `${top}px`;
      carElement.style.left = `${left}px`;
      carElement.style.backgroundColor = this.getCarColor(car.id);

      carElement.addEventListener("click", (e) => {
        const rect = carElement.getBoundingClientRect();
        if (car.axis === "horizontal") {
          const clickX = e.clientX - rect.left;
          const direction = clickX < rect.width / 2 ? "left" : "right";
          this.moveCar(car, direction);
          this.render();
        } else {
          const clickY = e.clientY - rect.top;
          const direction = clickY < rect.height / 2 ? "up" : "down";
          this.moveCar(car, direction);
          this.render();
        }
      });

      board.appendChild(carElement);
    });

    const movesCounter = document.getElementById("moves");
    movesCounter.textContent = `Moves: ${this.moves}`;
  }

  getCarColor(id) {
    const colors = {
      1: "#ff9999",
      2: "#99ff99",
      3: "#9999ff",
      4: "#ffff99",
      5: "#ff99ff",
      6: "#99ffff",
      7: "#ffcc99",
      8: "#cc99ff",
      9: "#ffccff",
      10: "#ccffcc",
      11: "#ff99cc",
      12: "#ccff99",
      13: "#99ccff",
      14: "#ffcc99",
      15: "#9999ff",
      16: "#ff9999",
      [-1]: "#ff0000", // Exit car
    };
    return colors[id] || "#gray";
  }
}

class MenuManager {
  constructor() {
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
    }
  }

  createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    document.body.appendChild(overlay);
  }
}

class GridCreator {
  constructor() {
    this.grid = Array(6)
      .fill()
      .map(() => Array(6).fill(0));
    this.nextCarId = 1;
    this.selectedCarType = null;
    this.board = document.getElementById("create-board");
    this.colors = [
      "#ffc165",
      "#99ff99",
      "#9999ff",
      "#ffff99",
      "#ff99ff",
      "#99ffff",
    ];
    this.currentColorIndex = 0;

    // Place the exit car
    this.grid[2][1] = -1;
    this.grid[2][2] = -1;

    this.initializeBoard();
    this.initializeControls();
    this.updateBoardDisplay();
  }

  initializeBoard() {
    this.board.innerHTML = "";
    for (let i = 0; i < 6; i++) {
      const row = document.createElement("tr");
      for (let j = 0; j < 6; j++) {
        const cell = document.createElement("td");
        cell.dataset.row = i;
        cell.dataset.col = j;

        cell.addEventListener("mouseover", (e) => this.handleMouseOver(e));
        cell.addEventListener("mouseout", (e) => this.handleMouseOut(e));
        cell.addEventListener("click", (e) => this.handleClick(e));

        row.appendChild(cell);
      }
      this.board.appendChild(row);
    }
  }

  initializeControls() {
    const carButtons = document.querySelectorAll(".car-select-btn");
    carButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        carButtons.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.selectedCarType = btn.dataset.type;
      });
    });

    document.getElementById("clear-grid").addEventListener("click", () => {
      this.grid = Array(6)
        .fill()
        .map(() => Array(6).fill(0));

      this.grid[2][1] = -1;
      this.grid[2][2] = -1;
      this.nextCarId = 1;
      this.updateBoardDisplay();
    });

    document.getElementById("submit-grid").addEventListener("click", () => {
      console.log("Created grid:", this.grid);
      window.parent.postMessage(
        {
          type: "submitGrid",
          data: { grid: this.grid },
        },
        "*"
      );
    });
  }

  handleMouseOver(e) {
    if (!this.selectedCarType) return;

    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);

    const cells = this.getCellsForPlacement(row, col);
    if (!cells) return;

    cells.forEach(([r, c]) => {
      const cell = this.board.rows[r].cells[c];
      if (!cell.classList.contains("occupied")) {
        cell.classList.add("highlight");
      }
    });
  }

  handleMouseOut() {
    const cells = this.board.getElementsByTagName("td");
    Array.from(cells).forEach((cell) => {
      cell.classList.remove("highlight");
    });
  }

  handleClick(e) {
    if (!this.selectedCarType) return;

    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);

    const cells = this.getCellsForPlacement(row, col);
    if (!cells || !this.canPlaceCar(cells)) return;

    this.placeCar(cells);
    this.updateBoardDisplay();
  }

  getCellsForPlacement(row, col) {
    const [orientation, length] = this.selectedCarType.split("");
    const cells = [];

    if (orientation === "h") {
      if (col + parseInt(length) > 6) return null;
      for (let i = 0; i < length; i++) {
        cells.push([row, col + i]);
      }
    } else {
      if (row + parseInt(length) > 6) return null;
      for (let i = 0; i < length; i++) {
        cells.push([row + i, col]);
      }
    }

    return cells;
  }

  canPlaceCar(cells) {
    return cells.every(([r, c]) => this.grid[r][c] === 0);
  }

  getCurrentColor() {
    if (this.nextCarId === -1) return "#ff0000"; // Exit car color
    return this.colors[this.currentColorIndex];
  }

  placeCar(cells) {
    cells.forEach(([r, c]) => {
      this.grid[r][c] = this.nextCarId;
    });
    this.nextCarId++;
    this.currentColorIndex = (this.currentColorIndex + 1) % this.colors.length;
  }

  updateBoardDisplay() {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        const cell = this.board.rows[i].cells[j];
        const value = this.grid[i][j];
        cell.classList.toggle("occupied", value !== 0);

        if (value !== 0) {
          cell.style.backgroundColor =
            value === -1
              ? "#ff0000"
              : this.colors[Math.abs(value - 1) % this.colors.length];
        } else {
          cell.style.backgroundColor = "";
        }
      }
    }
  }

  canPlaceCar(cells) {
    return cells.every(([r, c]) => {
      // Don't allow placing over the exit car
      if (this.grid[r][c] === -1) return false;
      return this.grid[r][c] === 0;
    });
  }
}

// Initialize menu system
const menuManager = new MenuManager();
