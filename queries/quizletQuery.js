const stringSimilarity = require("string-similarity");
const cloudscraper = require("cloudscraper");
const { parse } = require("node-html-parser");

const options = {
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    },
    followAllRedirects: true,
    challengesToSolve: 3,
};

function quizletQuery(url, question) {
    return new Promise((resolve, _reject) => {
        cloudscraper.get({ ...options, uri: url }).then((response) => {
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
                    console.log("Quizlet Error...");
                    return;
                }
            });

            resolve(final);
        });
    });
}
exports.quizletQuery = quizletQuery;
