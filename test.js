var x = require("./pubmed.js");

function callbackFunc(data) {
    console.log(data);
}

x.query("science[journal] AND breast cancer AND 2008[pdat]", 1, callbackFunc);

//x.spelling("brests cancer", callbackFunc);
