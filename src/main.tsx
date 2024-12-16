// import './createPost.js';
import { Devvit, useState } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
  redis: true,
});


const App: Devvit.CustomPostComponent = ({ redis, postId, ui, reddit }) => {
  const key = (postId: string | undefined): string => {
    return `leaderboard:${postId}`;
  };
  
  // Store the progress state keyed by post ID
  const [leaderboard, setLeaderboard] = useState(async () => {
    const results = await redis.zRange(`leaderboard:${postId}`, 0, 9,  { by: 'score' });
    
    return results.map(entry => ({
        member: entry.member,
        score: entry.score
    }));
  });

  const addScore = async (gameData: any) => {
    const currentUser = await reddit.getCurrentUser();
    const { gameId, score } = gameData;
    
    // Get current score if it exists
    const currentScores = await redis.zRange(`leaderboard:${postId}`, 0, -1);
    const existingScore = currentScores.find(entry => entry.member === currentUser?.username);

    console.log(`Adding score for ${currentUser?.username} with score ${score.moves}`);
    console.log(`Existing score: ${existingScore?.score}`);
    console.log(`New score: ${score.moves}`);
    console.log(`Current scores: ${currentScores.map(entry => entry.member + ': ' + entry.score)}`);
    
    // Only add if no existing score or new score is better (lower)
    if (!existingScore || score.moves < existingScore.score) {
        await redis.zAdd(`leaderboard:${postId}`, {
            score: score.moves,
            member: currentUser?.username ?? 'Anonymous',
        });
        
        // Refresh the leaderboard after adding new score
        const newLeaderboard = await redis.zRange(`leaderboard:${postId}`, 0, 9);
        setLeaderboard(newLeaderboard.map(entry => ({
            member: entry.member,
            score: entry.score
        })));
    }
  };

return (
  <vstack grow padding="small">
      <vstack grow height="100%">
          <webview
              id="myWebView"
              url="page.html"
              grow
              height="100%"
              onMessage={async (msg: any) => {
                  if (msg.type === 'showWinMessage') {
                      ui.showToast(`You win! Total moves: ${msg.data.moves}`);
                  } else if (msg.type === 'saveScore') {
                      await addScore(msg.data);
                  } else if (msg.type === 'getLeaderboard') {
                      console.log('Received leaderboard request');
                      console.log('Leaderboard:', leaderboard);
                      ui.webView.postMessage('myWebView', {
                          type: 'leaderboardData',
                          data: { leaderboard }
                      });
                  } else if (msg.type === 'ready') {
                    const currUser = await reddit.getCurrentUser();
                    const username = currUser?.username ?? 'Guest';
                    ui.webView.postMessage('myWebView', {
                      type: 'initialData',
                      data: {
                        username: username,
                      },
                    });
                  }
              }}
          />
      </vstack>
  </vstack>
);
};

Devvit.addCustomPostType({
  name: 'Progress bar backed by Redis',
  render: App,
  height: 'tall'
});

export default Devvit;