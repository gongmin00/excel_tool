import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';

//  多个项目转换为多个excel sheet
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const input_dir = path.join(__dirname, 'inputFiles');
const output_dir = path.join(__dirname, 'outputFiles');
const output_excel_path = path.join(output_dir, 'all-translation.xlsx');
if (!fs.existsSync(output_dir)) {
  fs.mkdirSync(output_dir, { recursive: true });
}

// 项目列表
const projectList = ['admin', 'merchant', 'app'];
// 已完成的项目列表
const completedProjList = new Set();
// 从文件中提取的数据
// {key:{zh-CN:xxx, en-US:xxx, fr-FR:xxx, category:xxx,}}
const allTranslation = {
  admin: {},
  app: {},
  merchant: {}
};
// excel 配置
const workbook = xlsx.utils.book_new();
const headers = ['key', 'category', 'zh-CN', 'en-US', 'fr-FR'];

// 递归函数，获取单个.js或者.json文件里面是数据
const extractKeyRecursively = (contentObj, projectName, langCode, category) => {
  const fileObj = {};
  for (const localeKey in contentObj) {
    if (Object.hasOwnProperty.call(contentObj, localeKey)) {
      const value = contentObj[localeKey];
      if (!allTranslation[projectName][localeKey]) {
        allTranslation[projectName][localeKey] = {};
      }
      // if (!fileObj[localeKey]) {
      //   fileObj[localeKey] = {};
      // }
      if (typeof value === 'object') {
        // const nestedObj = extractKeyRecursively(value, projectName, langCode, category);
        // Object.assign(fileObj, nestedObj);
        extractKeyRecursively(value, projectName, langCode, category);
      }
      if (typeof value !== 'object') {
        allTranslation[projectName][localeKey]['category'] = category;
        allTranslation[projectName][localeKey][langCode] = value;
        // fileObj[localeKey]['category'] = category;
        // fileObj[localeKey][langCode] = value;
      }
    }
  }
  // return fileObj;
};
const processData = async (allFilePaths, projectName, langCode) => {
  if (allFilePaths?.length === 0) return;
  for (const file of allFilePaths) {
    const fileName = file?.fileName;
    const category = file?.category;
    const fullPath = file?.fullPath;
    const ext = path.extname(fileName);
    let fileContent = {};
    if (ext === '.js') {
      const content = await import(fullPath);
      fileContent = content.default;
    }

    if (ext === '.json') {
      const content = fs.readFileSync(fullPath, 'utf-8');
      fileContent = JSON.parse(content);
    }
    if (fileContent && typeof fileContent === 'object') {
      extractKeyRecursively(fileContent, projectName, langCode, category);
    }
  }
};
// 递归函数,遍历localePath下所有子目录，收集符合条件的js和json文件
const walkDir = async (localPath, filePaths = []) => {
  const contentNames = fs.readdirSync(localPath);
  for (const dirname of contentNames) {
    const fullPath = path.join(localPath, dirname);
    if (dirname === '.DS_Store') {
      continue;
    }
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        await walkDir(fullPath, filePaths);
      }
      if (stats.isFile() && (dirname.endsWith('.js') || dirname.endsWith('.json'))) {
        filePaths.push({ category: path.basename(dirname, path.extname(dirname)), fullPath, fileName: dirname });
      }
    } catch (error) {
      console.log(error);
    }
  }
  return filePaths;
};
// 处理文件转换主函数
const convertProjectData = async (projectName) => {
  console.log('\n正在转换文件:', projectName);
  const projectPath = path.join(input_dir, projectName);
  if (!fs.existsSync(projectPath)) {
    console.error('错误！不存在改项目路径');
    return;
  }
  try {
    const localeFileName = fs.readdirSync(projectPath).filter((file) => file !== '.DS_Store');
    if (localeFileName?.length === 0) {
      console.warn(projectPath, '目录下没有任何语言文件, 跳过处理');
    }
    for (const localeName of localeFileName) {
      const localPath = path.join(projectPath, localeName);
      const allFilePaths = await walkDir(localPath);
      await processData(allFilePaths, projectName, localeName);
    }
  } catch (error) {
    console.log(error);
  }
};
// 转换为excel
const convertToExcel = async (projectName) => {
  const contentObj = allTranslation[projectName];
  const rows = Object.keys(contentObj)?.map((key) => {
    const nestedObj = contentObj[key];
    const singleRow = { key };
    headers.slice(1).forEach((header) => {
      singleRow[header] = nestedObj[header];
    });
    return singleRow;
  });
  const worksheet = xlsx.utils.json_to_sheet(rows, { headers });
  worksheet['!cols'] = 200;
  xlsx.utils.book_append_sheet(workbook, worksheet, projectName);
};
// 项目主函数
const main = async () => {
  let continueConvert = true;
  while (continueConvert) {
    const availableProject = projectList.filter((proj) => !completedProjList.has(proj));
    if (availableProject?.length === 0) {
      console.log('\n所有项目都已经转换为excel了!');
      continueConvert = false;
      break;
    }
    const choices = availableProject?.map((p) => ({
      name: p,
      value: p
    }));
    const questions = [
      {
        type: 'list',
        name: 'selectedProject',
        message: '请选择一个要转换的文件夹',
        choices: choices
      },
      {
        type: 'confirm',
        name: 'confirmConversion',
        message: '确认要转换这个文件夹吗？',
        default: true
      }
    ];
    const answers = await inquirer.prompt(questions);
    if (answers.confirmConversion) {
      // 转换input_file内容为allTranslation
      await convertProjectData(answers.selectedProject);
      const projectObjLen = Object.keys(allTranslation[answers.selectedProject]).length;
      // 转换为excel内容
      await convertToExcel(answers.selectedProject);
      if (projectObjLen > 0) {
        completedProjList.add(answers.selectedProject);
      }
    } else {
      console.log('转换已取消');
    }
    if (completedProjList?.size < projectList?.length) {
      const continueQuestion = [
        {
          type: 'confirm',
          name: 'continueChoice',
          message: '您想继续转换其他文件夹吗？',
          default: true
        }
      ];
      const continueAnswer = await inquirer.prompt(continueQuestion);
      continueConvert = continueAnswer?.continueChoice;
    } else {
      continueConvert = false;
    }
  }
  xlsx.writeFile(workbook, output_excel_path);
  console.log('\n完成所有文件导出');
};
main();
