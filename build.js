const Handlebars = require('handlebars');
const postcssConfig = require('./postcss.config.js');
const tailwindConfig = require('tailwindcss');
const compileCss = require('tailwindcss/lib/cli/compile.js').default;
const fs = require('fs');
const hashFiles = require('hash-files');
const minify = require('html-minifier').minify;
const cheerio = require('cheerio');

async function compileTailwind() {
  const plugins = tailwindConfig('./tailwind.config.js').plugins;
  plugins.push(...postcssConfig.plugins);
  const result = await compileCss({
    inputFile: './data/style.css',
    plugins,
  });
  return result.css;
}

async function getData() {
  let content = fs.readFileSync('./data/content.html', 'utf8');
  const $ = cheerio.load(content);
  $('hr').remove();
  $('.title').each((_, $title) => {
    $($title).attr('id', $($title).text());
  });
  const style = [];
  const css = $('style').html().replace(/\n/g, '');
  for (const m of css.matchAll(/(.c[0-9]{1,2}) \{[^{]+margin-left: (\d+)/g)) {
    const margin = +m[2];
    if (margin >= 72) {
      style.push(`${m[1]} { @apply ml-16; }`);
    } else if (margin >= 36) {
      style.push(`${m[1]} { @apply ml-8; }`);
    }
  }
  for (const m of css.matchAll(/(.c[0-9]{1,2}) \{[^{]+[^-]color: #660000/g)) {
    style.push(`${m[1]} { @apply text-red; }`);
  }
  for (const m of css.matchAll(/(.c[0-9]{1,2}) \{[^{]+[^-]height: (\d+)/g)) {
    style.push(`${m[1]} { @apply h-4; }`);
  }
  const cssContent = fs.readFileSync('./src/style.css', 'utf8') + style.join('\n');
  fs.writeFileSync('./data/style.css', cssContent);
  content = $('body').html();
  fs.writeFileSync('./src/content.html', content);
  const data = {
    content,
    style: await compileTailwind(),
  };
  return data;
}

function compile(source, destination, data) {
  const html = fs.readFileSync(source, 'utf8');
  const template = Handlebars.compile(html);
  let result = template(data);
  result = minify(result, {
    collapseWhitespace: true,
    collapseBooleanAttributes: true,
    caseSensitive: true,
    decodeEntities: true,
    minifyCSS: true,
    removeComments: true,
    removeAttributeQuotes: true,
    quoteCharacter: '"',
    useShortDoctype: true,
    removeOptionalTags: true,
  });
  fs.writeFileSync(destination, result);
}

async function main() {
  const data = await getData();
  compile('./src/index.html', './public/index.html', data);
  let files = fs.readdirSync('./public');
  files = files.filter(filename => filename !== 'manifest.appcache' && filename !== 'impressum');
  files.sort();
  const hash = hashFiles.sync({
    files: files.map(file => './public/' + file),
    noGlob: true,
  });
  const manifest = `CACHE MANIFEST\n# ${hash}\n` + files.join('\n');
  fs.writeFileSync('./public/manifest.appcache', manifest);
  console.log(new Date());
}

main();
