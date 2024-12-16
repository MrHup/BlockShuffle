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
    
    return results.length > 0 ? results.map(entry => ({
      member: entry.member,
      score: entry.score
    })) : [];
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

  // Given a matrix, save it under the given key
  const saveMatrix = async (matrix: any, key: string) => {
    await redis.set(key, JSON.stringify(matrix));
  };

  // Default grid
  const defaultMatrix = [
    [2, 1, 1, 1, 1, 0],
    [2, 0, 0, 0, 0, 0],
    [0, -1, -1, 0, 0, 4],
    [5, 3, 3, 3, 3, 4],
    [5, 0, 0, 0, 0, 0],
    [5, 0, 0, 0, 0, 0],
  ];

  // Given a key, return the saved matrix or default one if not found
  const getMatrix = async (key: string) => {
    const matrix = await redis.get(key);
    return matrix ? JSON.parse(matrix) : defaultMatrix;
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
                        gridData: await getMatrix('grid:' + postId),
                      },
                    });
                  } else if (msg.type == 'submitGrid')
                  {
                    const gridData = msg.data.grid;
                    const subreddit = await reddit.getCurrentSubreddit();
                    const post = await reddit.submitPost({
                      title: 'Can you move the red car to the exit?',
                      subredditName: subreddit.name,
                    
                      preview: (
                        <vstack height="100%" width="100%" alignment="middle center">
                          <text size="large">Loading...</text>
                        </vstack>
                      ),
                      
                    });
                    await saveMatrix(gridData, `grid:${post.id}`);

                    ui.showToast({ text: 'Created post!' });
                    ui.navigateTo(post);

                  }
              }}
          />
      </vstack>
  </vstack>
);
};

Devvit.addCustomPostType({
  name: 'Can you move the red car to the exit?',
  render: App,
  height: 'tall'
});


Devvit.addMenuItem({
  label: 'Create new test post',
  location: 'subreddit',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: 'Can you move the red car to the exit?',
      subredditName: subreddit.name,
    
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading ??</text>
        </vstack>
      ),
      
    });
    ui.showToast({ text: 'Created post!' });
    ui.navigateTo(post);
  },
});


export default Devvit;