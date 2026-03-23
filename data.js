import crypto from 'crypto';

const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ENCRYPTION_PASSWORD = process.env.ENCRYPTION_PASSWORD;

// Вспомогательная функция для шифрования (AES-256-GCM)
function encryptData(data) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_PASSWORD, 'utf8'), iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    return {
        encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
    };
}

function decryptData(encryptedObj) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_PASSWORD, 'utf8'), Buffer.from(encryptedObj.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'base64'));
    let decrypted = decipher.update(encryptedObj.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}

async function getGistContent() {
    const url = `https://api.github.com/gists/${GIST_ID}`;
    const response = await fetch(url, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    if (!response.ok) throw new Error('Gist fetch failed');
    const gist = await response.json();
    const content = gist.files['data.txt']?.content || '';
    if (!content) return { users: [], requests: [], messages: [], reviews: [] };
    try {
        const encryptedObj = JSON.parse(content);
        return decryptData(encryptedObj);
    } catch (e) {
        return { users: [], requests: [], messages: [], reviews: [] };
    }
}

async function updateGistContent(data) {
    const encryptedObj = encryptData(data);
    const content = JSON.stringify(encryptedObj);
    const url = `https://api.github.com/gists/${GIST_ID}`;
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            files: { 'data.txt': { content } }
        })
    });
    if (!response.ok) throw new Error('Gist update failed');
}

export default async function handler(req, res) {
    // Разрешаем CORS для вашего домена
    res.setHeader('Access-Control-Allow-Origin', 'https://ваш-сайт.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET') {
            const data = await getGistContent();
            res.status(200).json(data);
        } else if (req.method === 'POST') {
            const newData = req.body;
            await updateGistContent(newData);
            res.status(200).json({ success: true });
        } else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}