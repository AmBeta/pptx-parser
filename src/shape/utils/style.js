import { get } from 'lodash';
import Color from 'tinycolor2';
import { emu2px } from './units';
import { genUID } from './misc';

function applyColorFilters(value, filters = []) {
  if (!value || !filters.length) return value;
  // if (!value.startsWith('#') && !value.startsWith('rgb')) value = `#${value}`;

  let color = Color(value);
  // apply color filters
  filters.forEach((filterNode) => {
    const filter = filterNode['#name'].slice(2);
    const value = get(filterNode, ['$', 'val']);
    switch (filter) {
      case 'alpha': {
        const alpha = +value;
        color = color.setAlpha(alpha);
        break;
      }
      case 'shade': {
        // FIXME: 计算方法与协议不一致，从测试结果推断出该公式
        const shade = (100 - value / 1000) / 2;
        color = Color.mix(color, 'black', shade);
        break;
      }
      case 'tint': {
        // FIXME: 计算方法与协议不一致，从测试结果推断出该公式
        const tint = (100 - value / 1000) / 2;
        color = Color.mix(color, 'white', tint);
        break;
      }
      case 'satMod': {
        const ratio = value / 100000;
        const hslClr = color.toHsl();
        color = Color(Object.assign(hslClr, { s: hslClr.s * ratio }));
        break;
      }
      case 'satOff': {
        const offset = value / 100000;
        const hslClr = color.toHsl();
        color = Color(Object.assign(hslClr, { s: hslClr.s + offset }));
        break;
      }
      case 'lumMod': {
        const ratio = value / 100000;
        const hslClr = color.toHsl();
        color = Color(Object.assign(hslClr, { l: hslClr.l * ratio }));
        break;
      }
      case 'lumOff': {
        const offset = value / 100000;
        const hslClr = color.toHsl();
        color = Color(Object.assign(hslClr, { l: hslClr.l + offset }));
        break;
      }
      default:
        // eslint-disable-next-line no-console
        console.warn('missing color filter', filter);
    }
  });

  return color.toHex8String();
}

function parseSchemeClr(node, context, phClr) {
  const theme = context.fileInfo.theme;
  const schemeName = get(node, ['$', 'val']);
  // place holder color: use color defined in styles
  if (schemeName === 'phClr' && phClr) {
    return applyColorFilters(phClr, node['$$']);
  }
  // predefined theme color
  const schemeClr = ({
    'tx1': 'dk1',
    'tx2': 'dk2',
    'bg1': 'lt1',
    'bg2': 'lt2',
  })[schemeName] || schemeName;
  const clrNode = get(theme, ['a:theme', 'a:themeElements', 'a:clrScheme', `a:${schemeClr}`]);
  const color = getNodeColor(clrNode, context);
  return color;
}

export function parseColorNode(node, type, context, styles = {}) {
  let color = get(node, ['$', 'val']);
  switch (type.slice(2)) {
    case 'srgbClr': {
      color = `#${color}`;
      break;
    }
    case 'schemeClr': {
      const styleColor = styles.color;
      color = parseSchemeClr(node, context, styleColor);
      break;
    }
    case 'prstClr': {
      color = ({
        'white': 'FFF',
        'black': '000',
      })[color] || color;
      break;
    }
    case 'sysClr': {
      color = get(node, ['$', 'lastClr']);
      break;
    }
  }

  if (!color.startsWith('#') && !color.startsWith('rgb')) {
    color = `#${color}`;
  }

  return applyColorFilters(color, node['$$']);
}

function parseSolidFill(node, context, styles) {
  const color = getNodeColor(node, context, styles);
  return color;
}

function parseGradFill(node, context, styles, isSVG) {
  const gsLst = get(node, ['a:gsLst', '$$'], []);
  const stops = gsLst.map((gs) => {
    const pos = get(gs, ['$', 'pos']) / 100000;
    const color = getNodeColor(gs, context, styles);
    return { pos, color };
  });

  // Linear Gradient
  if (node['a:lin']) {
    const angle = get(node, ['a:lin', '$', 'ang']) / 60000 + 90;
    if (isSVG) {
      const colorStops = stops
        .map(stop => `<stop offset="${stop.pos * 100}%" stop-color="${stop.color}" />`)
        .join('');
      // ref: https://codepen.io/NV/pen/jcnmK
      const angleToPoints = (angle) => {
        const segment = Math.floor(angle / Math.PI * 2) + 2;
        const diagonal = (1/2 * segment + 1/4) * Math.PI;
        const op = Math.cos(Math.abs(diagonal - angle)) * Math.sqrt(2);
        const x = op * Math.cos(angle);
        const y = op * Math.sin(angle);
        return {
          x1: x < 0 ? 1 : 0,
          y1: y < 0 ? 1 : 0,
          x2: x >= 0 ? x : x + 1,
          y2: y >= 0 ? y : y + 1,
        };
      };
      const { x1, y1, x2, y2 } = angleToPoints(angle);
      const gradID = `grad${genUID()}`;
      return {
        id: gradID,
        def: `<linearGradient id="${gradID}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" >${
          colorStops}</linearGradient>`,
      };
    } else {
      const colorStops = stops
        .map(stop => `${stop.color} ${stop.pos * 100}%`)
        .join(',');
      return `linear-gradient(${angle}deg,${colorStops})`;
    }
  }

  return '';
}

