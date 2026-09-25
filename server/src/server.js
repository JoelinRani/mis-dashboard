const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { PORT, DATA_FOLDER } = require('./config');
const apiRouter = require('./routes/api');

const app = express();
app.use(cors());
app.use('/api', apiRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dataFolder: DATA_FOLDER });
});

// If the Angular app has been built (client/dist/client/browser), serve it
// from this same process so IT only needs to run one service. In local dev
// (ng serve on :4200 with the proxy.conf.json), this block is simply unused.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist', 'client', 'browser');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`Serving Angular build from: ${clientDist}`);
} else {
  console.log('No Angular build found yet (client/dist/client/browser) - API-only mode.');
}

app.listen(PORT, () => {
  console.log(`Park MIS Dashboard server listening on port ${PORT}`);
  console.log(`Reading department workbooks from: ${DATA_FOLDER}`);
});
