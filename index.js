const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const multer = require('multer');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer();

const fileUpload = upload.single('image');

const dbUserName = process.env.DB_USER;
const dbPassWord = process.env.DB_PASSWORD;
const uri = `mongodb+srv://${dbUserName}:${dbPassWord}@cluster0.bndsovl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {

    const usersCollection = client.db('usersDB').collection('users');
    const jobsCollection = client.db('usersDB').collection('jobs');

    app.post("/users", fileUpload, async (req, res) => {
        const user = req.body;
        console.log(user);
        try {
            const result = await usersCollection.insertOne(user);
        res.send(result);
        } catch (error) {
            console.log("error posting data: ", error.message);
            res.status(400).send(error.message);
        }
    
    })

    app.post("/add-job", fileUpload, async (req, res) => {
        const job = req.body;
        job.applicantsNumber = parseInt(job.applicantsNumber);
        console.log(job);
        try {
            const result = await jobsCollection.insertOne(job);
        res.send(result);
        } catch (error) {
            console.log("error posting data: ", error.message);
            res.status(400).send(error.message);
        }
    
    })
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Server running successfully!");
})

app.listen(port, () => console.log(`Listening on port ${port}`));