import JSZip from 'jszip';
import * as XMLParser from 'xml2js';
import { get, findKey } from 'lodash';
import MarkdownIt from 'markdown-it';
import { getSlideBackgroundFill, getResObj, getDefaultTextStyle } from './utils';
import shapeParser from './shape';
import animParser from './animation';

async function readXmlFile(zip, filename) {
  const fileContent = await zip.file(filename).async('string');
  const result = await new Promise((resolve, reject) => {
    XMLParser.parseString(fileContent, {
      attrkey: '$',
      childkey: '$$',
      explicitArray: false,
      explicitChildren: true,
      preserveChildrenOrder: true,
    }, (err, ret) => {
      if (err) reject(err);
      else resolve(ret);
    })
  });
  return result;
}

export default class Parser {
  options = {
    /** 图片文件读取方法，可以返回 dataURL 或者上传后返回外链地址 */
    imageReader: null,
  }

  constructor(options = {}) {
    Object.assign(this.options, options);
  }

  async parse(file) {
    return this.getSlides(file);
  }

  async getSlides(file) {
    const zip = await this.getZipData(file);
    const fileInfo = await this.getMetaInfo(zip);
    const slides = fileInfo['slides'];
    const results = await Promise.all(slides.map(
      slide => this.processSlide(zip, slide, fileInfo)
    ));
    return results;
  }

  async getZipData(file) {
    if (file instanceof JSZip) return file;

    const jszip = new JSZip();
    const data = await jszip.loadAsync(file);
    return data;
  }

  async getMetaInfo(zip) {
    // ===== Slides =====
    const ContentTypesJson = await readXmlFile(zip, '[Content_Types].xml');
    const subObj = ContentTypesJson['Types']['Override'];
    const slidesLocArray = [];
    const slideLayoutsLocArray = [];
    for (let i = 0; i < subObj.length; i++) {
      switch (subObj[i]['$']['ContentType']) {
        case 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml':
          slidesLocArray.push(subObj[i]['$']['PartName'].substr(1));
          break;
        case 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml':
          slideLayoutsLocArray.push(subObj[i]['$']['PartName'].substr(1));
          break;
        default:
      }
    }
    // ===== Slide Size =====
    const preContent = await readXmlFile(zip, 'ppt/presentation.xml');
    const defaultTextStyle = getDefaultTextStyle(preContent);
    const slideSize = preContent['p:presentation']['p:sldSz']['$'];
    const width = parseInt(slideSize.cx, 10) * 96 / 914400;
    const height = parseInt(slideSize.cy, 10) * 96 / 914400;
    // ===== Theme =====
    const preRelsContent = await readXmlFile(zip, 'ppt/_rels/presentation.xml.rels');
    const preRelationships = preRelsContent['Relationships']['Relationship'];
    const themeRelationship = [].concat(preRelationships).find(
      r => r['$']['Type'] === 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme'
    );
    if (!themeRelationship) throw new Error('Cannot find theme file.');
    const themeURI = themeRelationship['$']['Target'];
    const theme = await readXmlFile(zip, `ppt/${themeURI}`);

    return {
      theme,
      size: { width, height },
      defaultTextStyle,
      slides: slidesLocArray,
      slideLayouts: slideLayoutsLocArray
    };
  }

