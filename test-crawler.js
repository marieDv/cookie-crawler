import Crawler from 'crawler';
let counter = 0;

const c = new Crawler({
    maxConnections: 1,
    rateLimit: 4000,
    priorityRange: 5,
    callback: (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;
            const urls = [];
            $('a').each( (i, a) => {
                if (a.attribs.href && a.attribs.href !== '#') {
                    const url = new URL(a.attribs.href, res.request.uri.href)
                    urls.push(url.href);
                    counter++;
                    if(i<=10){
                      // extractData($("body").text(), url.href);
                    }
                
                }
            });
            c.queue(urls);
        }
        done();
    }
});

c.queue('http://www.amazon.at');