const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");

const { formatString } = require("./tools/formatString");
const { searchQuery } = require("./queries/searchQuery");
const { quizletQuery } = require("./queries/quizletQuery");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());

app.use(cors());

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("<b>hi</b>");
});

app.post("/", async (req, res) => {
    const body = formatString(req.body);
    try {
        const links = await searchQuery(body);
        links.splice(4);

        let final = [];

        await Promise.all(
            links.map(async (link) => {
                const nextData = await quizletQuery(link, req.body).catch(
                    () => {}
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