  async processSlide(zip, sldFileName, fileInfo) {
    // ===== Step 1: Read relationship filename of the slide =====
    const relsName = sldFileName.replace('slides/slide', 'slides/_rels/slide') + '.rels';
    const relsContent = await readXmlFile(zip, relsName);
    const slideResObj = getResObj(relsContent['Relationships']['Relationship']);

    // ===== Step2: Read slide layout and master =====
    // read slide layout
    const layoutFilename = slideResObj[
      findKey(slideResObj, ['type', 'slideLayout'])
    ].target;
    const slideLayoutContent = await readXmlFile(zip, layoutFilename);
    const slideLayoutTables = this.indexNodes(slideLayoutContent);
    // read slide master
    const slideLayoutRelsFilename = layoutFilename.replace(/slideLayout(?=\d+)/, '_rels/slideLayout') + '.rels';
    const slideLayoutRelsContent = await readXmlFile(zip, slideLayoutRelsFilename);
    const layoutResObj = getResObj(slideLayoutRelsContent['Relationships']['Relationship']);
    const masterFilename = layoutResObj[
      findKey(layoutResObj, ['type', 'slideMaster'])
    ].target;

    const slideMasterRelsFilename = masterFilename.replace(/slideMaster(?=\d+)/, '_rels/slideMaster') + '.rels';
    const slideMasterRelsContent = await readXmlFile(zip, slideMasterRelsFilename);
    const masterResObj = getResObj(slideMasterRelsContent['Relationships']['Relationship']);
    const slideMasterContent = await readXmlFile(zip, masterFilename);
    const slideMasterTextStyles = get(slideMasterContent, ['p:sldMaster', 'p:txStyles']);
    const slideMasterTables = this.indexNodes(slideMasterContent);

    // ===== Step3: Parse each slide by walking through spTree =====
    const slideContent = await readXmlFile(zip, sldFileName);
    const showLayoutSp = get(slideContent, ['p:sld', '$', 'showMasterSp']) !== '0';
    const showMasterSp = get(slideLayoutContent, ['p:sldLayout', '$', 'showMasterSp']) !== '0';
    const seenShapes = {};
    const slideContext = {
      zip, fileInfo, options: this.options,
      slideLayoutTables, slideMasterTables, slideResObj, slideMasterTextStyles
    };
    const slideHTML = await this.processNodeTree(
      get(slideContent, ['p:sld', 'p:cSld', 'p:spTree']),
      slideContext,
      seenShapes,
    );
    const slideLayoutHTML = showLayoutSp ? await this.processNodeTree(
      get(slideLayoutContent, ['p:sldLayout', 'p:cSld', 'p:spTree']),
      {
        zip, fileInfo, options: this.options, isMaster: true,
        slideMasterTables, slideResObj: layoutResObj, slideMasterTextStyles,
      },
      seenShapes,
    ) : '';
    const slideMasterHTML = showLayoutSp && showMasterSp ? await this.processNodeTree(
      get(slideMasterContent, ['p:sldMaster', 'p:cSld', 'p:spTree']),
      {
        zip, fileInfo, isMaster: true, options: this.options, slideResObj: masterResObj,
      },
      seenShapes,
    ) : '';

    // get notesSlide content
    let notesSlideHTML = '';
    const notesSlide = slideResObj[findKey(slideResObj, ['type', 'notesSlide'])];
    if (notesSlide) notesSlideHTML = await this.processNotesSlide(zip, notesSlide.target);

    const slideWidth = fileInfo.size.width;
    const slideHeight = fileInfo.size.height;
    const slideBgColor = getSlideBackgroundFill(slideContent, slideLayoutContent, slideMasterContent, slideContext);
    const animation = animParser.timing(get(slideContent, ['p:sld', 'p:timing']));

    return {
      animation,
      size: fileInfo.size,
      notes: notesSlideHTML,
      html: (
        `<section style="width: ${slideWidth}px; height: ${slideHeight}px; background: ${slideBgColor};">${
          slideMasterHTML}${slideLayoutHTML}${slideHTML
        }</section>`
      ),
    };
  }

  async processNotesSlide(zip, filename) {
    const content = await readXmlFile(zip, filename);
    const shapes = [].concat(get(content, ['p:notes', 'p:cSld', 'p:spTree', 'p:sp']));
    const notesText = shapes.map((sp) => {
      const txBody = sp['p:txBody'];
      if (!txBody) return '';
      const paragraphs = [].concat(txBody['a:p']);
      return paragraphs.map((p) => {
        const textRuns = [].concat(get(p, ['a:r']));
        return textRuns.map((r) => {
          const textNode = get(r, ['a:t']) || get(r, ['a:fld', 'a:t']);
          return typeof textNode === 'string' ? textNode : ' ';
        }).join('');
      }).join('\n');
    }).join('');

    const md = new MarkdownIt();
    const notesHTML = md.render(notesText);

    return notesHTML;
  }

  async processNodeTree(rootNode, context, seenShapes) {
    const childNodes = rootNode['$$'];
    const results = await Promise.all(childNodes.map(
      node => this.processNode(node['#name'], node, context, seenShapes)
    ));
    return results.join('');
  }

