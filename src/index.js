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

document.getElementById('navigation').addEventListener('change', e => {
  location.href = e.target.value;
});

const $titles = document.getElementsByClassName('title');

document.addEventListener('scroll', _ => {
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
  if (location.hash !== hash) {
    history.replaceState({}, '',  hash);
  }
}
