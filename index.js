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
                    reject({ error: "Google CURL error: " + error });
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
        exec(`curl -sA "Chrome" -L "${url}" `, (error, stdout) => {
            resolve(stdout);
            // if (error) {
            //     reject({ error: "Quizlet CURL error: " + error });
            // } else {
            //     const data = JSON.parse(stdout);
            //     if (data.length == 0)
            //         reject("(Quizlet Query) No results found");
            //     let final = [];
            //     data.map((x) => {
            //         const values = getValues(x, "text");

            //         try {
            //             if (!values[0] || !values[1]) throw "Invalid data";

            //             const first = stringSimilarity
            //                 .compareTwoStrings(question, values[0])
            //                 .toFixed(2);
            //             const second = stringSimilarity
            //                 .compareTwoStrings(question, values[1])
            //                 .toFixed(2);

            //             if (first > 0.5 || second > 0.5) {
            //                 if (first > second) {
            //                     final.push({
            //                         question: values[0],
            //                         answer: values[1],
            //                     });
            //                 } else {
            //                     final.push({
            //                         question: values[1],
            //                         answer: values[0],
            //                     });
            //                 }
            //             }
            //         } catch (e) {
            //             console.log(e);
            //         }
            //     });
            //     if (final.length == 0) reject("No results found");

            //     resolve(final);
            // }
        });
    });
}

app.post("/", async (req, res) => {
    const body = formatString(req.body);
    try {
        // const data = await searchQuery(body);

        const data = await quizletQuery(
            "https://quizlet.com/35958825/marketing-quiz-4-flash-cards/",
            body
        ).catch(console.log);
        res.json(data);

        //     let final = [];
        //     await Promise.all(
        //         data.map(async (item) => {
        //             const nextData = await quizletQuery(item.href, body).catch(
        //                 (e) => {}
        //             );
        //             if (nextData) final = final.concat(nextData);
        //         })
        //     );
        //     if (final.length == 0) throw "No results found";

        //     res.json(final);
    } catch (error) {
        res.send({ error });
    }
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
