class RushHour {
  constructor(grid) {
    this.exitCarId = -1;
    this.grid = grid;
    this.cars = new Map();
    this.moves = 0;
    this.exitCarId = -1;
    this.initializeCars();
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
    for (let row = 0; row < this.grid.length; row++) {
      const tr = document.createElement("tr");
      for (let col = 0; col < this.grid[row].length; col++) {
        const td = document.createElement("td");
        td.className = `cell car-${this.grid[row][col]}`;
        td.onclick = (e) => {
          const rect = td.getBoundingClientRect();
          const clickTop = e.clientY < rect.top + rect.height / 2;
          this.handleClick(row, col, clickTop);
        };
        tr.appendChild(td);
      }
      board.appendChild(tr);
    }
    const movesCounter = document.getElementById("moves");
    movesCounter.textContent = `Moves: ${this.moves}`;
  }
}

class MenuManager {
  constructor() {
    this.menuContainer = document.getElementById("menu-container");
    this.gameContainer = document.getElementById("game-container");
    this.createContainer = document.getElementById("create-container");
    this.howtoContainer = document.getElementById("howto-container");

    this.initializeListeners();
  }

  initializeListeners() {
    document
      .getElementById("play-button")
      .addEventListener("click", () => this.showScreen("game"));
    document
      .getElementById("create-button")
      .addEventListener("click", () => this.showScreen("create"));
    document
      .getElementById("howto-button")
      .addEventListener("click", () => this.showScreen("howto"));

    document
      .getElementById("back-to-menu")
      .addEventListener("click", () => this.showScreen("menu"));
    document
      .getElementById("back-from-create")
      .addEventListener("click", () => this.showScreen("menu"));
    document
      .getElementById("back-from-howto")
      .addEventListener("click", () => this.showScreen("menu"));
  }

  showScreen(screen) {
    this.menuContainer.classList.add("hidden");
    this.gameContainer.classList.add("hidden");
    this.createContainer.classList.add("hidden");
    this.howtoContainer.classList.add("hidden");

    switch (screen) {
      case "menu":
        this.menuContainer.classList.remove("hidden");
        break;
      case "game":
        this.gameContainer.classList.remove("hidden");
        console.log("Initial grid:", initialGrid);
        if (!window.gameInstance) {
          window.gameInstance = new RushHour(initialGrid);
          window.gameInstance.render();
        }
        break;
      case "create":
        this.createContainer.classList.remove("hidden");
        break;
      case "howto":
        this.howtoContainer.classList.remove("hidden");
        break;
    }
  }
}

// Initialize menu system
const menuManager = new MenuManager();

// Initialize game when needed (moved to MenuManager's showScreen method)
const initialGrid = [
  [2, 1, 1, 1, 1, 0],
  [2, 0, 0, 0, 0, 0],
  [0, -1, -1, 0, 0, 4],
  [5, 3, 3, 3, 3, 4],
  [5, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0],
];
