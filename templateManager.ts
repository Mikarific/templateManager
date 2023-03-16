import { CACHE_BUST_PERIOD, MAX_TEMPLATES } from './constants';
import { Template, JsonParams } from './template';



export class TemplateManager {
    alreadyLoaded: Array<string> = new Array<string>();
    whitelist: Array<string> = new Array<string>();
    blacklist: Array<string> = new Array<string>();
    templates: Array<Template> = new Array<Template>();
    responseDiffs: Array<number> = new Array<number>();

    mountPoint: Element;
    startingUrl: string;
    randomness = Math.random();

    constructor(mountPoint: Element, startingUrl: string) {
        this.mountPoint = mountPoint;
        this.startingUrl = startingUrl
        this.loadTemplatesFromJsonURL(startingUrl)
    }

    loadTemplatesFromJsonURL(url: string | URL) {
        let _url = new URL(url);
        let uniqueString = `${_url.origin}${_url.pathname}`;

        // exit if already loaded
        // exit if blacklisted
        if (this.alreadyLoaded.includes(uniqueString) || this.blacklist.includes(uniqueString))
            return;
        this.alreadyLoaded.push(uniqueString);

        console.log(`loading template from ${_url}`);
        // do some cache busting
        _url.searchParams.append("date", Math.floor(Date.now() / CACHE_BUST_PERIOD).toString(36));

        GM.xmlHttpRequest({
            method: 'GET',
            url: _url.href,
            onload: (response) => {
                // use this request to callibrate the latency to general internet requests
                let responseMatch = response.responseHeaders.match(/date:(.*)\r/i);
                if (responseMatch) {
                    let responseTime = Date.parse(responseMatch[1]);
                    this.responseDiffs.push(responseTime - Date.now());
                }
                // parse the response
                let json: JsonParams = JSON.parse(response.responseText);
                // read blacklist. These will never be loaded
                if (json.blacklist) {
                    for (let i = 0; i < json.blacklist.length; i++) {
                        this.blacklist.push(json.blacklist[i].url);
                    }
                }
                // read whitelist. These will be loaded later
                if (json.whitelist) {
                    for (let i = 0; i < json.whitelist.length; i++) {
                        this.whitelist.push(json.whitelist[i].url);
                    }
                }
                // read templates
                if (json.templates) {
                    for (let i = 0; i < json.templates.length; i++) {
                        if (this.templates.length < MAX_TEMPLATES) {
                            this.templates.push(new Template(json.templates[i], this.mountPoint, this.templates.length));
                        }
                    }
                }
            }
        });
    }

    currentSeconds() {
        let averageDiff = this.responseDiffs.reduce((a, b) => a + b, 0) / (this.responseDiffs.length)
        return (Date.now() + averageDiff) / 1000;
    }

    update() {
        let cs = this.currentSeconds()
        for (let i = 0; i < this.templates.length; i++)
            this.templates[i].update(1, this.randomness, cs);
        if (this.templates.length < MAX_TEMPLATES) {
            while (this.whitelist.length > 0) {
                this.loadTemplatesFromJsonURL(this.whitelist.shift()!)
            }
        }
    }

    restart() {
        while (this.templates.length > 0) {
            let template = this.templates.shift()
            template?.destroy()
        }
        this.alreadyLoaded = new Array<string>();
        this.loadTemplatesFromJsonURL(this.startingUrl)
    }
}