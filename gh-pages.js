const ghpages = require('gh-pages');

ghpages.publish(
  'public', // path to public directory
  {
    branch: 'main',
    repo: 'https://github.com/JGurus/portfolio.git', // Update to point to your repository
    user: {
      name: 'JGurus', // update to use your name
      email: 'ljgurumendi@gmail.com', // Update to use your email
    },
  },
  () => {
    console.log('Deploy Complete!');
  }
);
