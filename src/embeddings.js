const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1/models';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function embedText(text, retries = 4) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(
            `${GEMINI_BASE}/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: { parts: [{ text }] } }),
            }
        );

        if (res.status === 429 && attempt < retries) {
            const wait = Math.pow(2, attempt) * 1000;
            console.warn(`Rate limited, retrying in ${wait}ms (attempt ${attempt + 1}/${retries})`);
            await sleep(wait);
            continue;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));
        return data.embedding.values;
    }
}

async function generateAnswer(context, question) {
    const res = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant. Answer the question using only the context provided. If the context does not contain enough information, say so clearly.',
                    },
                    {
                        role: 'user',
                        content: `Context:\n${context}\n\nQuestion: ${question}`,
                    },
                ],
            }),
        }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data.choices[0].message.content;
}

module.exports = { embedText, generateAnswer };