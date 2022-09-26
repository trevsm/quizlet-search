const { exec } = require("child_process");
const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin,X-Requested-With,Content-Type,Accept,content-type,application/json"
    );
    next();
});

const port = process.env.PORT || 3000;

function getValues(obj, key) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == "object") {
            objects = objects.concat(getValues(obj[i], key));
        } else if (i == key) {
            objects.push(obj[i]);
        }
    }
    return objects;
}

app.post("/", (req, res) => {
    exec(
        `curl -sA "Chrome" -L "http://www.google.com/search?q=\"${req.body}\"+\"site:quizlet.com\"" | pup ":parent-of(:parent-of(a[href*="http"])) json{}"`,
        (error, stdout) => {
            if (error) {
                res.status(500).send(error);
            } else {
                const data = JSON.parse(stdout).filter(
                    (x) =>
                        x.children.length == 2 &&
                        JSON.stringify(x).includes("quizlet.com")
                );
                const final = [];
                data.map((x) => {
                    const entry = {};
                    const text = getValues(x, "text").filter(
                        (x) => x.length > 20
                    );
                    entry.title = text[0];
                    entry.tags = text[1];
                    entry.description = text[2];
                    entry.href = getValues(x, "href")[0].replace("/url?q=", "");
                    final.push(entry);
                });
                res.json(final);
            }
        }
    );
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
