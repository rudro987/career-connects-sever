const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173'
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const upload = multer();

const fileUpload = upload.single("image");

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

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if(!token){
    return res.status(401).send({message: 'Unauthorized Access'});
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({message: 'Forbidden Access'});
    }
    req.user = decoded;
    next();
  });
}

async function run() {
  try {
    const usersCollection = client.db("usersDB").collection("users");
    const jobsCollection = client.db("usersDB").collection("jobs");
    const appliedJobsCollection = client
      .db("usersDB")
      .collection("appliedJobs");

    app.get("/all-jobs", async (req, res) => {
      try {
        const cursor = await jobsCollection.find().toArray();
        res.send(cursor);
      } catch (error) {
        console.log("error getting all jobdata: ", error.message);
        res.status(400).send(error.message);
      }
    });

    app.get("/all-jobs/:id",verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log("error getting single jobdata: ", error.message);
        res.status(400).send(error.message);
      }
    });

    app.get("/applied-jobs", verifyToken, async (req, res) => {
      try {
        let query = {};
        if(req.user?.email){
          query = { email: req.user.email };
        }
        const cursor = await appliedJobsCollection.find(query).toArray();
        res.send(cursor);
      } catch (error) {
        console.log("error getting applied jobdata: ", error.message);
        res.status(400).send(error.message);
      }
    });

    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      }).send({success: true});    
    });

    app.post('/logout', async(req, res) => {
      const user = req.body;
      res.clearCookie('token', { maxAge: 0 }).send({success: true});
    });

    app.post("/users", fileUpload, async (req, res) => {
      const user = req.body;
      try {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.log("error posting data: ", error.message);
        res.status(400).send(error.message);
      }
    });

    app.post("/add-job", fileUpload, async (req, res) => {
      const job = req.body;
      job.applicantsNumber = parseInt(job.applicantsNumber);
      try {
        const result = await jobsCollection.insertOne(job);
        res.send(result);
      } catch (error) {
        console.log("error posting data: ", error.message);
        res.status(400).send(error.message);
      }
    });

    app.post("/applied-jobs", async (req, res) => {
      const appliedJob = req.body;
      try {
        const result = await appliedJobsCollection.insertOne(appliedJob);
        const jobId = appliedJob.jobId;
        const query = { _id: new ObjectId(jobId) };
        const update = await jobsCollection.updateOne(query, {
          $inc: { applicantsNumber: 1 },
        });
        res.send(result);
      } catch (error) {
        console.log("error posting data: ", error.message);
        res.status(400).send(error.message);
      }
    });

    app.delete("/my-jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/my-jobs/:id", async (req, res) => {
      const id = req.params.id;
      const updateJob = req.body;
      updateJob.applicantsNumber = parseInt(updateJob.applicantsNumber);

      const query = { _id: new ObjectId(id) };
      try {
        const result = await jobsCollection.updateOne(query, { $set: updateJob });
        res.send(result);
      } catch (error) {
        console.error("Error updating job:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
      }
      
    //   const update = {
    //     $set: {
    //       title: updateJob.title,
    //       description: updateJob.description,
    //       location: updateJob.location,
    //       salary: updateJob.salary,
    //       applicantsNumber: updateJob.applicantsNumber,
    //     },
    //   };
    //   const result = await jobsCollection.updateOne(query, update);
      
    });

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
});

app.listen(port, () => console.log(`Listening on port ${port}`));
