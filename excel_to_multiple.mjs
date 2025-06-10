import fs from 'fs';
import path from 'path';
import xlxs from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const input_dir = path.join(__dirname, 'inputFiles');
const input_excel_file = path.join(input_dir, 'all-translations-updated.xlsx');
const output_dir = path.join(__dirname, 'outputFiles');

const projectList = ['admin', 'app', 'merchant'];
const langConfig = {
  admin: { fileNameList: ['en-US', 'zh-CN'], format: 'js' },
  app: { fileNameList: ['en', 'zh', 'fr'], format: 'json' },
  merchant: { fileNameList: ['en-US', 'zh-CN', 'fr-FR'], format: 'js' }
};

// 已完成的项目列表
const completedList = new Set();
// 从文件中提取的数据
//  [...{
//     Key: 'dashboard.overview.balance',
//     File: 'dashboard',
//     Platform: 'merchant',
//     Category: 'dashboard',
//     'zh-CN': '账户余额 ({currency})',
//     'en-US': 'Account Balance ({currency})',
//     'fr-FR': 'Solde du compte ({currency})'
//   }]
const allTranslation = {
  admin: {},
  app: {},
  merchant: {}
};
// 翻译文件分组
const translationGroup = {
  admin: {},
  app: {},
  merchant: {}
}; // {category:{en:{...key1:value1}, zh:{}, fr:{}}}
// 读取excel 数据
const workbook = xlxs.readFile(input_excel_file);
const sheetNameList = workbook.SheetNames.slice(1);

const getExcelData = () => {
  for (const index in sheetNameList) {
    const sheetName = sheetNameList[index];
    const worksheet = workbook.Sheets[sheetName];
    allTranslation[sheetName] = xlxs.utils.sheet_to_json(worksheet, { header: 0 });
  }
};

// app 是json文件zh,en,fr; admin js文件 zh-CN, en-US single quote; merchant js文件 en-US, zh-CN, fr-FR, double quote
const main = async () => {
  getExcelData();
  for (const platform of projectList) {
    const jsonData = allTranslation[platform];

    for (const row of jsonData) {
      const key = row['Key'];
      const fileName = row['File'];
      const project = row['Platform'];
      const zhTranslation = row['zh-CN'];
      const enTranslation = row['en-US'];
      const frTranslation = row['fr-FR'] ?? '';

      if (project !== platform) {
        continue;
      } // admin等platform不一致的时候不要执行
      if (!translationGroup[platform][fileName]) {
        translationGroup[platform][fileName] = { en: {}, zh: {}, fr: {} };
      }
      // if (!translationGroup?.zhGroup[fileName]) {
      //   translationGroup?.zhGroup[fileName] = {};
      // }
      // if (!enGroup[fileName]) {
      //   enGroup[fileName] = {};
      // }
      // if (!frGroup[fileName]) {
      //   frGroup[fileName] = {};
      // }
      // translationGroup?.zhGroup[fileName][key] = zhTranslation;
      translationGroup[platform][fileName]['en'][key] = enTranslation;
      translationGroup[platform][fileName]['zh'][key] = zhTranslation;
      translationGroup[platform][fileName]['fr'][key] = frTranslation;
    }
    genOutputFile(platform);
  }
};

const genOutputFile = (platform) => {
  const fileConfig = langConfig[platform];
  const { fileNameList, format } = fileConfig;
  const output_platform_file = path.join(output_dir, platform);
  if (fileNameList?.length > 0) {
    for (const [fileName, translationValue] of Object.entries(translationGroup[platform])) {
      const en_file_path = path.join(output_platform_file, platform === 'app' ? 'en' : 'en-US');
      if (!fs.existsSync(en_file_path)) {
        fs.mkdirSync(en_file_path, { recursive: true });
      }
      const zh_file_path = path.join(output_platform_file, platform === 'app' ? 'zh' : 'zh-CN');
      if (!fs.existsSync(zh_file_path)) {
        fs.mkdirSync(zh_file_path, { recursive: true });
      }
      const fr_file_path = path.join(output_platform_file, platform === 'app' ? 'fr' : 'fr-FR');
      if (!fs.existsSync(fr_file_path)) {
        fs.mkdirSync(fr_file_path, { recursive: true });
      }
      const en_target_file_path = path.join(en_file_path, `${fileName}.${format}`);
      const zh_target_file_path = path.join(zh_file_path, `${fileName}.${format}`);
      const fr_target_file_path = path.join(fr_file_path, `${fileName}.${format}`);
      let enContent = '';
      let zhContent = '';
      let frContent = '';
      if (format === 'js') {
        enContent = `export default {${{ ...translationValue['en'] }}}`;
        zhContent = `export default {${{ ...translationValue['zh'] }}}`;
        frContent = `export default {${{ ...translationValue['fr'] }}}`;
      } else {
        enContent = JSON.stringify(translationValue['en']);
        zhContent = JSON.stringify(translationValue['zh']);
        frContent = JSON.stringify(translationValue['fr']);
      }
      fs.writeFileSync(en_target_file_path, enContent, 'utf-8');
      console.log('file', fileName, 'generated at path', en_target_file_path);
      fs.writeFileSync(zh_target_file_path, zhContent, 'utf-8');
      console.log('file', fileName, 'generated at path', zh_target_file_path);
      fs.writeFileSync(fr_target_file_path, frContent, 'utf-8');
      console.log('file', fileName, 'generated at path', fr_target_file_path);
    }
  }
};
main();
