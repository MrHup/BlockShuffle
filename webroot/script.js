class App {
  constructor() {
    // Send ready message to parent
    window.parent.postMessage(
      {
        type: "ready",
      },
      "*"
    );
  }
}

new App();
