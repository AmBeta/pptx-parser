import { get, groupBy, mergeWith, mapValues, sortBy } from 'lodash';
import { Parser as FormulaParser } from 'hot-formula-parser';
import { getNodeFill } from './shape/utils/style';

export function getSlideBackgroundFill(slide, slideLayout, slideMaster, context) {
  const bgPrPath = ['p:cSld', 'p:bg', 'p:bgPr'];
  const solidFill = getNodeFill(get(slide, ['p:sld', ...bgPrPath]), context)
    || getNodeFill(get(slideLayout, ['p:sldLayout', ...bgPrPath]), context)
    || getNodeFill(get(slideMaster, ['p:sldMaster', ...bgPrPath]), context);
  return solidFill || '#fff'; // slide background default to white
}

export function getDefaultTextStyle(presentation) {
  const defaultTextStyle = get(presentation, ['p:presentation', 'p:defaultTextStyle']);
  const defRPr = get(defaultTextStyle, ['a:defPPr', 'a:defRPr']);
  const sz = get(defRPr, ['$', 'sz']);
  const b = get(defRPr, ['$', 'b']);
  const i = get(defRPr, ['$', 'i']);
  const u = get(defRPr, ['$', 'u']);
  const color = getNodeFill(defRPr);
  return { color, sz, b, i, u };
}

export function getResObj(sldRelationships) {
  return [].concat(sldRelationships).reduce((ret, relationship) => {
    const type = relationship['$']['Type'].slice(68); // http://schemas.openxmlformats.org/officeDocument/2006/relationships/
    const targetMode = relationship['$']['TargetMode'];
    let target = relationship['$']['Target'];

    switch (type) {
      case 'slide':
        target = target.replace(/slide(\d+)\.xml/, (m, $1) => `/#/${$1 - 1}`);
        break;
      default:
        target = target.replace('../', 'ppt/');
    }

    ret[relationship['$']['Id']] = { type, target, targetMode };
    return ret;
  }, {});
}

/**
 * Parses and evaluates the provided expression, returns the final result.
 * Throws when parsing error.
 * @param {string} expression Expression to be evaluated.
 * @param {*} definitions Predefined variables and functions.
 */
export function parseFormula(expression, definitions = {}) {
  const { variables = {}, functions = {} } = definitions;
  const parser = new FormulaParser();
  // Set variables
  parser.setVariable('pi', Math.PI);
  parser.setVariable('e', Math.E);
  Object.keys(variables).forEach((varName) => {
    parser.setVariable(varName, variables[varName]);
  });
  // Set functions
  Object.keys(functions).forEach(
    funcName => parser.setFunction(funcName, functions[funcName])
  );
  const ret = parser.parse(expression);
  if (ret.error) throw new Error(`Error parsing formula <${expression}>: ${ret.error}`);
  return ret.result;
}

/**
 * Merge a group of keyframes.
 * @param {Array} keyframes Array of keyframes to be merged.
 */
export function mergeKeyframes(keyframes) {
  const offsetKfsGrp = groupBy(keyframes, 'offset');
  const mergedKfsGrp = mapValues(offsetKfsGrp, offsetKfs =>
    offsetKfs.reduce((merged, keyframe) =>
      mergeWith(merged, keyframe, (value, srcValue, key) => {
        if (value === undefined) return srcValue;
        switch (key) {
          case 'transform': return `${value} ${srcValue}`;
          default: return srcValue;
        }
      }
    ), {})
  );
  return sortBy(Object.values(mergedKfsGrp), 'offset');
}

export function debug(...args) {
  const date = new Date();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  /* eslint-disable-next-line */
  console.log('>', `${seconds}s${milliseconds}ms`, ...args);
}
