const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


//middleware
app.use(cors());
app.use(express.json());


// db connect 


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.h5guxah.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('Unauthorized access');
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden acess'})
        }
        req.decoded = decoded;
        console.log(decoded);
        next();
    })
}

async function run(){
    try{
        const bookCategoryCollection = client.db('bookExpress').collection('bookCategory');
        const singleCatBooksCollection = client.db('bookExpress').collection('singleCatBooks');
        const bookingCollection = client.db('bookExpress').collection('booking');
        const usersCollection = client.db('bookExpress').collection('users');


        app.get('/category', async(req,res)=>{
            const query = {};
            const category =await bookCategoryCollection.find(query).toArray();
            res.send(category);
        })

        app.get('/category/:id', async(req, res) => {
            const catId = req.params.id;
            const query = {cat_id:catId};
            const category = await singleCatBooksCollection.find(query).toArray();
            // console.log(category)
            res.send(category);
          });

          //getting booking

          app.get('/booking',verifyJWT, async(req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            console.log(decodedEmail);
            if(email!== decodedEmail){
                return res.status(403).send({message: 'forbidden acess'});
            }

            // console.log(email);
            const query = {email:email};
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
          });

          //save bookings
          app.post('/booking', async(req, res) =>{
            const review = req.body;
            const result = await bookingCollection.insertOne(review);
            res.send(result);
          });
          
        //  app.post('/booking',async(req, res)=>{
        //     const booking = req.body;
        //     const query = {
        //         name: booking.name,
        //         email: booking.email,
        //         phn:booking.phn,
        //         meeting:booking.meeting
        //     }
        //     const result = await bookingCollection.insertOne(booking);
        //     res.send(result);
        //  })

        // jwt token 
        app.get('/jwt', async(req, res) => {
            const email = req.query.email;
            // console.log(email);
            const query = {email:email};
            const user = await usersCollection.findOne(query);
            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1hr'})
                return res.send({accessToken:token});
            }
            res.status(403).send({accessToken: ''});
          });


        //save user
        app.post('/users', async(req, res)=>{
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })
        
        // get users 
        app.get('/users', async(req, res)=>{
            const query = {};
            const user = await usersCollection.find(query).toArray();
            res.send(user);
        })

        app.get('/users/admin/:id', async(req, res)=>{
            const email = req.params.email;
            const query ={ email };
            const user = await usersCollection.findOne(query);
            res.send({isAdmin: user?.role === 'admin'});
        })

        app.put('/users/admin/:id',verifyJWT, async(req, res)=>{
            const decodedEmail = req.decoded.email;
            const query = {email:decodedEmail};
            const user = await usersCollection.findOne(query);
            if(user?.role !== 'admin'){
                return res.status(403).send({message: 'forbidden access'})
            }
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const options = {upsert :true};
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
    }
    finally{

    }
}
run().catch(console.log);

app.get('/',async(req, res) =>{
    res.send('server running');
})

app.listen(port,() =>{
    console.log(`server running on port ${port}`);
})