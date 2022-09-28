function formatString(str) {
    return str
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/\s\s+/g, " ")
        .replaceAll(" ", "+")
        .trim()
        .toLowerCase();
}
exports.formatString = formatString;
