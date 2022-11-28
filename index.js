const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;
require('dotenv').config()
const jwt = require('jsonwebtoken');

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lg5fruz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "unauthorized" })
    }
    const token = authHeader.split(" ")[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "forbidden" })
        }
        req.decoded = decoded;
        next()
    });
}



// const { MongoClient } = require("mongodb");
// Replace the uri string with your MongoDB deployment's connection string.
// const uri =
//   "mongodb+srv://<user>:<password>@<cluster-url>?writeConcern=majority";
// const client = new MongoClient(uri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
async function run() {
    try {
        await client.connect();
        const carsCollection = client.db("carmania").collection("cars");
        const usersCollection = client.db("carmania").collection("users");
        const ordersCollection = client.db("carmania").collection("orders");
        //to save a user

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            let role = req.body.role;
            const name = req.body.name;
            const filter = { user: email };
            const options = { upsert: true };
            const query = { user: email }
            const gotIt = await usersCollection.findOne(query)
            if (gotIt?.role == "seller") {
                role = "seller"
            }
            const updateDoc = {
                $set: {
                    user: email,
                    role: role,
                    name: name
                }
            }
            const updateUser = await usersCollection.updateOne(filter, updateDoc, options)
            var token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN);
            res.send({ accessToken: token })
        })


        //get all cars
        app.get('/cars', async (req, res) => {
            const query = {}
            const cursor = carsCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })

        //get car by category
        //get specific part with id
        app.get('/cars/:carCategory', async (req, res) => {
            const category = req.params.carCategory
            const query = { category: category }
            const result = await carsCollection.find(query).toArray();
            res.send(result);
        })


        //for user
        //post order
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const orderCompleted = await ordersCollection.insertOne(order)
            res.send(orderCompleted)
        })
        //get specific user orders with email
        app.get('/orders/:email', verifyJwt, async (req, res) => {
            const tokenEmail = req.decoded;
            const email = req.params.email;
            if (tokenEmail.email === email) {
                const query = { email: email }
                const result = await ordersCollection.find(query).toArray()
                return res.send(result)
            }
            else {
                return res.status(403).send({ message: "forbidden" })
            }

        })
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})



