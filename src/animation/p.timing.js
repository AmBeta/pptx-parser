import { get } from 'lodash';
import { toDegree, reverseKeyframes, autoRevKeyframes } from './utils';
import { types } from 'util';

function condLstParser(node) {
  if (!node) return [];
  const condNodes = [].concat(get(node, ['p:cond']));
  return condNodes.map((condNode) => {
    const { evt, delay } = condNode['$'];
    const tn = get(condNode, ['p:tn', '$', 'val']);
    const rtn = get(condNode, ['p:rtn', '$', 'val']);
    const shapeID = get(condNode, ['p:tgtEl', 'p:spTgt', '$', 'spid']);
    return { evt, delay, tn, rtn, shapeID };
  });
}

function animVariantParser(node) {
  return get(node, ['p:boolVal', '$', 'val'])
  || get(node, ['p:intVal', '$', 'val'])
  || get(node, ['p:fltVal', '$', 'val'])
  || get(node, ['p:strVal', '$', 'val']);
  // || get(toNode, ['p:clrVal', '$', 'val']); // a:CT_Color
}

function cTnParser(node, context) {
  const attrs = node['$'];
  const stCondLst = get(node, ['p:stCondLst']);
  const endCondLst = get(node, ['p:endCondLst']);
  const children = get(node, ['p:childTnLst']);

  return Object.assign({
    startConditions: stCondLst && condLstParser(stCondLst, context),
    endConditions: endCondLst && condLstParser(endCondLst, context),
    children: children && tnLstParser(children),
  }, attrs);
}

function cBhvrParser(node, context) {
  const cTnNode = get(node, ['p:cTn']);
  const shapeID = get(node, ['p:tgtEl', 'p:spTgt', '$', 'spid']);
  const attrName = get(node, ['p:attrNameLst', 'p:attrName']);

  return Object.assign(
    get(node, ['$'], {}),
    cTnParser(cTnNode, context), {
    shapeID,
    attrName,
  });
}

function setParser(node, context) {
  const cBhvrNode = get(node, ['p:cBhvr']);
  const toValue = animVariantParser(get(node, ['p:to']));

  return Object.assign(
    cBhvrParser(cBhvrNode, context), {
      toValue,
    });
}

function animParser(node, context) {
  const props = cBhvrParser(get(node, ['p:cBhvr']), context);
  // const attrs = get(node, ['$']);
  const { dur, autoRev } = props;
  const tavLstNode = get(node, ['p:tavLst', 'p:tav']);
  // formula is defined in the first keyframe and shared with other keyframes
  const formula = get([].concat(tavLstNode), ['0', '$', 'fmla']);
  let keyframes = [].concat(tavLstNode).map((tavNode) => {
    const tm = get(tavNode, ['$', 'tm']);
    const offset = parseInt(tm) / 100000;
    const value = animVariantParser(get(tavNode, ['p:val']));
    return { offset, value };
  });
  if (autoRev === '1') {
    keyframes = autoRevKeyframes(keyframes);
  }

  return Object.assign(props, {
    formula,
    keyframes,
    dur: autoRev === '1' ? dur * 2 : dur,
  });
}

function animEffectParser(node, context) {
  const props = cBhvrParser(get(node, ['p:cBhvr']), context);
  const attrs = get(node, ['$']);
  const progress = animVariantParser(get(node, ['p:progress']));
  const { dur, autoRev } = props;
  const { transition, filter } = attrs;
  const filters = filter.split(';');
  let keyframes = null;
  // Parses filters from left to right until a supported animation is found.
  for (let i = 0, len = filters.length; i < len; i++) {
    const f = filters[i];
    switch (f) {
      case 'wipe(down)':
      case 'wipe(up)':
        keyframes = [
          { offset: 0, transform: 'scaleY(0)' },
          { offset: 1, transform: 'scaleY(1)' }
        ];
        break;
    }
    if (keyframes) break;
  }
  // Use fade as the default filter.
  if (!keyframes) {
    keyframes = [
      { offset: 0, opacity: 0 },
      { offset: 1, opacity: 1 },
    ];
  }
  // Reverse keyframes when transition is out.
  if (transition === 'out') {
    keyframes = reverseKeyframes(keyframes);
  }
  if (autoRev === '1') {
    keyframes = autoRev(keyframes);
  }

  return Object.assign(props, {
    progress,
    keyframes,
    dur: autoRev === '1' ? dur * 2 : dur,
  });
}

