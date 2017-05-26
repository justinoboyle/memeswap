import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import cryptoRandomString from 'crypto-random-string';
import fileUpload from 'express-fileupload';
import cookieParser from 'cookie-parser';

const dataDir = path.join(__dirname, '../images/');
const collectionDir = path.join(__dirname, '../collection/');

if (!fs.existsSync(collectionDir))
    fs.mkdir(collectionDir);

function addToCollection(user, id, then) {
    let coll = [];
    fs.readFile(collectionDir + user + '.json', (err, file) => {
        if (!err)
            coll = JSON.parse(file);
        if (coll.indexOf(id) < 0)
            coll.push(id);
        fs.writeFile(collectionDir + user + '.json', JSON.stringify(coll), (err, file) => {
            return then(coll);
        })
    })
}

function getCollection(user, then) {
    let coll = [];
    fs.readFile(collectionDir + user + '.json', (err, file) => {
        if (!err)
            coll = JSON.parse(file);

        return then(coll);
    })
}

const app = express();

app.use(cookieParser());

app.use(fileUpload());

app.use((req, res, next) => {
    if (!req.cookies.collectionid) {
        let coll = cryptoRandomString(32);
        res.cookie('collectionid', coll);
        req.userid = coll;
        return next();
    }
    req.userid = req.cookies.collectionid;
    return next();
})

app.use((req, res, next) => {
    getCollection(req.userid, coll => {
        req.collection = coll;
        return next();
    });
})

app.use('/img', express.static(dataDir));

app.get('/', (req, res) => res.send(`
    <h1>MemeSwap</h1>
    <hr />
    <b>Upload a meme, and recieve a meme!</b> <br />
    <button onclick="window.location.href='/collection">View my collection</button> <br />
    <form ref='meme'
      id='meme'
      action='/upload'
      method='post'
      encType="multipart/form-data">
        <input type="file" name="meme" /><br />
        <input type='submit' value='Submit meme' />
    </form>
`));

app.post('/upload', (req, res) => {
    if (!req.files)
        return res.json({ error: "No meme file a" }).status(503);

    if (!req.files.meme)
        return res.json({ error: "No meme file b" }).status(503);

    let theMeme = req.files.meme;
    let fileExtension = theMeme.name.split('.').pop();

    if (['png', 'jpg', 'gif', 'webm'].indexOf(fileExtension) < 0)
        return res.json({ error: "Unsupported file type" }).status(503);

    let newName = cryptoRandomString(100) + `.${fileExtension}`;

    let newPath = path.join(dataDir + newName);
    theMeme.mv(newPath, err => {
        if (err)
            res.json({ error: "Uploading file error" }).status(503);
        fs.readdir(dataDir, (err, items) => {
            if (err)
                return res.send('Sorry, we couldn\'t find another meme for you. <script>setTimeout(() => window.location.href="/", 5000);</script>');
            let meme = items[Math.floor(Math.random() * items.length)];
            addToCollection(req.userid, meme, then => res.redirect(`/meme/${meme}`))
        })
    })
});

app.get('/collection', (req, res) => {
    res.send(`
    <h1>Meme collection</h1>
    ${
        req.collection.map(o =>
            `<a href="/meme/${escape(o)}"><img src="/img/${escape(o)}" width="500" /></a>`
        ).join('')
    }<br />
    Upload another meme: <br/>
    <form ref='meme'
      id='meme'
      action='/upload'
      method='post'
      encType="multipart/form-data">
        <input type="file" name="meme" /><br />
        <input type='submit' value='Submit meme' />
    </form>
    `)
})


app.get('/meme/:memeURI', (req, res) => res.send(`
    <h1>MemeSwap</h1>
    <hr />
    <img src="/img/${escape(req.params.memeURI)}" /><br />
    <button onclick="window.location.href='/collection">View my collection</button> <br />
    Upload another meme: <br/>
    <form ref='meme'
      id='meme'
      action='/upload'
      method='post'
      encType="multipart/form-data">
        <input type="file" name="meme" /><br />
        <input type='submit' value='Submit meme' />
    </form>
`));

app.get('/')

app.listen(process.env.PORT || 1937);
