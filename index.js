const express = require('express')
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const itemCollection = client.db("motion-car-parts").collection("item");

      // verify Admin function:
        const verifyAdmin = async (req, res, next) => {

          const requester = req.decoded.email;
          const requesterAccount = await userCollection.findOne({email: requester});
            if (requesterAccount.role === 'admin'){
              next()
            }
            else{
              res.status(403).send({message: 'forbidden'})
            }
        }


        // Product all api
        app.get("/item", async (req, res) => {
          const query = {};
          const cursor = itemCollection.find(query);
          const products = await cursor.toArray();
          res.send(products);
        });

        app.get('/item/:id',async(req, res)=>{
          const id = req.params.id;
          const query={_id: ObjectId(id)};
          const product = await itemCollection.findOne(query);
          res.send(product);
      })

      // add new products api
      app.post('/item', async(req, res)=>{
        const newItem = req.body;
        const tokenInfo = req.header.authorization;
        const result = await itemCollection.insertOne(newItem);
        res.send(result);
      })

      // Delete products api
      app.delete('/item/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const result = await itemCollection.deleteOne(query);
        res.send(result)
      })

        // user info all Api 
        app.get('/user', verifyJWT, async(req, res)=>{
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

        // create admin user
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async(req, res)=>{
          const email = req.params.email;
          const filter = {email: email};
          const updateDoc = {
            $set: {role: 'admin'},
          };
          const result = await userCollection.updateOne(filter, updateDoc);
          res.send(result);

        })

        // admin checkup Api 
        app.get('/admin/:email', async(req, res)=>{
          const email = req.params.email;
          const user = await userCollection.findOne({email: email});
          const isAdmin = user.role === 'admin';
          res.send({admin: isAdmin})
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