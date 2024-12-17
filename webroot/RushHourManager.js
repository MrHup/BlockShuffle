export class RushHour {
  constructor(grid, menuManager, gameId = crypto.randomUUID()) {
    this.gameId = gameId;
    this.menuManager = menuManager;
    this.grid = grid;
    this.exitCarId = -1;
    this.cars = new Map();
    this.moves = 0;
    this.moveHistory = [];
    this.exitCarId = -1;
    this.backupGrid = JSON.parse(JSON.stringify(grid));
    this.initializeCars();

    document.getElementById("reset-button").addEventListener("click", () => {
      this.resetGame();
    });
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

  resetGame() {
    this.grid = JSON.parse(JSON.stringify(this.backupGrid));
    this.cars = new Map();
    this.moves = 0;
    this.moveHistory = [];
    this.initializeCars();
    this.render();
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

    // Record the move
    const clickedPosition =
      direction === "right" || direction === "down"
        ? car.positions[0] // First position for right/down moves
        : car.positions[car.positions.length - 1]; // Last position for left/up moves

    this.moveHistory.push({
      carId: car.id,
      from: clickedPosition,
      direction: direction,
    });

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
      const currentScore = this.moves;
      document.getElementById("current-score").textContent = currentScore;

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
      const winningSolution = [...this.moveHistory];
      this.resetGame();

      this.menuManager.showScreen("victory");
      window.lastWinningSolution = winningSolution;
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
