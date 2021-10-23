const Handlebars = require('handlebars');
const postcssConfig = require('./postcss.config.js');
const tailwindConfig = require('tailwindcss');
const compileCss = require('tailwindcss/lib/cli/compile.js').default;
const fs = require('fs');
const hashFiles = require('hash-files');
const minify = require('html-minifier').minify;
const wordcut = require('wordcut');
const cheerio = require('cheerio');

wordcut.init('./dict/*.txt');

const BOOKS = {
    "ปฐมกาล": "GEN",
    "อพยพ": "EXO",
    "เลวีนิติ": "LEV",
    "กันดารวิถี": "NUM",
    "เฉลยธรรมบัญญัติ": "DEU",
    "โยชูวา": "JOS",
    "ผู้วินิจฉัย": "JDG",
    "นางรูธ": "RUT",
    "1 ซามูเอล": "1SA",
    "2 ซามูเอล": "2SA",
    "1 พงศ์กษัตริย์": "1KI",
    "2 พงศ์กษัตริย์": "2KI",
    "1 พงศาวดาร": "1CH",
    "2 พงศาวดาร": "2CH",
    "เอสรา": "EZR",
    "เนหะมีย์": "NEH",
    "เอสเธอร์": "EST",
    "โยบ": "JOB",
    "สดุดี": "PSA",
    "สุภาษิต": "PRO",
    "ปัญญาจารย์": "ECC",
    "เพลงซาโลมอน": "SNG",
    "อิสยาห์": "ISA",
    "เยเรมีย์": "JER",
    "เพลงคร่ำครวญ": "LAM",
    "เอเสเคียล": "EZK",
    "ดาเนียล": "DAN",
    "โฮเชยา": "HOS",
    "โยเอล": "JOL",
    "อาโมส": "AMO",
    "โอบาดีห์": "OBA",
    "โยนาห์": "JON",
    "มีคาห์": "MIC",
    "นาฮูม": "NAM",
    "ฮาบากุก": "HAB",
    "เศฟันยาห์": "ZEP",
    "ฮักกัย": "HAG",
    "เศคาริยาห์": "ZEC",
    "มาลาคี": "MAL",
    "มัทธิว": "MAT",
    "มาระโก": "MRK",
    "ลูกา": "LUK",
    "ยอห์น": "JHN",
    "กิจการ": "ACT",
    "โรม": "ROM",
    "1 โครินธ์": "1CO",
    "2 โครินธ์": "2CO",
    "กาลาเทีย": "GAL",
    "เอเฟซัส": "EPH",
    "ฟีลิปปี": "PHP",
    "โคโลสี": "COL",
    "1 เธสะโลนิกา": "1TH",
    "2 เธสะโลนิกา": "2TH",
    "1 ทิโมธี": "1TI",
    "2 ทิโมธี": "2TI",
    "ทิตัส": "TIT",
    "ฟีเลโมน": "PHM",
    "ฮีบรู": "HEB",
    "ยากอบ": "JAS",
    "1 เปโตร": "1PE",
    "2 เปโตร": "2PE",
    "1 ยอห์น": "1JN",
    "2 ยอห์น": "2JN",
    "3 ยอห์น": "3JN",
    "ยูดา": "JUD",
    "วิวรณ์": "REV",
};


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
  $('span').each((_, $span) => {
    $span = $($span);
    if (!$span.attr('class')) {
      $span.contents().unwrap();
    }
  });
  $('.title').each((_, $title) => {
    $($title).attr('id', $($title).text());
  });
  $('body').find('*').contents().filter(function() { return this.nodeType === 3; }).each(function() {
    const words = wordcut.cutIntoArray(this.data);
    let last = null;
    for (let i = 0; i < words.length; ++i) {
      let word = words[i];
      let url = null;
      let book = BOOKS[word];
      if (book) {
        const m = words.slice(i).join('').match(/^(?<book>(?:[12] )?[^ ]+) (?<chapter>\d+)(?::(?:(?<verse>\d+)(?:-(?<verse_end>\d+))?))?(?<word>;)?/);
        if (m && BOOKS[m.groups.book]) {
          let n_skip = 3;
          url = `https://my.bible.com/bible/174/${book}.${m.groups.chapter}`;
          if (m.groups.verse) {
            url += `.${m.groups.verse}`;
            if (m.groups.chapter.length >= 2) {
              n_skip += 1;
            }
            n_skip += 1;
          }
          if (m.groups.verse_end) {
            url += `-${m.groups.verse_end}`;
            n_skip += 2;
          }
          if (m.groups.word) {
            const last = m.groups.verse_end ?? m.groups.verse ?? m.groups.chapter;
            if (last.length >= 2) {
              n_skip += 1;
            }
          }
          word = words.slice(i, i + n_skip).join('');
          if (word.endsWith(';')) {
            word = word.slice(0, -1);
            words.splice(i + n_skip, 0, ';');
          }
          i += n_skip - 1;
        }
      }
      let span = $('<span>').addClass('w').text(word);
      if (url !== null) {
        span = $('<a>').addClass('w').attr('href', url).attr('target', '_blank').text(word);
      }
      if (last === null) {
        last = span;
        $(this).replaceWith(last);
      } else {
        last.after(span);
        last = span;
      }
    }
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
