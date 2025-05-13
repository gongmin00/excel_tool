import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

/**
 * 把i18n定义的翻译locale文件转为excel文件
 * json文件结构为
 * inputFiles
 * ├── fr
 * │   └── ...
 * │   └── tabs.json
 * │   └── translations.js json入口文件
 * ├── en
 * │   └── ...
 * │   └── tabs.json
 * │   └── translations.js json入口文件
 * ├── zh
 * │   └── ...
 * │   └── tabs.json
 * │   └── translations.js json入口文件
 * ├── i18n.js
 * */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const input_dir = path.join(__dirname, 'inputFiles');
const output_dir = path.join(__dirname, 'outputFiles');
const languageList = ['zh', 'fr', 'en'];
const output_excel_path = path.join(output_dir, 'alphapay-app-translation.xlsx');

const getFileContent = async (lang) => {
  const langDir = path.join(input_dir, lang);
  try {
    const jsonFiles = fs.readdirSync(langDir).filter((file) => file !== 'translations.js');
    for (const json of jsonFiles) {
      const jsonPath = path.join(langDir, json);
      const jsonData = JSON.parse(fs.readFileSync(jsonPath));
      for (const key in jsonData) {
        if (!allTranslation[key]) {
          allTranslation[key] = {};
        }
        allTranslation[key][lang] = jsonData[key];
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${lang}:`, error);
  }
};
const allTranslation = {};
const headers = ['关键词', '中文', '法语', '英语'];
const rowKeys = ['key', 'zh', 'fr', 'en'];
const main = async () => {
  for (const lang of languageList) {
    allTranslation[lang] = {};
    await getFileContent(lang); // 获取JSON数据
  }
  const rows = Object.keys(allTranslation)?.map((i18nKey) => {
    const singleRow = { key: i18nKey };
    rowKeys.slice(1).forEach((langCode) => {
      singleRow[langCode] = allTranslation[i18nKey][langCode];
    });
    return singleRow;
  });
  const worksheet = xlsx.utils.json_to_sheet(rows, { headers });
  worksheet['!cols'] = 100;
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'app_translations');
  xlsx.writeFile(workbook, output_excel_path);
  console.log('成功导出excel文件');
};
main();
