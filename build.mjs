import { readFile, writeFile } from 'node:fs/promises';
const read=name=>readFile(new URL(name,import.meta.url),'utf8');
const [html,css,game,app]=await Promise.all(['index.html','styles.css','game.js','app.js'].map(read));
const script=game.replace(/^export /gm,'')+'\n'+app.replace(/^import .*from '\.\/game\.js';\r?\n/,'');
const standalone=html.replace('<link rel="stylesheet" href="styles.css">',()=>`<style>\n${css}\n</style>`).replace('<script type="module" src="app.js"></script>',()=>`<script type="module">\n${script.replace(/<\/script/gi,'<\\/script')}\n</script>`);
await writeFile(new URL('frontier.html',import.meta.url),standalone);
console.log('Built frontier.html — standalone, no server required.');
