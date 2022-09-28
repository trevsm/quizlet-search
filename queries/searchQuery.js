const cloudscraper = require("cloudscraper");
const { parse } = require("node-html-parser");

function searchQuery(body) {
    return new Promise((resolve, _reject) => {
        cloudscraper
            .get(`http://www.google.com/search?q=\"${body}\"+site+quizlet.com`)
            .then((response) => {
                const root = parse(response);
                let elements = root.querySelectorAll("a");
                elements = elements
                    .filter((elem) => {
                        const href = elem.getAttribute("href");
                        return (
                            href &&
                            href.includes("http") &&
                            href.includes("quizlet.com")
                        );
                    })
                    .map((elem) => {
                        // const parent = elem.parentNode.parentNode;
                        const link = elem
                            .getAttribute("href")
                            .replace(/\/search|url?q=/i, "");
                        return link;
                    });

                resolve(elements);
            });
    });
}
exports.searchQuery = searchQuery;
