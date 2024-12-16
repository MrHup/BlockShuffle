class RushHour {
  constructor(grid, gameId = crypto.randomUUID()) {
    this.gameId = gameId;
    this.grid = grid;
    this.exitCarId = -1;
    this.grid = grid;
    this.cars = new Map();
    this.moves = 0;
    this.exitCarId = -1;
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
      const top = car.positions[0].row * cellSize;
      const left = car.positions[0].col * cellSize;

      carElement.style.width =
        car.axis === "horizontal" ? `${length}px` : `${40}px`;
      carElement.style.height =
        car.axis === "vertical" ? `${length}px` : `${40}px`;
      carElement.style.top = `${top}px`;
      carElement.style.left = `${left}px`;
      carElement.style.backgroundColor = this.getCarColor(car.id);

      // Add click handler directly to car
      carElement.addEventListener("click", (e) => {
        console.log("Car clicked:", car);
        const rect = carElement.getBoundingClientRect();
        if (car.axis === "horizontal") {
          console.log("Horizontal:", car);
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
      [-1]: "#ff0000", // Exit car
    };
    return colors[id] || "#gray";
  }
}

const initialGrid = [
  [2, 1, 1, 1, 1, 0],
  [2, 0, 0, 0, 0, 0],
  [0, -1, -1, 0, 0, 4],
  [5, 3, 3, 3, 3, 4],
  [5, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0],
];

class MenuManager {
  constructor() {
    this.menuContainer = document.getElementById("menu-container");
    this.createContainer = document.getElementById("create-container");
    this.howtoContainer = document.getElementById("howto-container");
    this.leaderboardContainer = document.getElementById(
      "leaderboard-container"
    );

    this.initializeListeners();

    // Initialize game immediately
    window.gameInstance = new RushHour(initialGrid);
    window.gameInstance.render();
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

// Initialize menu system
const menuManager = new MenuManager();
