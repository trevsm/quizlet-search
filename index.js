const { exec } = require("child_process");
const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const stringSimilarity = require("string-similarity");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());

app.use(cors());

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("<b>hi</b>");
});

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

function formatString(str) {
    return str
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/\s\s+/g, " ")
        .replaceAll(" ", "+")
        .trim()
        .toLowerCase();
}

function searchQuery(body) {
    const pupFilter = `:parent-of(:parent-of(a[href*="http"])) json{}`;

    return new Promise((resolve, reject) => {
        exec(
            `curl -sA "Chrome" -L "http://www.google.com/search?q=\"${body}\"+site+quizlet.com" | pup "${pupFilter}"`,
            (error, stdout) => {
                if (error) {
                    reject(error);
                } else {
                    const data = JSON.parse(stdout).filter(
                        (x) =>
                            x.children.length == 2 &&
                            JSON.stringify(x).includes("quizlet.com")
                    );
                    if (data.length == 0)
                        reject("(Google Search) No results found");
                    const final = [];
                    data.map((x) => {
                        const entry = {};
                        const text = getValues(x, "text").filter(
                            (x) => x.length > 20
                        );
                        entry.title = text[0];
                        entry.tags = text[1];
                        entry.description = text[2];
                        entry.href = getValues(x, "href")[0].replace(
                            "/url?q=",
                            ""
                        );
                        final.push(entry);
                    });
                    resolve(final);
                }
            }
        );
    });
}

function quizletQuery(url, question) {
    return new Promise((resolve, reject) => {
        const pupFilter = `.SetPageTerm-content json{}`;
        exec(
            `curl -sA "Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/81.0" -L "${url}" | pup "${pupFilter}"`,
            (error, stdout) => {
                if (error) {
                    reject(error);
                } else {
                    const data = JSON.parse(stdout);
                    if (data.length == 0)
                        reject("(Quizlet Query) No results found");
                    let final = [];
                    data.map((x) => {
                        const values = getValues(x, "text");

                        try {
                            const first = stringSimilarity
                                .compareTwoStrings(question, values[0])
                                .toFixed(2);
                            const second = stringSimilarity
                                .compareTwoStrings(question, values[1])
                                .toFixed(2);

                            if (first > 0.5 || second > 0.5) {
                                const elem = {};
                                if (first >= second) {
                                    elem.text = values[1];
                                    elem.confidence = first;
                                } else {
                                    elem.text = values[0];
                                    elem.confidence = second;
                                }
                                final.push({ ...elem });
                            }
                        } catch (e) {
                            console.log(e);
                        }
                    });
                    if (final.length == 0) reject("No results found");

                    resolve(final);
                }
            }
        );
    });
}

app.post("/", async (req, res) => {
    const body = formatString(req.body);
    try {
        const data = await searchQuery(body);
        data.splice(2);

        let final = [];
        await Promise.all(
            data.map(async (item) => {
                const nextData = await quizletQuery(item.href, req.body).catch(
                    console.log
                );
                if (nextData) final = final.concat(nextData);
            })
        );

        res.json(final);
    } catch (error) {
        res.send({ error });
    }
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
