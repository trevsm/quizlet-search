const { exec } = require("child_process");
const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const stringSimilarity = require("string-similarity");
const cloudscraper = require("cloudscraper");
const { parse } = require("node-html-parser");

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
        cloudscraper.get(url).then((response) => {
            const root = parse(response);
            const cardList = root.querySelectorAll(".SetPageTerm-content");

            let final = [];

            cardList.forEach((card) => {
                const wordText = card.querySelector(
                    ".SetPageTerm-wordText"
                ).text;

                const definitionText = card.querySelector(
                    ".SetPageTerm-definitionText"
                ).text;

                try {
                    const wordSimilarity = stringSimilarity.compareTwoStrings(
                        wordText,
                        question
                    );

                    const defSimilarity = stringSimilarity.compareTwoStrings(
                        wordText,
                        question
                    );

                    const bestSimilarity = (
                        wordSimilarity > defSimilarity
                            ? wordSimilarity
                            : defSimilarity
                    ).toFixed(2);

                    if (bestSimilarity > 0.5) {
                        if (wordText.length > definitionText.length) {
                            final.push({
                                answer: definitionText,
                                question: wordText,
                                confidence: bestSimilarity,
                            });
                        } else {
                            final.push({
                                answer: wordText,
                                question: definitionText,
                                confidence: bestSimilarity,
                            });
                        }
                    }
                } catch (e) {
                    console.log(e);
                    return;
                }
            });

            resolve(final);
        });
    });
}

app.post("/", async (req, res) => {
    const body = formatString(req.body);
    try {
        const data = await searchQuery(body);
        data.splice(4);

        let final = [];

        await Promise.all(
            data.map(async (item) => {
                const nextData = await quizletQuery(item.href, req.body).catch(
                    console.log
                );
                if (nextData) final = final.concat(nextData);
            })
        );

        final.sort((a, b) => a.confidence < b.confidence);

        res.json(final);
    } catch (error) {
        res.send({ error });
    }
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
