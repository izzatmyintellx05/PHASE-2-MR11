const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createApp } = require('./server/app');

const app = createApp();
const port = Number(process.env.PORT) || 3000;

app.locals.ready()
  .then(() => {
    app.listen(port, () => console.log(`[shellflow] Running on http://localhost:${port}`));
  })
  .catch(err => {
    console.error(`[shellflow] Could not start: ${err.message}`);
    process.exit(1);
  });
