import { get } from 'lodash';
import { getPosition, getSize, getTransform } from './utils/style';
import { parseBlipFill } from './utils/image';

export default async function picParser(node, context, nodeProps) {
  const { id, name } = nodeProps;
  const xfrmNode = get(node, ['p:spPr', 'a:xfrm']);
  const blipNode = get(node, ['p:blipFill']);
  const imgData = await parseBlipFill(blipNode, context);

  return (
    `<div class="block content" _id="${id}" _name="${name}" style="${
      getPosition(xfrmNode)}${
      getSize(xfrmNode)}${
      getTransform(xfrmNode)
    }"><img src="${imgData}" style="width:100%;height:100%;" /></div>`
  );
}
