import { get } from 'lodash';
import { genUID } from './utils/misc';

export default function custGeomParser(node, context, options) {
  const { size, stroke, image } = options;

  let fill = options.fill;
  let fillDef = '';
  if (fill.id) {
    fillDef = fill.def;
    fill = `url(#${fill.id})`;
  }

  const pathList = get(node, ['a:pathLst', 'a:path']);
  const pathStr = [].concat(pathList).map((path) => {
    const w = get(path, ['$', 'w']);
    const h = get(path, ['$', 'h']);
    const ptParser = (pt) => {
      const x = parseInt(get(pt, ['$', 'x']));
      const y = parseInt(get(pt, ['$', 'y']));
      return `${x / w * size.w},${y / h * size.h}`;
    };

    const d = path['$$'].map((p) => {
      switch (p['#name']) {
        case 'a:moveTo': {
          const pt = get(p, ['a:pt']);
          return `M${ptParser(pt)}`;
        }
        case 'a:lnTo': {
          const pt = get(p, ['a:pt']);
          return `L${ptParser(pt)}`;
        }
        case 'a:cubicBezTo': {
          const points = p['$$'].map(pt => ptParser(pt)).join(' ');
          return `C${points}`;
        }
        case 'a:close':
          return 'Z';
        default:
          throw new Error(`cannot find a parser for ${p['#name']} in path.`);
      }
    }).join(' ');

    return (
      `<path d="${d}" fill="${fill}" stroke="${stroke.color}" stroke-width="${
        stroke.width}" stroke-dasharray="${stroke.strokeDashArray}" />`
    );
  }).join('');

  let imageStr = '';
  if (image) {
    const clipPathID = `clip${genUID()}`;
    imageStr = `<clipPath id="${clipPathID}">${pathStr}</clipPath>`
      + `<image clip-path="url(#${clipPathID})" xlink:href="${image}">`;
  }

  return (
    `<svg class="drawing" style="width:100%;height:100%;">${fillDef}${pathStr}${imageStr}</svg>`
  );
}
