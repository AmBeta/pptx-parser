import Parser from '../src';
import './styles.scss';

const $input = document.getElementById('input');
const $result = document.getElementById('result');
const parser = new Parser();

$input.addEventListener('change', async () => {
  const file = $input.files[0];
  const slides = await parser.parse(file);
  const html = slides
    .map(slide => slide.html)
    .join('');

  $result.innerHTML = html;
});
