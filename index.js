const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000

const app = express()

app.use(cors());
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pfltcdv.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect()
        const productCollection = client.db('easybid_products').collection('products');
        const userCollection = client.db('easybid_users').collection('users');
        const orderCollection = client.db('easybid_orders').collection('orders');



        // Function for jwt
        function verifyJWT(req, res, next) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: "Unauthorize access" })
            }
            const token = authHeader.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
                if (err) {
                    return res.status(403).send({ message: "forbidden access" })
                }
                req.decoded = decoded;
                next()
            });
        }

        //Function for admin verify
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next()
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }


        // for Admin
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // Admin permission
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })


        //Function for Vendor verify
        const verifyVendor = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'vendor') {
                next()
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }



        // for vendor
        app.put('/user/vendor/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'vendor' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // vendor permission
        app.get('/vendor/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isVendor = user.role === 'vendor';
            res.send({ vendor: isVendor })
        })




        // for all users
        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true }

            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token })
        })



        //update User
        app.get('/profile/:email', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const proUsers = await userCollection.findOne(query)
            res.send(proUsers)
        })


        app.delete('/user/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })


        // update profile

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const updateProfile = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    education: updateProfile.education,
                    about: updateProfile.about,
                    city: updateProfile.location,
                    country: updateProfile.location,
                    phone: updateProfile.phone,
                    LinkedIn: updateProfile.phone
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })


        // For products
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query)
            res.send(product)
        })

        // Delete Product
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query)
            res.send(result)
        })

        // Post Product
        app.post('/product', async (req, res) => {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send(result);
        })


        app.put('/item/:id', async (req, res) => {
            const id = req.params.id;
            const updatePrice = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    price: updatePrice.price
                }
            };
            const result = await productCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })


        // API for My items
        app.get('/items', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = productCollection.find(query);
                const items = await cursor.toArray();
                res.send(items)
            }
            else {
                res.status(403).send({ message: 'Forbidden access' })
            }
        })

        // Delete Product
        app.delete('/items/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query)
            res.send(result)
        })


        // API for order
        app.get('/order', verifyJWT, async (req, res) => {
            const userEmail = req.query.userEmail;
            const decodedEmail = req.decoded.email;
            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const order = await orderCollection.find(query).toArray();
                return res.send(order);
            }
            else {
                return res.status(403).send({ message: "forbidden access" })
            }
        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })

        app.get('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order)
        })



        // for all users
        app.get('/orders', verifyJWT, async (req, res) => {
            const order = await orderCollection.find().toArray()
            res.send(order)
        })

        //API for update order
        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment)
            const updateOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc)
        })

        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query)
            res.send(result)
        })

        //Payment API
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });


    }
    finally {

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello from easy bid')
})

app.listen(port, () => {
    console.log(`easy bid app listening on port ${port}`)
})