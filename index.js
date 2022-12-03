require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const port = process.env.PORT || 5000;

const app = express();

// middle ware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w79fzld.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {

        const categoryCollection = client.db('marketThriftyDB').collection('categoryOption');
        const phonesCollection = client.db('marketThriftyDB').collection('phoneCollection');
        const usersCollection = client.db('marketThriftyDB').collection('usersCollection');
        const bookingCollection = client.db('marketThriftyDB').collection('bookingCollection');
        const paymentsCollection = client.db('marketThriftyDB').collection('paymentsCollection');



        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '7d' });
            res.send({ token })
        })

        // category
        app.get('/category', async (req, res) => {
            const query = {}
            const category = categoryCollection.find(query);
            const result = await category.toArray();
            res.send(result)
        });

        // phone
        app.get('/allphones/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                categoryName: id,
                paid: { $ne: true }
            };

            const phones = phonesCollection.find(query);
            const result = await phones.toArray();
            res.send(result)
        });

        // advertised product
        app.get('/advertised-product', verifyJWT, async (req, res) => {
            const query = {
                advertised: "done",
                paid: { $ne: true }
            }
            const result = await phonesCollection.find(query).toArray();
            res.send(result)
        })

        app.put('/advertised/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertised: 'done',
                }
            }
            const result = await phonesCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // reported product
        app.get('/reported-product', async (req, res) => {
            const query = { isReported: "yes" }
            const result = await phonesCollection.find(query).toArray();
            res.send(result)
        });

        app.delete('/reported-del/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await phonesCollection.deleteOne(query);
            res.send(result)
        })

        // seller product
        app.get('/seller-product', async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email };
            const result = await phonesCollection.find(query).toArray();
            res.send(result)
        });

        app.delete('/seller-product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await phonesCollection.deleteOne(query);
            res.send(result)
        });

        app.post('/allphones', async (req, res) => {
            const phone = req.body;
            const result = await phonesCollection.insertOne(phone);
            res.send(result);
        })

        // booking 
        app.get('/booking', verifyJWT, async (req, res) => {
            const decoded = req.decoded;

            if (decoded.email !== req.query.email) {
                res.status(403).send({ message: 'unauthorized access' })
            }
            const email = req.query.email;
            const query = { email: email };
            const result = await bookingCollection.find(query).toArray();
            res.send(result)
        });

        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await bookingCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })

        // user
        app.get('/users', verifyJWT, async (req, res) => {
            const query = {}
            const users = usersCollection.find(query);
            const result = await users.toArray();
            res.send(result)
        });

        app.get('/users/add-product', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })


        // seller
        app.get('/seller', async (req, res) => {
            const query = { option: "Seller" };
            const seller = await usersCollection.find(query).toArray()
            res.send(seller)

        });

        app.put('/seller/admin/:id', verifyJWT, async (req, res) => {

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });



        app.delete('/seller/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        })

        // report
        app.put('/report/:id', verifyJWT, async (req, res) => {

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isReported: 'yes'
                }
            }
            const result = await phonesCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // payment
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const productId = payment.productId;
            const search = { _id: ObjectId(productId) };
            const updatedProduct = {
                $set: {
                    paid: true
                }
            }
            const productResult = await phonesCollection.updateOne(search, updatedProduct)
            const updatedResult = await bookingCollection.updateOne(filter, updatedDoc);
            res.send(result)
        });

        // admin
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.isAdmin === "admin" });
        });

        // seller
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.option === "Seller" });
        });

    }
    finally {

    }
}
run().catch(console.log)

app.get('/', async (req, res) => {
    res.send('Market Thrifty server is running');
})

app.listen(port, () => console.log(`Market Thrifty running on ${port}`))