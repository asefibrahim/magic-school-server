const express = require('express')
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000
app.use(cors())
app.use(express.json())






const uri = `mongodb+srv://${process.env.Db_User_Name}:${process.env.Db_Pass}@cluster0.5niozn3.mongodb.net/?retryWrites=true&w=majority`;

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
        await client.connect();

        const userCollection = client.db('magicdb').collection('user')
        const classCollection = client.db('magicdb').collection('classColloection')

        const instructorCollection = client.db('magicdb').collection('InstructorCollection')
        const cartCollection = client.db('magicdb').collection('cart')



        // carts related Api
        app.post('/carts', async (req, res) => {
            try {
                const selectedUser = req.body;
                selectedUser._id = new ObjectId(); // Generate a new unique _id value
                const result = await cartCollection.insertOne(selectedUser);
                res.send(result);
            } catch (error) {
                if (error.code === 11000) {
                    res.status(400).send("Duplicate key error: _id must be unique.");
                } else {
                    res.status(500).send("Internal Server Error");
                }
            }
        });


        // InstructorRelated API
        app.get('/instructors', async (req, res) => {
            const result = await instructorCollection.find().toArray()
            res.send(result)
        })


        // Class Related API

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray()
            res.send(result)
        })



        // user related API
        app.post('/user', async (req, res) => {
            const user = req.body
            const result = await userCollection.insertOne(user)
            res.send(result)
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);









app.get('/', (req, res) => {
    res.send('Illusion is Running.................')
})

app.listen(port)