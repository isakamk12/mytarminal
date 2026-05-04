const fs = require('fs');
const { execSync } = require('child_process');

const files = [
    { in: '俺は新卒を生贄に介護を続けてたぜ!.md', out: 'story1.html', title: '俺は新卒を生贄に介護を続けてたぜ!' },
    { in: '二十歳までに五万冊本読んだ話。.md', out: 'story2.html', title: '二十歳までに五万冊本読んだ話。' },
    { in: '三角関数或いは平坦球面.md', out: 'story3.html', title: '三角関数或いは平坦球面' }
];

const template = fs.readFileSync('article.html', 'utf8');

files.forEach(f => {
    console.log(`Processing ${f.in}...`);
    try {
        // use npx marked to convert markdown to html
        let mdHtml = execSync(`npx --yes marked "${f.in}"`).toString();
        
        // 1. Remove all <img> tags to avoid note.com avatars/images
        mdHtml = mdHtml.replace(/<img[^>]*>/gi, '');
        
        // 2. Parse Chat Dialogue for ChatGPT logs
        let lines = mdHtml.split('\n');
        let newLines = [];
        let inBubble = false;
        
        for (let line of lines) {
            if (line.match(/<p>あなた:\s*<\/p>/i)) {
                if (inBubble) newLines.push('</div></div>');
                newLines.push('<div class="chat-message user"><div class="chat-avatar"><i class="fa-solid fa-user"></i></div><div class="chat-bubble">');
                inBubble = true;
                continue;
            }
            if (line.match(/<p>ChatGPT:\s*<\/p>/i)) {
                if (inBubble) newLines.push('</div></div>');
                newLines.push('<div class="chat-message ai"><div class="chat-avatar"><i class="fa-solid fa-robot"></i></div><div class="chat-bubble">');
                inBubble = true;
                continue;
            }
            newLines.push(line);
        }
        if (inBubble) newLines.push('</div></div>');
        
        mdHtml = newLines.join('\n');

        // 3. Add callout styling hooks for "→" lines (placed as separate paragraphs in markdown)
        //    - "→..." だけじゃなく "妹･弟→..." / "私→..." みたいに先頭付近に矢印がある段落も対象
        mdHtml = mdHtml.replace(/<p>([^<]{0,12}→)/g, '<p class="md-callout">$1');
        
        // replace the loading spinner with the actual HTML content
        const targetStr = `<div class="loader">
                    <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <p style="margin-top: 1rem;">古文書を紐解いています...</p>
                </div>`;
        
        let outHtml = template.replace(targetStr, mdHtml);
        
        // update the title
        outHtml = outHtml.replace('<title>Article | Akashi Isaka</title>', `<title>${f.title} | Akashi Isaka</title>`);
        
        fs.writeFileSync(f.out, outHtml);
        console.log(`Created ${f.out}`);
    } catch (e) {
        console.error(`Failed to process ${f.in}`, e.message);
    }
});
