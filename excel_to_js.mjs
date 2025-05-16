import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// input files
const input_dir = path.join(__dirname, 'InputFiles');
const input_excel_file = path.join(input_dir, 'merchant_translation.xlsx');
// output file
const output_dir = path.join(__dirname, 'outputFiles');
const output_files_path = path.join(output_dir, 'fr-FR');
// reference file
const refer_file = path.join(input_dir, 'zh-CN');
const refer_file_list = fs.readdirSync(refer_file).filter((file) => file.endsWith('.js'));
const ref_file_map = {};
// 确保输出目录存在
if (!fs.existsSync(output_files_path)) {
  fs.mkdirSync(output_files_path);
}

const languageList = [
  {
    lang: 'zh-CN',
    column: '中文'
  },
  {
    lang: 'en-US',
    column: '英文'
  },
  {
    lang: 'fr-FR',
    column: '法语'
  }
];
// 读取excel文件
const workbook = xlsx.readFile(input_excel_file);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }); // header: 1表示第一行为表头

// 转换excel_to_json文件为键值对映射
const extractJsonToMap = () => {
  const translationMap = {};
  for (const row of jsonData) {
    if (row && row?.length >= 4) {
      const key = row[0];
      const frValue = row[3];
      if (key && frValue) {
        translationMap[key] = frValue;
      }
    }
  }
  return translationMap;
};
// 读取zh-CN文件结果作为参照,并生成对应的fr对象
const genFrObjRecursively = (fileContent, frTranslationMap) => {
  const tempFrObj = {};
  for (const key in fileContent) {
    if (Object.hasOwnProperty.call(fileContent, key)) {
      const zhValue = fileContent[key];
      if (zhValue && typeof zhValue !== 'object') {
        tempFrObj[key] = frTranslationMap[key];
      } else {
        tempFrObj[key] = genFrObjRecursively(zhValue, frTranslationMap);
      }
    }
  }
  return tempFrObj;
};
// 获取fr文件对象，生成对应的法语js文件
const processRefFiles = async (frTranslationMap) => {
  for (const file of refer_file_list) {
    const fileKey = file.replace('.js', '');
    const ref_file_path = path.join(refer_file, file);
    try {
      const { default: ref_file_content } = await import(ref_file_path);
      if (ref_file_content && typeof ref_file_content === 'object') {
        const fr_obj = genFrObjRecursively(ref_file_content, frTranslationMap);
        const fr_file_path = path.join(output_files_path, file);
        const fr_file_content = `export default ${JSON.stringify(fr_obj, null, 2)}`;
        fs.writeFile(fr_file_path, fr_file_content, 'utf8', (err) => {
          if (err) {
            console.log('generated: ', fr_file_path, 'failed', err);
          }
        });
        console.log('generated: ', fr_file_path, 'successfully');
      }
    } catch (error) {
      console.log('获取ref_file_content出错了', error);
    }
  }
};
const main = async () => {
  const frTranslationMap = extractJsonToMap();
  await processRefFiles(frTranslationMap);
};
main();
