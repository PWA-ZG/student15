const express = require('express');
const path = require('path');
const fs = require("fs");
const fse = require('fs-extra');
const {setVapidDetails, sendNotification} = require("web-push");
const httpPort = 3000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const NOTES_PATH = "notes.json"

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});


app.get("/notes", function (req, res) {
    const parsedNotes = JSON.parse(fs.readFileSync(NOTES_PATH));
    console.log(parsedNotes)
    res.setHeader('Content-Type', 'application/json').json({ "notes": parsedNotes });
});

app.post("/save-note",  async function (req, res) {
    const newNote = req.body;
    let existingNotes = JSON.parse(fs.readFileSync(NOTES_PATH));
    console.log(existingNotes)
    existingNotes.push(newNote);
    fse.writeJsonSync(NOTES_PATH, existingNotes);
    res.status(201).json({ text: newNote.text });
    await sendPushNotifications();
});


let subscriptions = [];
const SUBS_FILENAME = 'subscriptions.json';
try {
    subscriptions = JSON.parse(fs.readFileSync(SUBS_FILENAME));
} catch (error) {
    console.error(error);
}

app.post("/saveSubscription", function(req, res) {
    console.log(req.body);
    let sub = req.body.sub;
    subscriptions.push(sub);
    fs.writeFileSync(SUBS_FILENAME, JSON.stringify(subscriptions));
    res.json({
        success: true
    });
});
async function sendPushNotifications() {
    setVapidDetails(
        'mailto:lukica.hr@gmail.com',
        'BCw5LfqIyXbwcaItMBCYpuXtw2LDF8km1GR_ey0VRLCgJLHSnY0Hr9QqG2BFcorfevEgFp5e2fnloi7CgXXFWcg',
        'T63lxzHQbs23hpEtaivO7Xnxft1xOyX-x9POJ-FJzVo');
    for (const sub of subscriptions) {
        try {
            console.log("Sending notif to", sub);
            await sendNotification(sub, JSON.stringify({
                title: 'New note!',
                body: 'Somebody just added a new note',
                redirectUrl: '/'
            }));
        } catch (error) {
            console.error(error);
        }
    }
}


app.listen(httpPort, function () {
    console.log(`HTTP listening on port: ${httpPort}`);
});
