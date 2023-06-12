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

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.token, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
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
        // await client.connect();

        const userCollection = client.db('magicdb').collection('user')
        const classCollection = client.db('magicdb').collection('classColloection')

        const instructorCollection = client.db('magicdb').collection('InstructorCollection')
        const cartCollection = client.db('magicdb').collection('cart')
        const paymentCollection = client.db('magicdb').collection('payment')

        // verify Admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        // verify Instructor
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            console.log(user);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }


        // jwt 
        app.post('/jwt', (req, res) => {
            const user = req.body
            console.log(user);
            const token = jwt.sign(user, process.env.token, {
                expiresIn: '1h'
            })
            res.send({ token })
        })
        // get instructor data

        app.get('/instructors', async (req, res) => {
            const result = await instructorCollection.find().toArray()
            res.send(result)
        })

        // carts related Api (selected class in cart)
        app.post('/carts', async (req, res) => {
            try {
                const selectedUser = req.body;

                console.log(selectedUser);
                // Generate a new unique _id value
                selectedUser._id = new ObjectId();
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




        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email

            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            console.log(decodedEmail);
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }




            const query = { email: email }
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })


        app.delete('/carts/delete/:id', async (req, res) => {
            const id = req.params.id
            console.log(id);
            const query = { _id: new ObjectId(id) }


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
            const result = await classCollection.find(query).sort({ enrolled_student: -1 }).toArray()
            res.send(result)
        })
        app.post('/classes', verifyJWT, verifyInstructor, async (req, res) => {
            const classInfo = req.body
            const result = await classCollection.insertOne(classInfo)
            res.send(result)
        })

        // update classs info
        app.patch('/updateSeatNumber', async (req, res) => {
            const updateInfo = req.body
            const classId = updateInfo.classId
            console.log(updateInfo);
            console.log(updateInfo.enrolled_student);
            const filter = { classId: classId }
            const updateDoc = {
                $set: {
                    available_seats: updateInfo.available_seats,
                    enrolled_student: updateInfo.enrolled_student
                }
            }
            const result = await classCollection.updateOne(filter, updateDoc,)
            res.send(result)
        })



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
        // delete instructor Class

        app.delete('/classes/instructorClass/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await classCollection.deleteOne(query)
            res.send(result)
        })


        // update approved status 

        app.patch('/classes/:id', async (req, res) => {

            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'approved'
                }
            }
            const result = await classCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        // denied status
        app.patch('/classes/denied/:id', async (req, res) => {

            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateInfo = {
                $set: {
                    status: 'denied'
                }
            }
            const result = await classCollection.updateOne(filter, updateInfo)
            res.send(result)
        })
        // send feedback
        app.patch('/classes/feedback/:id', async (req, res) => {
            const feedback = req.body
            console.log(feedback);
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateInfo = {
                $set: {
                    feedback: feedback.text
                }
            }
            const result = await classCollection.updateOne(filter, updateInfo)
            res.send(result)
        })

        // user related API
        app.post('/user', async (req, res) => {
            const user = req.body
            const query = { email: user?.email }
            const alreadyExist = await userCollection.findOne(query)
            if (alreadyExist) {
                return res.send({ message: 'user already exist' })
            }

            const result = await userCollection.insertOne(user)
            res.send(result)
        })


        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        // make Admin

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        //  get the admin

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email


            const query = { email: email }
            const user = await userCollection.findOne(query)
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })

        // make instructor
        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'instructor'
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        // get instructor 
        app.get('/users/instructor/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const instructor = await userCollection.findOne(query)
            const result = { instructor: instructor?.role === 'instructor' }
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

            const query = { _id: new ObjectId(payment.itemId) }
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