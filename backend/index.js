const express = require("express");
const axios = require("axios");
const parsed = require("parse-duration");
const MongoClient = require("mongodb").MongoClient;
const uniqid = require("uniqid");
require("dotenv").config();
const { id } = require("date-fns/locale");

//initialise app using express
const app = express();
app.use(express.json());

//mongo client initialisation
const client = new MongoClient(
  `mongodb+srv://${process.env.user}:${process.env.password}@webhook.5p3ybaz.mongodb.net/?retryWrites=true&w=majority`,
  { useNewUrlParser: true }
);

let db = "";

client.connect((err, res) => {
  if (err) {
    throw err;
  }
  console.log("database connected");
  db = res.db("webhook-scheduler");
});

app.post("/new", (req, res) => {
  console.log(req.body);
  if ((req.body.duration || req.body.date) && req.body.url) {
    const id = uniqid();
    let date = "";
    if (req.body.date) {
      date = new Date(req.body.date).toUTCString;
      if (date === "Invalid Date") {
        return res.status("400").send({
          message: "the date entered is invalid",
        });
      }
    } else if (!isNan(parseInt(req.body.duration))) {
      date = new Date();
      date.setSeconds(date.getSeconds() + parse(req.body.duration) / 1000);
      date = date.toUTCString;
    } else {
      return res.status(400).send({
        message: "the date entered is invalid",
      });
    }
    temporaryData = {
      date: date,
      url: req.body.url,
      method: "GET",
      payload: null,
    };

    db.collection("dates").findOne({ date: date }, function (err, res) {
      if (res != null) {
        db.collection("dates").updateOne(
          { date: date },
          { $push: { IDs: id } }
        );
      } else {
        db.collection("dates").insertOne({ date: date }, { IDs: [id] });
      }
    });

    if (req.body.method == "POST") {
      temporaryData.method = "POST";
    }

    if (req.body.payload) {
      temporaryData.payload = req.body.payload;
    }

    db.collection("IDs").insertOne({ date: date, ...temporaryData });

    return res.status(200).send({
      message: id,
      scheduled: date,
    });
  } else {
    return res.status(400).send({
      message: "An ID is required",
    });
  }
});

app.post(`/cancel`, (req, res) => {
  if (req.body.id) {
    db.collection("IDs").findOne({ id: req.body.id }, function (err, kron) {
      if (kron === null) {
        return res.status(400).send({
          error: true,
          message:
            "You supplied an invalid ID - it is possible we've already sent a request 😕",
        });
      }
      db.collection("dates").updateOne(
        { date: kron.date },
        { $pull: { IDs: kron.id } }
      );
      db.collection("IDs").deleteOne({ id: kron.id });
      return res.status(200).send({
        error: false,
        message: "Cancelled it 🗑️",
      });
    });
  } else {
    return res.status(400).send({
      error: true,
      message: "An ID is required 😕",
    });
  }
});

app.listen("8000", () => console.log("you are on server 8000"));
