# PPTX Parser

A parser transforming pptx file into html string, running in the browser.

## Usage

```javascript
(async () => {
  const file = new ArrayBuffer();
  const parser = new Parser();
  const slides = await parser.parse(file);
})()
```

## Options

```javascript
new Parser({
  /**
   * Custom image reading method to handle images in the file.
   * You can read as dataUrl to inline images or upload to a server.
  */
  imageReader: File => Promise<string>,
});
```

## Methods

### parse(file: ArrayBuffer): Promise

Parse the input file typed ArrayBuffer and return a promise which resolves as the following:

```javascript
Array<{
  /** slide size */
  size: { width: Number, height: Number },
  /** slide notes html */
  notes: String,
  /** slide animation timeline object */
  animation: Object,
  /** slide content html */
  html: String,
}>
```
