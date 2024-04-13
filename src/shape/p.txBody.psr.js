import { get } from 'lodash';
import { getHorizontalAlign, getLink, getNodeColor } from './utils/style';

/**
 * Get node property from itself or ancestors.
 * @param {Node} node XML Doc Node
 * @param {string[]} prPath property path
 * @param {Object} context context
 */
function getRPr(node, prPath, context, defaultValue) {
  const { pNode, txBodyNode, layoutNode, masterNode } = context;
  const lstStylePath = ['a:lstStyle', 'a:lvl1pPr', 'a:defRPr', ...prPath];
  return get(node, ['a:rPr', ...prPath])
    || get(pNode, ['a:pPr', 'a:defRPr', ...prPath])
    || get(txBodyNode, lstStylePath)
    || get(layoutNode, lstStylePath)
    || get(masterNode, lstStylePath)
    || defaultValue;
}

function getFontType(node, type, context) {
  const tfPath = ['a:latin', '$', 'typeface'];
  let typeface = get(node, ['a:rPr', ...tfPath]);
  if (typeface === undefined) {
    const fontSchemeNode = get(context.fileInfo.theme, ['a:theme', 'a:themeElements', 'a:fontScheme']);
    if (['title', 'subTitle', 'ctrTitle'].includes(type)) {
      typeface = get(fontSchemeNode, ['a:majorFont', ...tfPath]);
    } else {
      typeface = get(fontSchemeNode, ['a:minorFont', ...tfPath]);
    }
  }
  return typeface === undefined ? 'inherit' : typeface;
}

function getFontColor(node, context) {
  const fillNode = getRPr(node, ['a:solidFill'], context,
    context.fileInfo.defaultTextStyle.color);
  const color = fillNode && getNodeColor(fillNode, context);
  return color || 'inherit';
}

function getFontBold(node, context) {
  return getRPr(node, ['$', 'b'], context,
    context.fileInfo.defaultTextStyle.b) === '1' ? 'bold' : 'initial';
}

function getFontItalic(node, context) {
  return getRPr(node, ['$', 'i'], context,
    context.fileInfo.defaultTextStyle.i) === '1' ? 'italic' : 'normal';
}

function getFontDecoration(node, context) {
  return getRPr(node, ['$', 'u'], context,
    context.fileInfo.defaultTextStyle.u) === 'sng' ? 'underline' : 'initial';
}

function getTextVerticalAlign(node, context) {
  const baseline = getRPr(node, ['$', 'baseline'], context);
  return baseline === undefined ? 'baseline' : `${parseInt(baseline) / 1000}%`;
}

function getFontSize(node, type, context) {
  const { masterNode, slideMasterTextStyles, fileInfo } = context;
  const szPath = ['a:lvl1pPr', 'a:defRPr', '$', 'sz'];
  let sz, fontSize;

  sz = getRPr(node, ['$', 'sz'], context);
  fontSize = sz && (parseInt(sz) / 100);

  if ((fontSize === undefined || Number.isNaN(fontSize)) && masterNode) {
    if (['title', 'subTitle', 'ctrTitle'].includes(type)) {
      sz = get(slideMasterTextStyles, ['p:titleStyle', ...szPath]);
    } else if (type === 'body') {
      sz = get(slideMasterTextStyles, ['p:bodyStyle', ...szPath]);
    } else if (['dt', 'sldNum'].includes(type)) {
      sz = 1200;
    } else {
      sz = get(slideMasterTextStyles, ['p:otherStyle', ...szPath]);
    }
    fontSize = parseInt(sz) / 100;
  }

  if (fontSize === undefined || Number.isNaN(fontSize)) {
    sz = fileInfo.defaultTextStyle.sz;
    fontSize = parseInt(sz) / 100;
  }

  // FIXME: baseline is a percentage value
  // const baseline = get(node, ['a:rPr', '$', 'baseline']);
  // if (baseline !== undefined && fontSize && !Number.isNaN(fontSize)) {
  //   fontSize -= 10;
  // }

  return Number.isNaN(fontSize) ? 'inherit' : `${fontSize}pt`;
}

function genBuChar(node) {
  const pPrNode = node['a:pPr'];

  let lvl = parseInt(get(pPrNode, ['$', 'lvl']));
  if (Number.isNaN(lvl)) lvl = 0;

  let buChar = get(pPrNode, ['a:buChar', '$', 'char']);
  if (buChar !== undefined) {
    const buFontAttrs = get(pPrNode, ['a:buFont', '$']);
    if (buFontAttrs !== undefined) {
      const typeface = buFontAttrs['typeface'];
      let marginLeft = parseInt(get(pPrNode, ['$', 'marL'])) * 96 / 914400;
      let marginRight = parseInt(buFontAttrs['pitchFamily']);
      if (Number.isNaN(marginLeft)) {
        marginLeft = 328600 * 96 / 914400;
      }
      if (Number.isNaN(marginRight)) {
        marginRight = 0;
      }
      return `<span style="font-size: 20pt; font-family: ${typeface
        }; margin-left: ${marginLeft * lvl}px; margin-right: ${marginRight}px">${buChar}</span>`;
    } else {
      const marginLeft = 328600 * 96 / 914400 * lvl;
      return `<span style="margin-left: ${marginLeft}px;">${buChar}</span>`;
    }
  } else {
    // Use '•' as the default buChar.
    const marginLeft = 328600 * 96 / 914400 * lvl;
    return `<span style="margin-left: ${marginLeft}px; margin-right: 0px;"></span>`;
  }
}

function genSpanElement(node, type, context) {
  const tNode = get(node, ['a:t']) || get(node, ['a:fld', 'a:t']);
  const text =( // empty text node will be parsed to an empty object
    typeof tNode === 'string' ? tNode : '&nbsp;'
  ).toString().replace(/\s/i, '&nbsp;');
  // styles
  const styleText = `color: ${getFontColor(node, context)
    };font-size: ${getFontSize(node, type, context)
    };font-family: ${getFontType(node, type, context)
    };font-weight: ${getFontBold(node, context)
    };font-style: ${getFontItalic(node, context)
    };text-decoration: ${getFontDecoration(node, context)
    };vertical-align: ${getTextVerticalAlign(node, context)
    };`;

  const link = getLink(node['a:rPr'], context);

  return `<span style="${styleText}">${
    link ? `<a href="${link.target}" target="${link.target === 'External' ? '_blank' : ''}">${text}</a>` : text
  }</span>`;
}

export default function genTextBody(node, type, context) {
  // Do not draw text body for master slides
  if (context.isMaster) return '';
  if (!node) return '';

  let text = '';

  [].concat(node['a:p']).forEach((pNode) => {
    const rNode = pNode['a:r'];
    const pContext = { ...context, txBodyNode: node };
    const rContext = { ...pContext, pNode };
    text += `<div class="text-block ${getHorizontalAlign(pNode, type, pContext)}">`;
    text += genBuChar(pNode);
    if (rNode === undefined) {
      text += genSpanElement(pNode, type, pContext);
    } else {
      [].concat(rNode).forEach((rn) => {
        text += genSpanElement(rn, type, rContext);
      });
    }
    text += '</div>';
  });

  return text;
}