export function getNodeColor(node, context, styles = {}) {
  const colorNodeTypes = [
    'a:prstClr', 'a:srgbClr', 'a:schemeClr', 'a:sysClr'
  ];
  for (let i = 0, len = colorNodeTypes.length; i < len; i++) {
    const colorNodeType = colorNodeTypes[i];
    const colorNode = node[colorNodeType];
    if (colorNode) {
      return parseColorNode(colorNode, colorNodeType, context, styles);
    }
  }
  return '';
}

export function getNodeFill(node, context, styles = {}, isSVG) {
  if (!node) return;

  if (node['a:solidFill']) {
    return parseSolidFill(node['a:solidFill'], context, styles, isSVG);
  }
  if (node['a:gradFill']) {
    return parseGradFill(node['a:gradFill'], context, styles, isSVG);
  }
  return '';
}

export function parseLn(node, context, styles) {
  // get line width
  let width = parseInt(get(node, ['$', 'w'])) / 12700;
  if (Number.isNaN(width)) width = 0.1; // line width default to 0.1

  // get line color
  let color = getNodeFill(node, context, styles);
  // if (!color) color = '#fff'; // line color default to white

  // get line stroke
  let borderType = get(node, ['a:prstDash', '$', 'val'], '');
  let strokeDashArray = '0';
  switch (borderType) {
    case 'solid':
      borderType = 'solid';
      strokeDashArray = '0';
      break;
    case 'dash':
      borderType = 'dashed';
      strokeDashArray = '5';
      break;
    case 'dashDot':
      borderType = 'dashed';
      strokeDashArray = '5, 5, 1, 5';
      break;
    case 'dot':
      borderType = 'dotted';
      strokeDashArray = '1, 5';
      break;
    case 'lgDash':
      borderType = 'dashed';
      strokeDashArray = '10, 5';
      break;
    case 'lgDashDotDot':
      borderType = 'dashed';
      strokeDashArray = '10, 5, 1, 5, 1, 5';
      break;
    case 'sysDash':
      borderType = 'dashed';
      strokeDashArray = '5, 2';
      break;
    case 'sysDashDot':
      borderType = 'dashed';
      strokeDashArray = '5, 2, 1, 5';
      break;
    case 'sysDashDotDot':
      borderType = 'dashed';
      strokeDashArray = '5, 2, 1, 5, 1, 5';
      break;
    case 'sysDot':
      borderType = 'dotted';
      strokeDashArray = '2, 5';
      break;
    default:
      break;
  }

  return {
    width: `${width}pt`,
    color,
    type: borderType,
    strokeDashArray,
  };
}

export function parseLnRef(node, context) {
  const theme = context.fileInfo.theme;
  const idx = node['$']['idx'];
  const lnNode = get(theme, ['a:theme', 'a:themeElements', 'a:fmtScheme', 'a:lnStyleLst', '$$', idx]);
  if (!lnNode) return null;

  const color = getNodeColor(node, context);
  const line = parseLn(lnNode, context, { color });
  return line;
}

export function parseFillRef(node, context, isSVG) {
  const theme = context.fileInfo.theme;
  const idx = node['$']['idx'];
  const fillNode = get(theme, ['a:theme', 'a:themeElements', 'a:fmtScheme', 'a:fillStyleLst', '$$', idx]);
  if (!fillNode) return 'initial';

  const color = getNodeColor(node, context);
  const fillFn = ({
    'a:solidFill': parseSolidFill,
    'a:gradFill': parseGradFill,
  })[fillNode['#name']];

  return fillFn(fillNode, context, { color }, isSVG);
}

export function parseFontRef(node, context) {
  const color = getNodeColor(node, context);
  return { color };
}

export function getVerticalAlign(node, type, { layoutNode, masterNode }) {
  const path = ['p:txBody', 'a:bodyPr', '$', 'anchor'];
  const anchor = get(node, path) || get(layoutNode, path) || get(masterNode, path);
  // default anchor to v-mid
  return anchor === 'ctr' ? 'v-mid' : anchor === 'b' ? 'v-down' : 'v-mid';
}

