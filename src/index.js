// const SimpleBar = require('simplebar');

// let isInit = false;
// function tryInitScroll() {
//   console.log(window.innerWidth);
//   if (window.innerWidth < 1024 && !isInit) {
//     isInit = true;
//     console.log('init');
//     new SimpleBar(document.body, {
//       // autoHide: false,
//       // forceVisible: 'y',
//     });
//   }
// }

// document.addEventListener('resize', _ => {
//   tryInitScroll();
// });
// tryInitScroll();

const $navs = document.getElementsByClassName('navigation');
for (const $nav of $navs) {
  $nav.addEventListener('change', e => {
    location.href = e.target.value;
  });
}

const $titles = document.getElementsByClassName('title');
const $mobileNavigation = document.getElementsByClassName('m-nav')[0];

let scrollY = window.pageYOffset;
document.addEventListener('scroll', _ => {
  const newScrollY = window.pageYOffset;
  const rect = $mobileNavigation.getBoundingClientRect();
  if (newScrollY > scrollY) {
    if ($mobileNavigation.style.position === 'fixed') {
      $mobileNavigation.style.position = 'absolute';
      $mobileNavigation.style.top = `${newScrollY}px`;
    }
    if (rect.top < -rect.height) {
      $mobileNavigation.style.top = `${newScrollY - rect.height}px`;
    }
  } else {
    if (rect.top > 0) {
      $mobileNavigation.style.top = '0px';
      $mobileNavigation.style.position = 'fixed';
    }
  }
  scrollY = newScrollY;
  updateActive();
});
updateActive();

function updateActive() {
  let activeIndex = 0;
  for (let i = 0; i < $titles.length; ++i) {
    const $title = $titles[i];
    const third = window.innerHeight / 3;
    const offset = $title.getBoundingClientRect().top - third;
    if (offset <= 0) {
      activeIndex = i;
    }
  }
  const $links = document.querySelectorAll('.nav a');
  for (const $link of $links) {
    $link.classList.remove('active');
  }
  $links[activeIndex].classList.add('active');
  const hash = $links[activeIndex].getAttribute('href');
  if (location.hash !== hash && !(location.hash === '' && hash === '#c1')) {
    history.replaceState({}, '',  hash);
  }
}
