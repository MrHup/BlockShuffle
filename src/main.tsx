import './createPost.js';
import { Devvit, useState } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
});

interface Message {
  type: string;
  data: {
      moves: number;
  };
}

Devvit.addCustomPostType({
  name: 'Rush Hour Game',
  height: 'tall',
  render: (context) => {
      const [messageStatus] = useState(async () => {
          const currUser = await context.reddit.getCurrentUser();
          const username = currUser?.username ?? 'Guest';
          
          context.ui.webView.postMessage('myWebView', {
              type: 'initialData',
              data: {
                  username: username,
              },
          });
          return true; // Return a value to satisfy JSONValue requirement
      });

      return (
          <vstack grow padding="small">
              <vstack grow height="100%">
                  <webview
                      id="myWebView"
                      url="page.html"
                      grow
                      height="100%"
                      onMessage={(msg: unknown) => {
                        const { type, data: { moves } } = msg as Message;
                        if (type === 'showWinMessage') {
                          context.ui.showToast(`You win! Total moves: ${moves}`);
                        }
                      }}
                  />
              </vstack>
          </vstack>
      );
  },
});

export default Devvit;