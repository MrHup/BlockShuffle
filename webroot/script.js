class App {
  constructor() {
    const usernameLabel = document.querySelector("#username");

    // When the Devvit app sends a message
    window.addEventListener("message", (ev) => {
      const { type, data } = ev.data;

      // Reserved type for messages sent via `context.ui.webView.postMessage`
      if (type === "devvit-message") {
        const { message } = data;

        // Load initial data
        if (message.type === "initialData") {
          const { username } = message.data;
          usernameLabel.innerText = username;
        }
      }
    });
  }
}

new App();
