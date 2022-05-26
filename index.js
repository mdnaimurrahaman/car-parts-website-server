const express = require('express')
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
        const reviewCollection = client.db("motion-car-parts").collection("reviews");
        const orderCollection = client.db("motion-car-parts").collection("orders");
        const paymentCollection = client.db("motion-car-parts").collection("payments");

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

        // Payment api
        app.post("/create-payment-intent", verifyJWT, async (req, res) => {
          const order = req.body;
          const price = order.price;
          const amount = price*100;
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method_types:['card']
          });
          res.send({clientSecret: paymentIntent.client_secret})
        });


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

      // all order get api

      app.get("/order",verifyJWT, verifyAdmin, async (req, res) => {
        const query = {};
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      });

       // Order get api
       app.get('/order',verifyJWT, async(req,res)=>{
        const email = req.query.email;
        const decodedEmail = req.decoded.email;
        if(email === decodedEmail){
        const query = {email:email} ;
        const cursor = orderCollection.find(query)
        const order = await cursor.toArray()
        res.send(order)
        }
        else{
          return res.status(403).send({message: 'forbidden access'});
        }
      });

      // id to find order api
      app.get('/order/:id',verifyJWT, async(req,res)=>{
        const id = req.params.id;
        const query = {_id:ObjectId(id)} ;
        const order = await orderCollection.findOne(query)
        res.send(order)
      });
      
      // order patch api
      app.patch('/order/:id',verifyJWT, async(req,res)=>{
        const id = req.params.id;
        const payment = req.body;
        console.log(payment)
        const filter = {_id:ObjectId(id)} ;
        const updatedDoc = {
          $set: {
            paid: true,
            transactionId: payment.transactionId,
          }
        }
        const result = await paymentCollection.insertOne(payment);
        const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
        res.send(updatedDoc)
      });

      //Order Api
      app.post('/order', verifyJWT, async(req,res)=>{
        const newOrder = req.body ;
        const result = await orderCollection.insertOne(newOrder)
        res.send(result)
      })

      // user Order delete api
      


      // reviews api
      app.get('/review' , async(req,res)=>{
        const query = {} ;
        const cursor = reviewCollection.find(query)
        const reviews = await cursor.toArray()
        res.send(reviews)
      })

      app.post('/review' , async(req,res)=>{
        const newReview = req.body ;
        const result = await reviewCollection.insertOne(newReview)
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