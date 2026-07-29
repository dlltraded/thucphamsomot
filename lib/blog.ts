import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const blogDir = path.join(process.cwd(), 'data', 'blog');

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt: string;
  readingTime: string;
  coverImage: string;
  featured: boolean;
  contentHtml?: string;
};

export function getBlogSlugs() {
  if (!fs.existsSync(blogDir)) {
    return [];
  }
  return fs.readdirSync(blogDir).filter((file) => file.endsWith('.md'));
}

export async function getBlogPostBySlug(slug: string, includeContent = true): Promise<BlogPost | null> {
  const realSlug = slug.replace(/\.md$/, '');
  const fullPath = path.join(blogDir, `${realSlug}.md`);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const post: BlogPost = {
    slug: realSlug,
    title: data.title || '',
    excerpt: data.excerpt || '',
    category: data.category || 'Blog',
    author: data.author || 'TPS1',
    publishedAt: data.publishedAt || new Date().toISOString(),
    readingTime: data.readingTime || '3 phút',
    coverImage: data.coverImage || '/images/tps1-quality.jpg',
    featured: data.featured === true,
  };

  if (includeContent) {
    const processedContent = await remark()
      .use(html)
      .process(content);
    post.contentHtml = processedContent.toString();
  }

  return post;
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const slugs = getBlogSlugs();
  const posts = await Promise.all(slugs.map((slug) => getBlogPostBySlug(slug, false)));
  
  const validPosts = posts.filter((post): post is BlogPost => post !== null);
  
  return validPosts.sort((post1, post2) => {
    if (post1.featured !== post2.featured) {
      return post1.featured ? -1 : 1;
    }
    return new Date(post2.publishedAt).getTime() - new Date(post1.publishedAt).getTime();
  });
}

export function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
