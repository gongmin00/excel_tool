// const fs = require('fs');
// const path = require('path');
// const xlsx = require('xlsx');
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 把i18n定义的翻译locale文件转为excel文件
 * i18n文件结构为
 * inputFiles
 * ├── en-US
 * │   └── ...
 * ├── zh-CN
 * │   └── ...
 * │   └── dashboard.js
 * ├── en-US.js
 * ├── zh-CN.js
 */
const input_dir = path.join(__dirname, 'inputFiles');
const output_dir = path.join(__dirname, 'outputFiles');
const output_excel_file = path.join(output_dir, 'merchant_translation.xlsx');
// 获取文件入口文件en-US.js和zh-CN.js
const entryFiles = fs
  .readdirSync(input_dir)
  .filter((file) => file !== '.keep' && file !== '.DS_Store' && fs.statSync(path.join(input_dir, file)).isFile());

const allTranslation = {}; // { key: { 'en-US': 'value', 'zh-CN': 'value' } }
const extractKeyRecursively = (fileContentObj, langCode) => {
  for (const key in fileContentObj) {
    if (Object.hasOwnProperty.call(fileContentObj, key)) {
      // const currentKey = key;
      const currentValue = fileContentObj[key];
      // 是否为空
      if (!allTranslation[key]) {
        allTranslation[key] = {};
      }
      // 不是nested Obj
      if (typeof currentValue !== 'object') {
        allTranslation[key][langCode] = currentValue;
      }
      if (typeof currentValue === 'object') {
        extractKeyRecursively(currentValue, langCode);
      }
    }
  }
};
const processFile = async (file) => {
  const langCode = path.basename(file, '.js');
  const filePath = path.join(input_dir, file);
  try {
    const fileContent = await import(filePath);
    if (fileContent && typeof fileContent === 'object') {
      await extractKeyRecursively(fileContent, langCode);
    }
  } catch (error) {
    console.log('加载文件错误', error);
  }
};

// {key:{en:"", zh:""}}
const main = async () => {
  for (const file of entryFiles) {
    await processFile(file);
  }
  const header = ['key', 'zh-CN', 'en-US'];
  const rows = Object.keys(allTranslation).map((i18nKey) => {
    const singleRow = { key: i18nKey };
    header.slice(1).forEach((langCode) => {
      singleRow[langCode] = allTranslation[i18nKey][langCode];
    });
    return singleRow;
  });
  const worksheet = xlsx.utils.json_to_sheet(rows, { header });
  worksheet['!cols'] = 100;
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Translation');
  xlsx.writeFile(workbook, output_excel_file);
  console.log('成功导出文件');
};
main();
