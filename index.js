const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const xlsx = require('xlsx');

const input_dir = path.join(__dirname, 'inputFiles');
const output_dir = path.join(__dirname, 'outputFiles');
const xmlFiles = [
  {
    lang: 'en',
    fileName: 'en_strings.xml'
  },
  {
    lang: 'zh',
    fileName: 'zh_strings.xml'
  },
  {
    lang: 'fr',
    fileName: 'fr_strings.xml'
  }
];
const allKeys = new Set();
const translation = {}; // { key1: { en: '', zh: '', fr: '' }, key2: {} }

const parser = new XMLParser({
  ignoreAttributes: false, // 确保能获取到 <string name="..."> 中比如name的属性
  attributeNamePrefix: '' // 不要在key之前加前缀
});
xmlFiles.forEach((item) => {
  const filePath = path.join(input_dir, item?.fileName);
  const xmlData = fs.readFileSync(filePath, 'utf8');

  const jsonObj = parser.parse(xmlData);
  const strings = jsonObj?.resources.string;
  if (!strings) {
    console.log('源文件没有内容！！！');
    return;
  }
  const stringArray = Array.isArray(strings) ? strings : [strings];
  stringArray.forEach((str) => {
    const key = str.name;
    const value = str['#text'];
    allKeys.add(key);
    if (!translation[key]) translation[key] = {};
    translation[key][item.lang] = value;
  });
});

// 转换成excel sheet
const rows = Object.entries(translation).map(([key, value]) => ({
  关键词: key,
  英文: value.en || '',
  中文: value.zh || '',
  法语: value.fr || ''
}));
const worksheet = xlsx.utils.json_to_sheet(rows);
worksheet['!cols'] = [
  { wch: 30 }, // 关键词列宽
  { wch: 40 }, // 英文列宽
  { wch: 40 }, // 中文列宽
  { wch: 40 } // 法语列宽
];
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, 'Translation');
const outputPath = path.join(output_dir, 'pos_translation.xlsx');
xlsx.writeFile(workbook, outputPath);

console.log('excel 文件已生成');
