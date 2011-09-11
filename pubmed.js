/*
    XML Examples

    http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=11748933,11700088&retmode=xml - Return results

    http://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=science[journal]+AND+breast+cancer+AND+2008[pdat] - Query

    http://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi?dbfrom=pubmed&id=9298984&cmd=neighbor - Related Documents

    http://www.ncbi.nlm.nih.gov/entrez/eutils/espell.fcgi?db=pubmed&term=brest+cancer - Spelling Correction.
*/

var http = require('http');
var url = require('url');
var libxmljs = require("libxmljs");

var hostname = "eutils.ncbi.nlm.nih.gov";
var hostport = 80;

var queryTemplate = "/entrez/eutils/esearch.fcgi?db=pubmed&term={{terms}}&retmax={{limit}}";

var dataTemplate = "/entrez/eutils/efetch.fcgi?db=pubmed&id={{idlist}}&retmode=xml";

var spellingTemplate = "/entrez/eutils/espell.fcgi?db=pubmed&term={{terms}}";

function httpGet(path, callback) {

    var client = http.createClient(hostport, hostname);

    var headers = {
        'Host': 'eutils.ncbi.nlm.nih.gov',
        'Content-Type': 'application/xml'
    };

    var request = client.request('GET', path, headers);
    request.content = null;

        request.on('response', function(response) {

            response.on('data', function(chunk) {

                if (request.content == null) request.content = chunk;
                
                else request.content += chunk;

            });

            response.on('end', function() {

                callback(request.content);

            });
    });

    request.end();
}

function template(data, dict) {

    for (var e in dict) data = data.replace("{{" + e + "}}", dict[e]);

    return data;
}

function getValue(o, n) {

    var val = o.get(n);

    if (val == undefined || val == null) return null;

    return val.text();

}

function getValues(o, n) {
    var vals = o.find(n);
    var ret = [];
    if (vals == undefined || vals == null) return ret

    for (var valIndex in vals) {
    
        var val = vals[valIndex];

        ret.push(val.text());
    }

    return ret;
}


function getAuthorsList(entries) {
    var authors = []
    for (var entryIndex in entries) {
        var entry = entries[entryIndex];
        var author = {};

        author["Initials"] = getValue(entry, "Initials");

        author["ForeName"] = getValue(entry, "ForeName");

        author["LastName"] = getValue(entry, "LastName");

        authors.push(author);
    }
    return authors;
}

function getMeshHeadings(entries) {
    var headings = []

    for (var entryIndex in entries) {
        var entry = entries[entryIndex];
        var heading = {};

        heading["descriptorname"] = getValue(entry, "DescriptorName");

        heading["qualifiers"] = getValues(entry, "QualifierName");

        headings.push(author);
    }
    return headings;
}

function getDate(o, n) {
    var yearPart = o.get(n + "/Year");
    var monthPart = o.get(n + "/Month");
    var dayPart = o.get(n + "/Day");
    if (yearPart == undefined || yearPart == null) return null;
    if (monthPart == undefined || monthPart == null) return null;
    if (dayPart == undefined || dayPart == null) return null;
    return yearPart.text() + "/" + monthPart.text() + "/" + dayPart.text();
}


exports.query = function (q, l, callback) {
    if (callback == null || callback == undefined) return;
    var urlString = template(queryTemplate, {"terms": escape(q), "limit": l});

    httpGet(urlString, function (data) {
        console.log(data);
        var idXml = libxmljs.parseXmlString(data);
        var ids = idXml.find('/eSearchResult/IdList/Id');
        var idsStr = "";
        for (var idIndex in ids) idsStr +=ids[idIndex].text() + ",";
        idsStr = idsStr.substring(0, idsStr.length -1);

            httpGet(template(dataTemplate, {"idlist": idsStr}), function(info) {

                var dataSet = [];

                var dataXml = libxmljs.parseXmlString(info);

                var entries = dataXml.find('/PubmedArticleSet/PubmedArticle/MedlineCitation');

                for (var entryIndex in entries) {
                    var dataEntry = {};
                    var entry = entries[entryIndex];

                    dataEntry["id"] = getValue(entry, "PMID");

                    dataEntry["title"] = getValue(entry, "Article/ArticleTitle");

                    dataEntry["createddate"] = getDate(entry, "DateCreated");

                    dataEntry["completeddate"] = getDate(entry, "DateCompleted");

                    dataEntry["reviseddate"] = getDate(entry, "DateRevised");

                    dataEntry["meshheadings"] = getAuthorsList(entry.find('MeshHeadingList/MeshHeading'));

                    var article = entry.get("Article");

                    dataEntry["abstract"] = getValue(article, "Abstract/AbstractText");

                    dataEntry["journal"] = getValue(article, "Journal/Title");

                    dataEntry["affiliation"] = getValue(article, "Affiliation");

                    dataEntry["language"] = getValue(article, "Language");

                    dataEntry["authors"] = getAuthorsList(article.find('AuthorList/Author'));

                    dataEntry["publicationtypes"] = getValues(article, "PublicationTypeList/PublicationType");

                    dataSet.push(dataEntry);
                }

                callback(dataSet);

            });

    });
};

exports.spelling = function (q, callback) {
    if (callback == null || callback == undefined) return;
    var urlString = template(spellingTemplate, {"terms": escape(q)});
    httpGet(urlString, function (data) {
        var idXml = libxmljs.parseXmlString(data.toString());
        var val = idXml.get('/eSpellResult/CorrectedQuery');
        if (val == undefined || val == null) return q;
        callback(val.text());
    });
};
