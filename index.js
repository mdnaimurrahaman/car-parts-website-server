const express = require('express')
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello Motion car parts')
})

app.listen(port, () => {
  console.log(`Motion app listening on port ${port}`)
})