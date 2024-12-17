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
