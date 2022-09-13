import Crawler from 'crawler';

// console.log(Crawler);

const c = new Crawler({
    maxConnections: 1,
    skipDuplicates: true,
    rateLimit: 1000,
    callback: (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;
            console.log(res.request.uri.href);
            
            const urls = [];
            $('a').each( (i, a) => {
                if (a.attribs.href && a.attribs.href !== '#') {
                    const url = new URL(a.attribs.href, res.request.uri.href)
                    urls.push(url.href);
                }
            });
            console.log(' -> %i links', urls.length);
            console.log(' -> %i queued', c.queueSize);
            c.queue(urls);
        }
        done();
    }
});

c.queue('http://www.amazon.at');