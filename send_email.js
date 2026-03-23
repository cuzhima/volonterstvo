import emailjs from '@emailjs/nodejs'; // npm install @emailjs/nodejs

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'https://ваш-сайт.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { to, subject, message } = req.body;
    if (!to || !subject || !message) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        await emailjs.send(
            process.env.EMAILJS_SERVICE_ID,
            process.env.EMAILJS_TEMPLATE_ID,
            {
                to_email: to,
                subject: subject,
                message: message,
            },
            {
                publicKey: process.env.EMAILJS_PUBLIC_KEY,
                privateKey: process.env.EMAILJS_PRIVATE_KEY,
            }
        );
        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Email sending failed' });
    }
}