export function getHorizontalAlign(node, type, context) {
  const { layoutNode, masterNode, slideMasterTextStyles } = context;
  const path = ['a:pPr', '$', 'algn'];
  let align = get(node, path) || get(layoutNode, path) || get(masterNode, path);
  if (align === undefined && ['title', 'ctrTitle', 'subtitle'].includes(type)) {
    const path = ['a:lstStyle', 'a:lvl1pPr', '$', 'algn'];
    align = get(node, path) || get(layoutNode, path) || get(masterNode, path);
  }
  if (align === undefined && type && slideMasterTextStyles) {
    switch (type) {
      case 'title':
      case 'subtitle':
      case 'ctrTitle':
        align = get(slideMasterTextStyles, ['p:titleStyle', 'a:lvl1pPr', '$', 'algn']);
        break;
      default:
        align = get(slideMasterTextStyles, ['p:otherStyle', 'a:lvl1pPr', '$', 'algn']);
    }
  }
  if (align === undefined) {
    if (['title', 'subTitle', 'ctrTitle'].includes(type)) return 'h-mid';
    if (['sldNum'].includes(type)) return 'h-right';
  }
  return ({
    ctr: 'h-mid', r: 'h-right'
  })[align] || 'h-left';
}

/**
 * Parse the a:off node in a a:xfrm node to css top and left.
 * @param {Node} node current node
 * @param {Node} layoutNode corresponding node in slide layout
 * @param {Node} masterNode corresponding node in master layout
 * @param {boolean} isRaw get raw object value or a style string
 */
export function getPosition(node, layoutNode, masterNode, isRaw) {
  const path = ['a:off', '$'];
  const offset = get(node, path) || get(layoutNode, path) || get(masterNode, path);
  if (!offset) return '';

  const left = emu2px(offset.x);
  const top = emu2px(offset.y);

  if (Number.isNaN(top) || Number.isNaN(left)) {
    return isRaw ? {} : '';
  }
  const css = `top: ${top}px; left: ${left}px;`;
  return isRaw ? { top, left, css } : css;
}

/**
 * Parse the a:ext node in a a:xfrm node to css width and height.
 * @param {Node} node current node
 * @param {Node} layoutNode corresponding node in slide layout
 * @param {Node} masterNode corresponding node in master layout
 * @param {boolean} isRaw get raw object value or a style string
 */
export function getSize(node, layoutNode, masterNode, isRaw) {
  const path = ['a:ext', '$'];
  const extent = get(node, path) || get(layoutNode, path) || get(masterNode, path);
  if (!extent) return '';

  const w = emu2px(extent.cx);
  const h = emu2px(extent.cy);

  if (Number.isNaN(w) || Number.isNaN(h)) {
    return isRaw ? {} : '';
  }
  const css = `width: ${w}px; height: ${h}px;`
  return isRaw ? { w, h, css } : css;
}

/**
 * Parse the rot, flipH and flipV attributes of a a:xfrm node to css transform.
 * @param {Node} node current node
 * @param {Node} layoutNode corresponding node in slide layout
 * @param {Node} masterNode corresponding node in master layout
 * @param {boolean} isRaw get raw object value or a style string
 */
export function getTransform(node, layoutNode, masterNode, isRaw) {
  const rotPath = ['$', 'rot'];
  const flipHPath = ['$', 'flipH'];
  const flipVPath = ['$', 'flipV'];
  const rot = get(node, rotPath) || get(layoutNode, rotPath) || get(masterNode, rotPath);
  const flipH = get(node, flipHPath) || get(layoutNode, flipHPath) || get(masterNode, flipHPath);
  const flipV = get(node, flipVPath) || get(layoutNode, flipVPath) || get(masterNode, flipVPath);

  if (!rot && !flipH && !flipV) {
    return isRaw ? {} : '';
  }

  let rotDeg = parseInt(rot) / 60000;
  const scaleX = flipH === '1' ? -1 : 1;
  const scaleY = flipV === '1' ? -1 : 1;
  if (Number.isNaN(rotDeg)) rotDeg = 0;

  const css = `transform: rotate(${rotDeg}deg) scale(${scaleX}, ${scaleY});`;
  return isRaw ? { rotDeg, scaleX, scaleY, css } : css;
}

/**
 * Parse a a:xfrm node.
 * @param {Node} node current node
 * @param {Node} layoutNode corresponding node in slide layout
 * @param {Node} masterNode corresponding node in master layout
 * @param {boolean} isRaw get raw object value or a style string
 */
export function parseXfrmNode(node, layoutNode, masterNode, isRaw) {
  const position = getPosition(node, layoutNode, masterNode, true);
  const size = getSize(node, layoutNode, masterNode, true);
  const transform = getTransform(node, layoutNode, masterNode, true);
  const css = [position.css, size.css, transform.css].join('');

  return isRaw ? { position, size, transform, css } : css;
}

export function getLink(node, context) {
  const linkID = get(node, ['a:hlinkClick', '$', 'r:id']);
  if (!linkID) return null;

  const linkObj = get(context, ['slideResObj', linkID]);
  const { target, targetMode } = linkObj;
  let script = targetMode === 'External'
    ? `window.open('${target}')` : `location='${target}'`;
  script = `${script};event.stopPropagation();`;

  return { target, mode: targetMode, script };
}
