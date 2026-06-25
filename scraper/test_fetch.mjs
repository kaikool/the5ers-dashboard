import fs from 'fs';

const cookiesPath = 'd:\\Hermes\\the5ers\\the5ers-dashboard\\scraper\\cookies.json';
const cookiesStr = fs.readFileSync(cookiesPath, 'utf8');
const cookies = JSON.parse(cookiesStr);
const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

async function testFetch() {
    try {
        const response = await fetch('https://api.the5ers.com/api/v1/account/logins', {
            method: 'GET',
            headers: {
                'Cookie': cookieHeader,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/133.0.0.0 Safari/537.36'
            }
        });
        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", text.substring(0, 500));
    } catch (err) {
        console.error(err);
    }
}

testFetch();
