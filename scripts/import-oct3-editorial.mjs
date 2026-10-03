import fs from 'node:fs';
import path from 'node:path';
const [sourceFile,imageDirectory,contentDirectory,publicImageDirectory]=process.argv.slice(2);
if(!sourceFile||!imageDirectory||!contentDirectory||!publicImageDirectory)throw new Error('Usage: node scripts/import-oct3-editorial.mjs <batch.md> <images> <content/es> <public/images/articles>');
const entries=fs.readFileSync(sourceFile,'utf8').split(/^## Editorial Report — /m).slice(1);
if(entries.length!==15)throw new Error(`Expected 15 articles, found ${entries.length}.`);
const articles=entries.map(entry=>{const match=entry.match(/\n---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*?)(?=\r?\n## Fuentes|$)/);if(!match)throw new Error('Could not parse editorial entry.');const frontmatter=match[1].replace(/^date:\s*"(\d{4}-\d{2}-\d{2})"\s*$/m,'date: "$1T08:00:00+02:00"');const slug=frontmatter.match(/^slug:\s*"([^"]+)"/m)?.[1];const image=frontmatter.match(/^heroImage:\s*"([^"]+)"/m)?.[1];if(!slug||!image)throw new Error('Missing slug or image.');return {slug,image:path.basename(image),source:`---\n${frontmatter}\n---\n\n${match[2].trim()}\n`};});
for(const article of articles){const target=path.join(contentDirectory,`${article.slug}.md`);if(fs.existsSync(target))throw new Error(`Article already exists: ${article.slug}`);const sourceImage=path.join(imageDirectory,article.image);if(!fs.existsSync(sourceImage))throw new Error(`Missing image ${article.image}`);}
fs.mkdirSync(contentDirectory,{recursive:true});fs.mkdirSync(publicImageDirectory,{recursive:true});for(const article of articles){fs.copyFileSync(path.join(imageDirectory,article.image),path.join(publicImageDirectory,article.image));fs.writeFileSync(path.join(contentDirectory,`${article.slug}.md`),article.source);}
console.log(`Imported ${articles.length} October 3 articles and images.`);
