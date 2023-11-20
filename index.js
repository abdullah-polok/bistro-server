const express = require('express')
const cors = require('cors')
const app = express();
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


///middle ware
app.use(cors())
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0veicth.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        ///collection
        const menuCollection = client.db('bisttroDb').collection('menu')
        const reviewsCollection = client.db('bisttroDb').collection('reviews')
        const cartCollection = client.db('bisttroDb').collection('carts')
        const userCollection = client.db('bisttroDb').collection('users')



        ////jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body  ///come from frontEnd
            const token = jwt.sign(
                user,
                process.env.Access_TOKEN,
                { expiresIn: '1hr' }
            )
            res.send({ token })
        })

        ////middleware for verify token
        const verifyToken = (req, res, next) => {
            const headerTaken = req.headers.authorization ///come from local storage which have a access-token
            console.log(headerTaken)
            if (!req.headers.authorization) {///if authorization token not available
                return res.status(401).send({ message: 'forbidden access' })
            }
            // 'split the token  from  Bearer and token'
            const token = req.headers.authorization.split(' ')[1]

            ////verify jwt 
            jwt.verify(token, process.env.Access_TOKEN, (error, decoded) => {
                if (error) {
                    return res.status(401).send({ message: 'forbidden access' })
                }
                req.decoded = decoded;
                next()
            })
        }






        ////User related api

        app.get('/users', verifyToken, async (req, res) => {
            // const headerTaken = req.headers ///come from local storage which have a access-token
            // console.log(headerTaken)
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        ////check user is admin or not
        app.get('/user/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query)
            let admin = false;
            if (user) {
                admin = user?.role === "admin";
            }
            res.send({ admin })
        })

        app.post('/users', async (req, res) => {
            const user = req.body
            ///insert email id user doesn't exists:
            //we can do this many ways (email unique,upsert,simple checking )

            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })

            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })


        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        ///update a user for make admin that user
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: "admin"
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)

        })




        ///get all data of menu
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result)
        })

        ///get all data of review
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result)
        })


        ///post api for cart 
        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem)
            res.send(result)
        })

        ///get email query data of carts
        app.get('/carts', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })

        ///delete specific user in the carts from database
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })




        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Server is running')
})


app.listen(port, () => {
    console.log(`Bistro restaurent is running on the port ${port}`)
})




// 