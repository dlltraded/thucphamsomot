import fs from 'fs/promises';
import path from 'path';

const newsFile = path.join(process.cwd(), 'data', 'news.json');
const blogDir = path.join(process.cwd(), 'data', 'blog');

async function migrate() {
  await fs.mkdir(blogDir, { recursive: true });
  
  const raw = await fs.readFile(newsFile, 'utf8');
  const data = JSON.parse(raw);
  const articles = Array.isArray(data.articles) ? data.articles : [];

  for (const article of articles) {
    const slug = article.slug;
    const filePath = path.join(blogDir, `${slug}.md`);
    
    // Create frontmatter
    const frontmatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
excerpt: "${article.excerpt.replace(/"/g, '\\"')}"
category: "${article.category}"
author: "${article.author}"
publishedAt: "${article.publishedAt}"
readingTime: "${article.readingTime}"
coverImage: "${article.coverImage}"
featured: ${article.featured || false}
---

${article.content}
`;

    await fs.writeFile(filePath, frontmatter, 'utf8');
    console.log(`Created ${filePath}`);
  }
}

migrate().catch(console.error);
