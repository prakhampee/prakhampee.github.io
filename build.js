const Handlebars = require('handlebars');
const postcssConfig = require('./postcss.config.js');
const tailwindConfig = require('tailwindcss');
const compileCss = require('tailwindcss/lib/cli/compile.js').default;
const fs = require('fs');
const hashFiles = require('hash-files');
const minify = require('html-minifier').minify;
const wordcut = require('wordcut');
const cheerio = require('cheerio');
const AdmZip = require('adm-zip');

wordcut.init('./dict/*.txt');

const BOOKS = [
  ['ยอห์น', '/', 15],
  ['วิวรณ์', '/rev/', 5],
];

const BOOK_MAP = {
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
    inputFile: './build/style.css',
    plugins,
  });
  return result.css;
}

async function processBook(book, path, lastChapter) {
  const zip = new AdmZip(`./book/${book}.zip`);
  let content = zip.readAsText('index.html');
  const $ = cheerio.load(content);
  $('.title:first').prevAll().remove();
  const $unwantedTitle = $(`.title:contains(${lastChapter + 1})`);
  $unwantedTitle.nextAll().remove();
  $unwantedTitle.remove();
  $('hr').remove();
  $('span').each((_, $span) => {
    $span = $($span);
    if (!$span.attr('class')) {
      $span.contents().unwrap();
    }
  });
  const $mobileNav = $('<div>').addClass('m-nav');
  const $ul = $('<ul>').addClass('nav');
  const $books = $('<select>').addClass('navigation');
  for (const [name, path, _] of BOOKS) {
    const $option = $('<option>').val(path).text(name);
    if (name === book) {
      $option.attr('selected', '');
    }
    $books.append($option);
  }
  $mobileNav.append($books.clone());
  $ul.append($('<li>').html($books));
  $('.title').each((_, $title) => {
    const title = $($title).text();
    const id = 'c' + title.replace(/[^0-9]*/g, '');
    $($title).attr('id', id);
    $ul.append($('<li>').append($('<a>').attr('href', `#${id}`).text(title)));
  });
  $('body').find('*').contents().filter(function() { return this.nodeType === 3; }).each(function() {
    const words = wordcut.cutIntoArray(this.data);
    let last = null;
    for (let i = 0; i < words.length; ++i) {
      let word = words[i];
      let url = null;
      let book = BOOK_MAP[word];
      if (book) {
        const m = words.slice(i).join('').match(/^(?<book>(?:[12] )?[^ ]+) (?<chapter>\d+)(?::(?:(?<verse>\d+)(?:-(?<verse_end>\d+))?)|[^. ](?:[^*]|$)|$)(?<word>;)?/);
        if (m && BOOK_MAP[m.groups.book]) {
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
      let span = $('<span>').text(word);
      if (word.trim()) {
        span.addClass('w');
      }
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
  $('body').prepend($ul).prepend($mobileNav);
  const style = [];
  const css = $('style').html().replace(/\n/g, '');
  for (const m of css.matchAll(/(.c[0-9]{1,2})\{[^{}]*vertical-align:super/g)) {
    style.push(`${m[1]} { @apply align-top text-xs }`);
  }
  for (const m of css.matchAll(/(.c[0-9]{1,2})\{[^{}]*font-size:(\d+)/g)) {
    const size = +m[2];
    if (size === 9) {
      style.push(`${m[1]} { @apply align-top text-sm }`);
    }
  }
  for (const m of css.matchAll(/(.c[0-9]{1,2})\{[^{}]*margin-left:(\d+)/g)) {
    const margin = +m[2];
    if (margin >= 72) {
      style.push(`${m[1]} { @apply ml-16; }`);
    } else if (margin >= 36) {
      style.push(`${m[1]} { @apply ml-8; }`);
    }
  }
  for (const m of css.matchAll(/(.c[0-9]{1,2})\{(?:[^{]+;)?color:#660000/g)) {
    style.push(`${m[1]} { @apply text-red; }`);
  }
  for (const m of css.matchAll(/(.c[0-9]{1,2})\{(?:[^{]+;)?height:(\d+)/g)) {
    style.push(`${m[1]} { @apply h-4; }`);
  }
  const cssContent = fs.readFileSync('./src/style.css', 'utf8') + style.join('\n');
  fs.writeFileSync('./build/style.css', cssContent);
  content = $('body').html();
  const javascript = fs.readFileSync('./build/build.js', 'utf8');
  fs.writeFileSync('./build/index.html', content);
  const data = {
    content,
    javascript,
    style: await compileTailwind(),
  };
  fs.mkdirSync(`./public${path}`, { recursive: true });
  compile('./src/index.html', `./public${path}index.html`, data);
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
  fs.mkdirSync(`./build`, { recursive: true });
  require('esbuild').build({
    entryPoints: ['./src/index.js'],
    bundle: true,
    minify: true,
    outfile: './build/build.js',
  }).catch(() => process.exit(1));
  for (const [book, path, lastChapter] of BOOKS) {
    await processBook(book, path, lastChapter);
  }
  console.log(new Date());
}

main();
