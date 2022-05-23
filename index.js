const express = require('express')
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gmx3d.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//Verify Token-----------------//
function verifyJWT(req, res, next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'UnAuthorize access'});
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
    if(err){
      console.log(err)
      return res.status(403).send({message: 'Forbidden access'})
    }
    req.decoded = decoded;
    next();
  });
}

async function run(){

    try{
        await client.connect();
        console.log('database connected')
        const userCollection = client.db('motion-car-parts').collection('user');
        const productCollection = client.db("motion-car-parts").collection("products");



        // Product all api
        app.get("/product", async (req, res) => {
          const query = {};
          const cursor = itemCollection.find(query);
          const products = await cursor.toArray();
          res.send(products);
        });

        app.get('/product/:id',async(req, res)=>{
          const id = req.params.id;
          const query={_id: ObjectId(id)};
          const product = await itemCollection.findOne(query);
          res.send(product);
      })

        // user info all Api 
        app.get('/user', async(req, res)=>{
          const users = await userCollection.find().toArray();
          res.send(users)
        })

        app.put('/user/:email', async(req, res)=>{
            const email = req.params.email;
            const user = req.body;
            const filter = {email: email};
            const options = {upsert: true};
            const updateDoc = {
              $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({email:email}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '7d'});
            res.send({result, token });
  
          })

    }
    finally{

    }

}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello Motion car parts')
})

app.listen(port, () => {
  console.log(`Motion app listening on port ${port}`)
})