function animRotParser(node, context) {
  const props = cBhvrParser(get(node, ['p:cBhvr']), context);
  const { dur, autoRev } = props;
  const { by, to, from } = get(node, ['$'], {});
  let keyframes = [];
  if (by) {
    keyframes = [
      { offset: 0 },
      { offset: 1, transform: `rotate(${toDegree(by)}deg)` },
    ];
  }
  if (to && from) {
    keyframes = [
      { offset: 0, transform: `rotate(${toDegree(from)}deg)` },
      { offset: 1, transform: `rotate(${toDegree(to)}deg)` },
    ];
  }
  if (autoRev === '1') {
    keyframes = autoRevKeyframes(keyframes);
  }

  return Object.assign(props, {
    keyframes,
    dur: autoRev === '1' ? dur * 2 : dur,
  });
}

function animScaleParser(node, context) {
  const props = cBhvrParser(get(node, ['p:cBhvr']), context);
  const { dur, autoRev } = props;
  const byNode = get(node, ['p:by']);
  const fromNode = get(node, ['p:from']);
  const toNode = get(node, ['p:to']);
  const getScale = node => [
    get(node, ['$', 'x']), get(node, ['$', 'y'])
  ].map(
    (scale = 100000) => scale / 100000
  );
  let keyframes = [];
  if (byNode) {
    const [scaleX, scaleY] = getScale(byNode);
    keyframes = [
      { offset: 0, transform: `scale(1,1)` },
      { offset: 1, transform: `scale(${scaleX},${scaleY})` },
    ];
  }
  if (fromNode && toNode) {
    const [fromScaleX, fromScaleY] = getScale(fromNode);
    const [toScaleX, toScaleY] = getScale(toNode);
    keyframes = [
      { offset: 0, transform: `scale(${fromScaleX},${fromScaleY})` },
      { offset: 1, transform: `scale(${toScaleX},${toScaleY})` }
    ];
  }
  if (autoRev) {
    keyframes = autoRevKeyframes(keyframes);
  }

  return Object.assign(props, {
    keyframes,
    dur: autoRev === '1' ? dur * 2 : dur,
  });
}

function parParser(node, context) {
  const cTnNode = get(node, ['p:cTn']);

  return cTnParser(cTnNode, context);
}

function seqParser(node, context) {
  const attrs = get(node, ['$']);
  const cTnNode = get(node, ['p:cTn']);
  const prevCondLstNode = get(node, ['p:prevCondLst']);
  const nextCondLstNode = get(node, ['p:nextCondLst']);

  return Object.assign({
    previousConditions: condLstParser(prevCondLstNode),
    nextConditions: condLstParser(nextCondLstNode, context),
  }, cTnParser(cTnNode, context), attrs);
}

function tnLstParser(node, context) {
  return Object.keys(node).reduce((ret, key) => {
    const type = key.slice(2);
    const parser = ({
      'par': parParser,
      'seq': seqParser,
      'set': setParser,
      'anim': animParser,
      'animEffect': animEffectParser,
      'animRot': animRotParser,
      'animScale': animScaleParser,
    })[type];
    if (parser) {
      ret[type] = [].concat(node[key]).map(
        n => parser(n, context)
      );
    }
    return ret;
  }, {});
}

export default function timingParser(node, context) {
  const tnLstNode = get(node, ['p:tnLst']);

  if (!tnLstNode) return {};
  return tnLstParser(tnLstNode, context);
}
