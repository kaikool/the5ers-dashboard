import fs from 'fs';
import https from 'https';

const cookiesPath = 'd:\\Hermes\\the5ers\\the5ers-dashboard\\scraper\\cookies.json';
const cookiesStr = fs.readFileSync(cookiesPath, 'utf8');
const cookies = JSON.parse(cookiesStr);
const dsCookie = cookies.find(c => c.name === 'DS');
const token = dsCookie ? dsCookie.value : '';

function makeRequest(hostname, path, useBearer = false) {
    return new Promise((resolve) => {
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://hub.the5ers.com',
            'Referer': 'https://hub.the5ers.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/133.0.0.0 Safari/537.36'
        };
        if (useBearer) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            headers['Cookie'] = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        }

        const options = {
            hostname,
            port: 443,
            path,
            method: 'GET',
            headers
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', () => resolve({ status: 'error', data: '' }));
        req.end();
    });
}

async function test() {
    const urls = [
        { h: 'api.the5ers.com', p: '/api/v1/account/logins' },
        { h: 'api.the5ers.com', p: '/v1/account/logins' }
    ];

    for (const u of urls) {
        console.log(`Testing Bearer token for ${u.h}${u.p}`);
        const res = await makeRequest(u.h, u.p, true);
        console.log(`-> ${res.status}`);
        if (res.status === 200) {
            console.log(res.data.substring(0, 500));
        } else {
             console.log(res.data.substring(0, 200));
        }
    }
}

test();
