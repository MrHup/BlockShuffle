import { Devvit } from '@devvit/public-api';

// Configure Devvit's plugins
Devvit.configure({
  redditAPI: true,
  redis: true,
});

// Adds a new menu item to the subreddit allowing to create a new post
Devvit.addMenuItem({
  label: 'Create new game post',
  location: 'subreddit',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const randomId=crypto.randomUUID();
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: 'Drive away',
      subredditName: subreddit.name,
    
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading ...</text>
        </vstack>
      ),
    });
    ui.showToast({ text: 'Created post!' });
    ui.navigateTo(post);
  },
});
