const fs = require('fs');
const path = require('path');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const xlsx = require('xlsx');

const input_dir = path.join(__dirname, 'inputFiles');
const inputExcelFile = path.join(input_dir, 'pos_translation.xlsx');
const output_dir = path.join(__dirname, 'outputFiles');

const language = [
  {
    lang: 'en',
    columnName: '中文'
  },
  {
    lang: 'zh',
    columnName: '英文'
  },
  {
    lang: 'fr',
    columnName: '法语'
  }
];
// 读取excel文件
const workbook = xlsx.readFile(inputExcelFile);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }); // header: 1表示第一行为表头

// 获取表头
const headers = jsonData[0]; //   [ '关键词', '英文', '中文', '法语' ]
const dataRow = jsonData.slice(1); // [ 'app_name', 'AlphaPay', 'AlphaPay', 'AlphaPay' ].... ,
language.forEach((langConfig) => {
  const { lang, columnName } = langConfig;
  const outputFileName = path.join(output_dir, `string_${lang}.xml`);
  const strings = [];
  // 查找对应关键词和翻译的列索引
  const keyColumnIndex = headers.indexOf('关键词');
  const langColumnIndex = headers.indexOf(columnName);
  // 获取翻译数据
  if (keyColumnIndex !== -1 || langColumnIndex !== -1) {
    dataRow.forEach((row) => {
      const key = row[keyColumnIndex];
      const value = row[langColumnIndex];
      if (key && value) {
        strings.push({
          name: key,
          '#text': value
        });
      }
    });
    // builder XML
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      attributeNamePrefix: ''
    });
    const xmlContent = builder.build({
      resources: {
        string: strings
      }
    });

    fs.writeFileSync(outputFileName, '<?xml version="1.0" encoding="utf-8" ?>\n' + xmlContent);
    console.log('成功创建', outputFileName);
  } else {
    console.log('出错了，', keyColumnIndex, 'or', langColumnIndex, 'not found in excel');
  }
});
