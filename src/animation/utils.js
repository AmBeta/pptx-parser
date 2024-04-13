export function toDegree(units) {
  const unitsNum = parseInt(units);
  if (Number.isNaN(unitsNum)) {
    throw new Error(`fail to transform units <${units}> to degree`);
  }
  return unitsNum / 60000;
}

export function reverseKeyframes(keyframes) {
  const reversed = keyframes.map(
    ({ offset, ...attrs }) => attrs
  ).reverse();
  return keyframes.map(
    (keyframe, i) => ({ ...keyframe, ...reversed[i] })
  );
}

export function autoRevKeyframes(keyframes) {
  const reversed = reverseKeyframes(
    keyframes.map(kf => ({ ...kf, offset: kf.offset + 1 }))
  );
  return keyframes.concat(reversed)
    .map(kf => ({ ...kf, offset: kf.offset / 2 }));
}
