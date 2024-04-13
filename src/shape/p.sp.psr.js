/**
 *  **sp (Shape)**
 *
 *  <xsd:complexType name="CT_Shape">
      <xsd:sequence>
        <xsd:element name="nvSpPr" type="CT_ShapeNonVisual" minOccurs="1" maxOccurs="1"/>
        <xsd:element name="spPr" type="a:CT_ShapeProperties" minOccurs="1" maxOccurs="1"/>
        <xsd:element name="style" type="a:CT_ShapeStyle" minOccurs="0" maxOccurs="1"/>
        <xsd:element name="txBody" type="a:CT_TextBody" minOccurs="0" maxOccurs="1"/>
        <xsd:element name="extLst" type="CT_ExtensionListModify" minOccurs="0" maxOccurs="1"/>
      </xsd:sequence>
      <xsd:attribute name="useBgFill" type="xsd:boolean" use="optional" default="false"/>
    </xsd:complexType>
 */

import { get } from 'lodash';
import {
  getLink, getVerticalAlign, getNodeColor, getNodeFill,
  parseFillRef, parseLn, parseLnRef, parseFontRef, parseXfrmNode,
} from './utils/style';
import { emu2px } from './utils/units';
// import { parseBlipFill } from './utils/image';
import txBodyParser from './p.txBody.psr';
import prstGeomParser from './a.prstGeom.psr';
import custGeomParser from './a.custGeom.psr';

async function getShapeFill(node, context) {
  // Explicit no fill
  if (get(node, ['p:spPr', 'a:noFill']) !== undefined) {
    return { color: '', image: '' };
  }

  // FIXME: background image disabled
  let fillIamge = '';
  // const blipFillNode = get(node, ['p:spPr', 'a:blipFill']);
  // if (blipFillNode) {
  //   fillIamge = await parseBlipFill(blipFillNode, context);
  // }

  let fillColor = getNodeFill(node['p:spPr'], context, {}, true);
  if (!fillColor && get(node, ['p:style', 'a:fillRef'])) {
    fillColor = parseFillRef(node['p:style']['a:fillRef'], context, true);
  }

  return { color: fillColor, image: fillIamge };
}

function getShapeEffect(node, context) {
  const effectList = get(node, ['p:spPr', 'a:effectLst', '$$']);
  if (!effectList || !effectList.length) return '';

  return effectList.map((effect) => {
    const name = effect['#name'];
    switch (name) {
      case 'a:outerShdw':{
        const color = getNodeColor(effect, context);
        let { dist, blurRad } = effect['$'];
        dist = emu2px(dist);
        blurRad = emu2px(blurRad);
        return `text-shadow:0 ${dist}px ${blurRad}px ${color}`;
      }
    }
  }).filter(Boolean).join(';');
}

function getBorder(node, context) {
  let line = {};
  if (get(node, ['p:spPr', 'a:ln'])) {
    line = parseLn(get(node, ['p:spPr', 'a:ln']), context);
  } else if (get(node, ['p:style', 'a:lnRef'])) {
    line = parseLnRef(get(node, ['p:style', 'a:lnRef']), context);
  }
  return line;
}

export async function genShape(node, context, nodeProps) {
  const { id, name, idx, type, link } = nodeProps;
  const { layoutNode, masterNode } = context;
  const xfrmPath = ['p:spPr', 'a:xfrm'];
  const xfrm = parseXfrmNode(
    get(node, xfrmPath),
    get(layoutNode, xfrmPath),
    get(masterNode, xfrmPath),
    true,
  );
  const { color: bgClr, image } = await getShapeFill(node, context);
  const effect = getShapeEffect(node, context);

  let geometry = '';
  const prstGeomNode = get(node, ['p:spPr', 'a:prstGeom']);
  const custGeomNode = get(node, ['p:spPr', 'a:custGeom']);
  const options = {
    size: xfrm.size,
    fill: bgClr || 'none',
    stroke: getBorder(node, context),
    image,
  };
  if (prstGeomNode !== undefined) {
    geometry =  prstGeomParser(prstGeomNode, { ...context, parentNode: node }, options);
  } else if (custGeomNode !== undefined) {
    geometry = custGeomParser(custGeomNode, { ...context, parentNode: node }, options);
  }

  let txBody = '';
  if (node['p:txBody'] !== undefined) {
    txBody = txBodyParser(node['p:txBody'], type, {
      ...context,
      parentNode: node,
      layoutNode: layoutNode && layoutNode['p:txBody'],
      masterNode: masterNode && masterNode['p:txBody'],
    });
  }

  const fontRef = get(node, ['p:style', 'a:fontRef']);
  const fontClr = fontRef && parseFontRef(fontRef, context).color;
  const style = `${xfrm.css};color: ${fontClr || '#000'};${effect};`;

  return (
    `<div class="block content ${getVerticalAlign(node, type, context)} ${link ? 'has-link' : ''
      }" _id="${id}" _idx="${idx}" _type="${type}" _name="${name}" style="${style}" ${
        link ? `onclick="${link.script}"` : ''
      }>${geometry}${txBody
      }</div>`
  );
}

export default function spParser(node, context, nodeProps) {
  const { id, name } = nodeProps;
  const phPath = ['p:nvSpPr', 'p:nvPr', 'p:ph'];
  const idx = get(node, [...phPath, '$', 'idx'], '');
  const type = get(node, [...phPath, '$', 'type'], '');
  const layoutNode = get(context, ['slideLayoutTables', 'typeTable', type],
    get(context, ['slideLayoutTables', 'idxTable', idx])
  );
  const masterNode = get(context, ['slideMasterTables', 'typeTable', type],
    get(context, ['slideMasterTables', 'idxTable', idx])
  );
  const actualType = type
    || get(layoutNode, [...phPath, '$', 'type'], '')
    || get(masterNode, [...phPath, '$', 'type'], '');
  const link = getLink(get(node, ['p:nvSpPr', 'p:cNvPr']), context);

  return genShape(node,
    { ...context, layoutNode, masterNode },
    { node, id, name, idx, type: actualType, link },
  );
}
