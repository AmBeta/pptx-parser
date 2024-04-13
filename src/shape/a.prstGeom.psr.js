import { get } from 'lodash';

export default function prstGeomParser(node, context, options) {
  const { parentNode } = context;
  const { size: { w, h }, stroke, image } = options;
  const shapeType = get(node, ['$', 'prst']);

  let fill = options.fill;
  let fillDef = '';
  if (fill.id) {
    fillDef = fill.def;
    fill = `url(#${fill.id})`;
  }

  // Outline
  const headEndNodeAttrs = get(parentNode, ['p:spPr', 'a:ln', 'a:headEnd', '$']);
  const tailEndNodeAttrs = get(parentNode, ['p:spPr', 'a:ln', 'a:tailEnd', '$']);
  let triangleMaker = '';
  if ((headEndNodeAttrs !== undefined && ['triangle', 'arrow'].includes(headEndNodeAttrs['type'])) ||
    (tailEndNodeAttrs !== undefined && ['triangle', 'arrow'].includes(tailEndNodeAttrs['type']))
  ) {
    triangleMaker = '<marker id="markerTriangle" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>';
  }

  let pathStr = '';
  switch (shapeType) {
    case 'accentstrokeCallout1':
    case 'accentstrokeCallout2':
    case 'accentstrokeCallout3':
    case 'accentCallout1':
    case 'accentCallout2':
    case 'accentCallout3':
    case 'actionButtonBackPrevious':
    case 'actionButtonBeginning':
    case 'actionButtonBlank':
    case 'actionButtonDocument':
    case 'actionButtonEnd':
    case 'actionButtonForwardNext':
    case 'actionButtonHelp':
    case 'actionButtonHome':
    case 'actionButtonInformation':
    case 'actionButtonMovie':
    case 'actionButtonReturn':
    case 'actionButtonSound':
    case 'arc':
    case 'bevel':
    case 'blockArc':
    case 'strokeCallout1':
    case 'strokeCallout2':
    case 'strokeCallout3':
    case 'bracePair':
    case 'bracketPair':
    case 'callout1':
    case 'callout2':
    case 'callout3':
    case 'can':
    case 'chartPlus':
    case 'chartStar':
    case 'chartX':
    case 'chevron':
    case 'chord':
    case 'cloud':
    case 'cloudCallout':
    case 'corner':
    case 'cornerTabs':
    case 'cube':
    case 'decagon':
    case 'diagStripe':
    case 'diamond':
    case 'dodecagon':
    case 'donut':
    case 'doubleWave':
    case 'downArrowCallout':
    case 'ellipseRibbon':
    case 'ellipseRibbon2':
    case 'flowChartAlternateProcess':
    case 'flowChartCollate':
    case 'flowChartConnector':
    case 'flowChartDecision':
    case 'flowChartDelay':
    case 'flowChartDisplay':
    case 'flowChartDocument':
    case 'flowChartExtract':
    case 'flowChartInputOutput':
    case 'flowChartInternalStorage':
    case 'flowChartMagneticDisk':
    case 'flowChartMagneticDrum':
    case 'flowChartMagneticTape':
    case 'flowChartManualInput':
    case 'flowChartManualOperation':
    case 'flowChartMerge':
    case 'flowChartMultidocument':
    case 'flowChartOfflineStorage':
    case 'flowChartOffpageConnector':
    case 'flowChartOnlineStorage':
    case 'flowChartOr':
    case 'flowChartPredefinedProcess':
    case 'flowChartPreparation':
    case 'flowChartProcess':
    case 'flowChartPunchedCard':
    case 'flowChartPunchedTape':
    case 'flowChartSort':
    case 'flowChartSummingJunction':
    case 'flowChartTerminator':
    case 'folderCorner':
    case 'frame':
    case 'funnel':
    case 'gear6':
    case 'gear9':
    case 'halfFrame':
    case 'heart':
    case 'heptagon':
    case 'hexagon':
    case 'homePlate':
    case 'horizontalScroll':
    case 'irregularSeal1':
    case 'irregularSeal2':
    case 'leftArrow':
    case 'leftArrowCallout':
    case 'leftBrace':
    case 'leftBracket':
    case 'leftRightArrowCallout':
    case 'leftRightRibbon':
    case 'lightningBolt':
    case 'lineInv':
    case 'mathDivide':
    case 'mathEqual':
    case 'mathMinus':
    case 'mathMultiply':
    case 'mathNotEqual':
    case 'mathPlus':
    case 'moon':
    case 'nonIsoscelesTrapezoid':
    case 'noSmoking':
    case 'octagon':
    case 'parallelogram':
    case 'pentagon':
    case 'pie':
    case 'pieWedge':
    case 'plaque':
    case 'plaqueTabs':
    case 'plus':
    case 'quadArrowCallout':
    case 'ribbon':
    case 'ribbon2':
    case 'rightArrowCallout':
    case 'rightBrace':
    case 'rightBracket':
    case 'round1Rect':
    case 'round2DiagRect':
    case 'round2SameRect':
    case 'rtTriangle':
    case 'smileyFace':
    case 'snip1Rect':
    case 'snip2DiagRect':
    case 'snip2SameRect':
    case 'snipRoundRect':
    case 'squareTabs':
    case 'star10':
    case 'star12':
    case 'star16':
    case 'star24':
    case 'star32':
    case 'star4':
    case 'star5':
    case 'star6':
    case 'star7':
    case 'star8':
    case 'sun':
    case 'teardrop':
    case 'trapezoid':
    case 'upArrowCallout':
    case 'upDownArrowCallout':
    case 'verticalScroll':
    case 'wave':
    case 'wedgeEllipseCallout':
    case 'wedgeRectCallout':
    case 'wedgeRoundRectCallout':
    case 'rect':
      pathStr += `<rect x="0" y="0" width="${w}" height="${h}" fill="${fill}" stroke="${
        stroke.color}" stroke-width="${stroke.width}" stroke-dasharray="${stroke.strokeDashArray}" />`;
      break;
    case 'ellipse':
      pathStr += `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${
        stroke.color}" stroke-width="${stroke.width}" stroke-dasharray="${stroke.strokeDashArray}" />`;
      break;
    case 'roundRect':
      pathStr += `<rect x="0" y="0" rx="7" ry="7" width="${w}" height="${h}" fill="${fill}" stroke="${
        stroke.color}" stroke-width="${stroke.width}" stroke-dasharray="${stroke.strokeDashArray}" />`;
      break;
    // 直角 (path)
    case 'bentConnector2': {
      const d = `M ${w} 0 L ${w} ${h} L 0 ${h}`;
      pathStr += `<path d="${d}" fill="${fill}" stroke="${
        stroke.color}" stroke-width="${stroke.width}" stroke-dasharray="${stroke.strokeDashArray}"`;
      if (headEndNodeAttrs !== undefined && ['triangle', 'arrow'].includes(headEndNodeAttrs['type'])) {
        pathStr += 'marker-start="url(#markerTriangle)" ';
      }
      if (tailEndNodeAttrs !== undefined && ['triangle', 'arrow'].includes(tailEndNodeAttrs['type'])) {
        pathStr += 'marker-end="url(#markerTriangle)" ';
      }
      pathStr += '/>';
      break;
    }
    case 'line':
    case 'straightConnector1':
    case 'bentConnector3':
    case 'bentConnector4':
    case 'bentConnector5':
    case 'curvedConnector2':
    case 'curvedConnector3':
    case 'curvedConnector4':
    case 'curvedConnector5':
      pathStr += `<line x1="0" y1="0" x2="${w}" y2="${h}" stroke="${stroke.color
        }" stroke-width="${stroke.width}" stroke-dasharray="${stroke.strokeDashArray}"`;
      if (headEndNodeAttrs !== undefined && ['triangle', 'arrow'].includes(headEndNodeAttrs['type'])) {
        pathStr += 'marker-start="url(#markerTriangle)" ';
      }
      if (tailEndNodeAttrs !== undefined && ['triangle', 'arrow'].includes(tailEndNodeAttrs['type'])) {
        pathStr += 'marker-end="url(#markerTriangle)" ';
      }
      pathStr += '/>';
      break;
    case 'rightArrow':
      pathStr += `<defs><marker id="markerTriangle" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="2.5" markerHeight="2.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>`;
      pathStr += `<line x1="0" y1="${h / 2}" x2="${w - 15}" y2="${h / 2}" stroke="${stroke.color
        }" stroke-width="${h / 2}" stroke-dasharray="${stroke.strokeDashArray
        }" marker-end="url(#markerTriangle)" />`;
      break;
    case 'downArrow':
      pathStr += `<defs><marker id="markerTriangle" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="2.5" markerHeight="2.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>`;
      pathStr += `<line x1="${w / 2}" y1="0" x2="${w / 2}" y2="${h - 15}" stroke="${stroke.color
        }" stroke-width="${w / 2}" stroke-dasharray="${stroke.strokeDashArray
        }" marker-end="url(#markerTriangle)" />`;
      break;
    case 'bentArrow':
    case 'bentUpArrow':
    case 'stripedRightArrow':
    case 'quadArrow':
    case 'circularArrow':
    case 'swooshArrow':
    case 'leftRightArrow':
    case 'leftRightUpArrow':
    case 'leftUpArrow':
    case 'leftCircularArrow':
    case 'notchedRightArrow':
    case 'curvedDownArrow':
    case 'curvedLeftArrow':
    case 'curvedRightArrow':
    case 'curvedUpArrow':
    case 'upDownArrow':
    case 'upArrow':
    case 'uturnArrow':
    case 'leftRightCircularArrow':
      break;
    case 'triangle':
      break;
    case undefined:
    default:
      throw new Error(`Cannot find shape parser for type ${shapeType}.`);
  }

  let imageStr = '';
  if (image) {
    imageStr = `<clipPath id="cp">${pathStr}</clipPath>`
      + `<image clip-path="url(#cp)" xlink:href="${image}">`;
  }

  return (
    `<svg class="drawing" style="width:${w > 0 ? w : 1}px;height:${h > 0 ? h : 1}px"><defs>${
      fillDef}${triangleMaker
    }</defs>${pathStr}${imageStr}</svg>`
  );
}