  async processNode(key, node, context, seenShapes) {
    const nodeType = key.slice(2);
    const prName = `p:nv${nodeType.replace(/^./, x => x.toUpperCase())}Pr`;
    const id = get(node, [prName, 'p:cNvPr', '$', 'id']);
    const name = get(node, [prName, 'p:cNvPr', '$', 'name']);
    const nodeProps = { id, name };

    // if (!id || seenShapes[`${nodeType}${id}`]) return '';
    // seenShapes[`${nodeType}${id}`] = true;

    switch (nodeType) {
      // Group Shape
      case 'grpSp': {
        const getValue = (node, path) => (
          parseInt(get(node, path)) * 96 / 914400
        );
        const xfrmNode = get(node, ['p:grpSpPr', 'a:xfrm']);
        const x = getValue(xfrmNode, ['a:off', '$', 'x']);
        const y = getValue(xfrmNode, ['a:off', '$', 'y']);
        const chx = getValue(xfrmNode, ['a:chOff', '$', 'x']);
        const chy = getValue(xfrmNode, ['a:chOff', '$', 'y']);
        const cx = getValue(xfrmNode, ['a:ext', '$', 'cx']);
        const cy = getValue(xfrmNode, ['a:ext', '$', 'cy']);
        // const chcx = getValue(xfrmNode, ['a:chExt', '$', 'cx']);
        // const chcy = getValue(xfrmNode, ['a:chExt', '$', 'cy']);
        const styleText = `top: ${y - chy}px; left: ${x - chx
          }px; width: ${cx}px; height: ${cy}px;`;

        return (
          `<div class="block group" _id="${id}" _name="${name}" style="${styleText}">${
            await this.processNodeTree(node, context, seenShapes)
          }</div>`
        );
      }
      // Shape
      case 'sp':
        return shapeParser.sp(node, context, nodeProps);
      case 'pic':
        return shapeParser.pic(node, context, nodeProps);
      case 'cxnSp':
        return shapeParser.cxnSp(node, context, nodeProps);
      case 'graphicFrame':
      default:
        return '';
    }
  }

  indexNodes(content) {
    const keys = Object.keys(content);
    const spTreeNode = content[keys[0]]['p:cSld']['p:spTree'];

    const idTable = {};
    const idxTable = {};
    const typeTable = {};

    for (let key in spTreeNode) {
      if (key === 'p:nvGrpSpPr' || key === 'p:grpSpPr') continue;

      const targetNode = spTreeNode[key];
      [].concat(targetNode).forEach((node) => {
        const nvSpPrNode = node['p:nvSpPr'];
        const id = get(nvSpPrNode, ['p:cNvPr', '$', 'id']);
        const idx = get(nvSpPrNode, ['p:nvPr', 'p:ph', '$', 'idx']);
        const type = get(nvSpPrNode, ['p:nvPr', 'p:ph', '$', 'type']);

        if (id !== undefined) idTable[id] = node;
        if (idx !== undefined) idxTable[idx] = node;
        if (type !== undefined) typeTable[type] = node;
      });
    }

    return { idTable, idxTable, typeTable };
  }
}

/*
  *  spTree (Shape Tree) XML schema
  *
  *  <xsd:complexType name="CT_GroupShape">
      <xsd:sequence>
        <xsd:element name="nvGrpSpPr" type="CT_GroupShapeNonVisual" minOccurs="1" maxOccurs="1"/>
        <xsd:element name="grpSpPr" type="a:CT_GroupShapeProperties" minOccurs="1" maxOccurs="1"/>
        <xsd:choice minOccurs="0" maxOccurs="unbounded">
          <xsd:element name="sp" type="CT_Shape"/>
          <xsd:element name="grpSp" type="CT_GroupShape"/>
          <xsd:element name="graphicFrame" type="CT_GraphicalObjectFrame"/>
          <xsd:element name="cxnSp" type="CT_Connector"/>
          <xsd:element name="pic" type="CT_Picture"/>
          <xsd:element name="contentPart" type="CT_Rel"/>
        </xsd:choice>
        <xsd:element name="extLst" type="CT_ExtensionListModify" minOccurs="0" maxOccurs="1"/>
      </xsd:sequence>
    </xsd:complexType>
*/
