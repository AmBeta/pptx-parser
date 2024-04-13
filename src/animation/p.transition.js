const timeline = {
  par: [{
    id: 0,
    condition: 'click',
    children: {
      par: [{
        id: 2,
        condition: 'click',
      }, {
        id: 3,
        condition: null,
      }],
      seq: [],
    },
  }, {
    id: 1,
    condition: null,
    children: {
      par: [],
      seq: [],
    },
  }],
  seq: [],
};

function checkCondition(node, context) {
  if (!node.condition) return true;
  if (node.condition === 'click' && context.click) {
    context.click = false;
    return true;
  }
  return false;
}

function* groupRunner(nodes, context) {
  const runners = nodes.map(node => nodeRunner(node, context));
  let finished = false;
  while (!finished) {
    finished = true;
    runners.forEach((runner) => {
      const { done } = runner.next();
      if (!done) finished = false;
    });
    yield 0;
  }
  return 1;
}

function* nodeRunner(node, context) {
  while (!checkCondition(node, context)) yield 0;

  // run node
  // console.log(node.id);

  if (node.children) {
    const runner = groupRunner(node.children, context);
    while (!runner.next().done) yield 0;
  }
  return 1;
}

function* run(node, context) {
  while (!checkCondition(node, context)) yield 0;
  // do something for current node
  // run(node.children, context);
  let finished = false;
  while (!finished) {
    finished = true;
    node.children.forEach((child) => {
      const { done } = child.next();
      if (!done) finished = false;
    });
    yield 0;
  }

  return 1;
}

const context = {};
const r = run(timeline, context);

r.next();
