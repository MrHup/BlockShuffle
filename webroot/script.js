class App {
  constructor() {
    const usernameLabel = document.querySelector("#username");

    // Send ready message to parent
    window.parent.postMessage(
      {
        type: "ready",
      },
      "*"
    );

    window.addEventListener("message", (ev) => {
      const { type, data } = ev.data;

      if (type === "devvit-message") {
        const { message } = data;

        if (message.type === "initialData") {
          const { username } = message.data;
          console.log("Username:", message.data);
          usernameLabel.innerText = username;
        } else if (message.type === "leaderboardData") {
          const leaderboardContent = document.getElementById(
            "leaderboard-content"
          );
          const { leaderboard } = message.data;

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
}

new App();
