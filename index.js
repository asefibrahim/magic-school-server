const express = require('express')
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')('sk_test_51NEVNSIL22UQzT5CaIzKIRp9SuHhcyfdokzCOnVcr6My6lyaZNBnQBIpsvjB0rA6rEXizbocu7CGYznnns0WrwdO00AqcPv8oM')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000
app.use(cors())
app.use(express.json())






const uri = `mongodb+srv://${process.env.Db_User_Name}:${process.env.Db_Pass}@cluster0.5niozn3.mongodb.net/?retryWrites=true&w=majority`;

const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Token Did not found' })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.token, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: true, message: 'Token didnt match while verifying ' })
        }
        req.decoded = decoded
        next()
    })
}







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
        const paymentCollection = client.db('magicdb').collection('payment')




        // jwt 
        app.post('/jwt', async (req, res) => {
            const user = req.body
            console.log(user);
            const token = await jwt.sign(user, process.env.token, {
                expiresIn: '1h'
            })
            res.send({ token })
        })


        // carts related Api (selected class in cart)
        app.post('/carts', async (req, res) => {
            try {
                const selectedUser = req.body;
                // Generate a new unique _id value

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




        app.get('/carts', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })


        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: (id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })


        // InstructorRelated API
        app.get('/instructors', async (req, res) => {
            const result = await instructorCollection.find().toArray()
            res.send(result)
        })


        // Class Related API

        app.get('/classes', async (req, res) => {

            const instructorEmail = req.query.email
            let query = {}
            if (instructorEmail) {
                query = { email: instructorEmail }
            }
            const result = await classCollection.find(query).toArray()
            res.send(result)
        })
        app.post('/classes', async (req, res) => {
            const classInfo = req.body
            const result = await classCollection.insertOne(classInfo)
            res.send(result)
        })

        // update classs info
        app.put('/updateSeatNumber', async (req, res) => {
            const updateInfo = req.body
            const id = updateInfo._id
            console.log(updateInfo.enrolled_student);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    available_seats: updateInfo.available_seats,
                    enrolled_student: updateInfo.enrolled_student
                }
            }
            const result = await classCollection.updateOne(filter, updateDoc,)
            res.send(result)
        })


        // update class
        app.put('/classes/:id', async (req, res) => {
            const id = req.params.id
            const infoFromClient = req.body
            console.log(infoFromClient);
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const update = {
                $set: {
                    name: infoFromClient.name,
                    price: infoFromClient.price,
                    available_seats: infoFromClient.available_seats,

                }
            }
            const result = await classCollection.updateOne(query, update, options)
            res.json(result)
        })


        // user related API
        app.post('/user', async (req, res) => {
            const user = req.body
            const result = await userCollection.insertOne(user)
            res.send(result)
        })
        // payment intent 
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body
            const amount = parseInt(price * 100)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // making payment collection and delete card data
        app.post('/payments', async (req, res) => {
            const payment = req.body;


            const insertResult = await paymentCollection.insertOne(payment);

            const query = { _id: (payment.itemId) }
            const deleteResult = await cartCollection.deleteOne(query)

            res.send({ insertResult, deleteResult });
        })

        app.get('/payments', async (req, res) => {
            const email = req.query.email
            const filter = { email: email }

            const result = await paymentCollection.find(filter).toArray()
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