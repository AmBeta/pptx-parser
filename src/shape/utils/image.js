import { get } from 'lodash';
// import jimp from 'jimp';
import tinycolor from 'tinycolor2';
import { getFileExtension } from './misc';
import { parseColorNode } from './style';

// 是否开启图片过滤器（处理图片会比较耗时）
const ENABLE_IMAGE_FILTER = false;
// 图片上传服务器地址
// const IMAGE_UPLOAD_SERVER = '';

// async function uploadImage(imageData, mimeType = 'image/png') {
//   const blob = new Blob([(new Uint8Array(imageData))], { type: mimeType });
//   const formdata = new FormData();
//   formdata.append('file', blob);
//   // do upload and the image src
//   return imageSrc;
// }

/**
 * 对图片应用各种过滤器
 * @param {ArrayBuffer} imageData 图片数据
 * @param {Array<Node>} filters 过滤器
 * @param {any} context 上下文
 */
async function applyImageFilters(imageData, filters = [], context) {
  const jimp = await import('jimp');
  const image = await jimp.read(imageData);

  for (let i = 0, len = filters.length; i < len; i++) {
    const filterNode = filters[i];
    const filterName = filterNode['#name'].slice(2);
    if (filterName === 'extLst') continue;
    switch (filterName) {
      // 灰阶处理
      case 'grayscl': {
        image.color([{ apply: 'greyscale', params: [] }]);
        break;
      }
      // TODO: Apply Bi-Level (Black/White) Effect
      // This element specifies a bi-level (black/white) effect.
      // Input colors whose luminance is less than the specified threshold value are changed to black.
      // Input colors whose luminance are greater than or equal the specified value are set to white.
      // The alpha effect values are unaffected by this effect.
      case 'biLevel': {
        // const threshold = get(filterNode, ['$', 'thresh']) / 100000;
        break;
      }
      // 透明度修改
      case 'alphaModFix': {
        const amount = get(filterNode, ['$', 'amt']) / 100000;
        image.opacity(1 - amount);
        break;
      }
      // 双色化
      case 'duotone': {
        const [clrNode1, clrNode2] = filterNode['$$'];
        const clr1 = tinycolor(parseColorNode(clrNode1, clrNode1['#name'], context)).toRgb();
        const clr2 = tinycolor(parseColorNode(clrNode2, clrNode2['#name'], context)).toRgb();
        image.color([{ apply: 'greyscale', params: [] }]);
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
          const ratio = image.bitmap.data[idx] / 255;
          image.bitmap.data[idx] = Math.floor(clr1.r + (clr2.r - clr1.r) * ratio);
          image.bitmap.data[idx + 1] = Math.floor(clr1.g + (clr2.g - clr1.g) * ratio);
          image.bitmap.data[idx + 2] = Math.floor(clr1.b + (clr2.b - clr1.b) * ratio);
        });
        break;
      }
      default:
        // eslint-disable-next-line no-console
        console.warn('missing image filter: ', filterName);
    }
  }

  return image.getBufferAsync('image/png');
}

export async function parseBlipFill(node, context) {
  const { zip, slideResObj, options } = context;
  const blipNode = get(node, ['a:blip']);
  const rID = get(blipNode, ['$', 'r:embed']);
  const filters = get(blipNode, '$$', []);
  const imgName = get(slideResObj, [rID, 'target']);
  const imgFileExt = getFileExtension(imgName);
  const mimeType = ({
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'emf': 'image/emf',
    'wmf': 'image/wmf',
  })[imgFileExt] || 'image/*';

  let imageBuffer = await zip.file(imgName).async('arraybuffer');

  // gif is not supported by jimp, so use it directly
  if (ENABLE_IMAGE_FILTER && filters.length && mimeType !== 'image/gif') {
    imageBuffer = await applyImageFilters(imageBuffer, filters, context);
  }

  const imageBlob = new Blob([(new Uint8Array(imageBuffer))], { type: mimeType });
  if (options.imageReader) { // call user defined image reading method
    const imageFile = new File([imageBlob], imgName);
    const imageSrc = await Promise.resolve(options.imageReader(imageFile));
    return imageSrc;
  } else { // fallback to use image dataURL
    const imageBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = evt => resolve(evt.target.result);
      reader.readAsDataURL(imageBlob);
    });
    return imageBase64;
  }

  // parse image fill type
  // const tileNode = get(node, ['a:tile']);
  // if (tileNode) {
  //   const { sx, sy } = get(tileNode, ['$'], {});
  //   const scaleX = sx ? sx / 100000 : 1;
  //   const scaleY = sy ? sy / 100000 : 1;
  //   image.resize(image.bitmap.width * scaleX, image.bitmap.height * scaleY);
  // }
}
