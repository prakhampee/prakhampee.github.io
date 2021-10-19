const Handlebars = require('handlebars');
const postcssConfig = require('./postcss.config.js');
const tailwindConfig = require('tailwindcss');
const compileCss = require('tailwindcss/lib/cli/compile.js').default;
const fs = require('fs');
const hashFiles = require('hash-files');
const minify = require('html-minifier').minify;
const cheerio = require('cheerio');

async function css() {
  const plugins = tailwindConfig('./tailwind.config.js').plugins;
  plugins.push(...postcssConfig.plugins);
  const result = await compileCss({
    inputFile: './src/style.css',
    plugins,
  });
  return result.css;
}

async function getData() {
  let content = fs.readFileSync('./data/content.html', 'utf8');
  const $ = cheerio.load(content);
  $('hr').remove();
  $('.title').each((i, $title) => {
    $($title).attr('id', $($title).text());
  });
  content = $('body').html();
  fs.writeFileSync('./src/content.html', content);
  const data = {
    content,
    style: await css(),
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
