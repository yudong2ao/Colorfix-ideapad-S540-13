#!/usr/bin/env node

/**
 * ICC 色彩配置文件内部描述名称修改工具 (升级版 - 严格 4 字节对齐重构)
 * 支持命令行参数：node modify_icc_name.js <file_path> <new_name>
 */

const fs = require('fs');
const path = require('path');

// 解析命令行参数
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('使用方法:');
  console.log('  node modify_icc_name.js <ICC文件路径> <新配置名称>');
  console.log('示例:');
  console.log('  node modify_icc_name.js ./CSO076D-6500-light.icc CSO076D-6500');
  process.exit(1);
}

const targetIccPath = path.resolve(args[0]);
const newProfileName = args[1];

if (!fs.existsSync(targetIccPath)) {
  console.error(`错误: 找不到文件 "${targetIccPath}"`);
  process.exit(1);
}

try {
  // 备份原文件
  const ext = path.extname(targetIccPath);
  const backupPath = targetIccPath.replace(new RegExp(`${ext}$`), `.bak${ext}`);
  fs.copyFileSync(targetIccPath, backupPath);
  console.log(`[备份] 原始文件已备份至: ${backupPath}`);

  // 修改并严格 4 字节对齐重构 ICC 内部描述
  reconstructIccWithStrictAlignment(backupPath, targetIccPath, newProfileName);
  console.log(`[成功] 已成功将内部配置名称修改为: "${newProfileName}"`);
  console.log(`[成功] 输出路径: ${targetIccPath}`);
} catch (error) {
  console.error('[失败] 修改过程中发生错误:', error.message);
  process.exit(1);
}

function reconstructIccWithStrictAlignment(inputPath, outputPath, newName) {
  const buffer = fs.readFileSync(inputPath);
  const tagCount = buffer.readUInt32BE(128);

  // 1. 读取原文件的所有 tag 数据
  const tags = [];
  let descTagIndex = -1;

  for (let i = 0; i < tagCount; i++) {
    const offset = 132 + i * 12;
    const tagSig = buffer.toString('ascii', offset, offset + 4);
    const tagOffset = buffer.readUInt32BE(offset + 4);
    const tagSize = buffer.readUInt32BE(offset + 8);
    
    // 提取 tag 原始数据
    const tagData = Buffer.alloc(tagSize);
    buffer.copy(tagData, 0, tagOffset, tagOffset + tagSize);

    tags.push({
      sig: tagSig,
      size: tagSize,
      data: tagData
    });

    if (tagSig === 'desc') {
      descTagIndex = i;
    }
  }

  if (descTagIndex === -1) {
    throw new Error("未在 ICC 文件中找到 desc 标签。");
  }

  // 2. 构建新的 desc tag 数据 (v2 textDescriptionType)
  const asciiName = newName;
  const asciiLen = asciiName.length + 1; // 包含 \0

  const header = Buffer.alloc(12);
  header.write('desc', 0, 'ascii');
  header.writeUInt32BE(0, 4); // 保留
  header.writeUInt32BE(asciiLen, 8); // ASCII 长度
  
  const asciiBuf = Buffer.alloc(asciiLen);
  asciiBuf.write(asciiName, 0, 'ascii');
  
  const uniLangCode = Buffer.alloc(4); // 0
  const uniLen = Buffer.alloc(4);
  uniLen.writeUInt32BE(asciiLen, 0); // Unicode 字符数
  
  const uniBuf = Buffer.alloc(asciiLen * 2);
  for (let j = 0; j < asciiName.length; j++) {
    uniBuf.writeUInt16BE(asciiName.charCodeAt(j), j * 2);
  }
  uniBuf.writeUInt16BE(0, asciiName.length * 2); // 写入末尾 \0\0
  
  const macScriptCode = Buffer.alloc(2); // 0
  const macLen = Buffer.alloc(1); // 0
  const macBuf = Buffer.alloc(67); // 67 字节 0 填充
  
  let newDescData = Buffer.concat([
    header,
    asciiBuf,
    uniLangCode,
    uniLen,
    uniBuf,
    macScriptCode,
    macLen,
    macBuf
  ]);

  // 对新 desc 标签做 4 字节边界对齐
  const alignPadding = (4 - (newDescData.length % 4)) % 4;
  if (alignPadding > 0) {
    newDescData = Buffer.concat([newDescData, Buffer.alloc(alignPadding)]);
  }

  // 用新数据替换 tags 数组中的 desc 数据并更新大小
  tags[descTagIndex].data = newDescData;
  tags[descTagIndex].size = newDescData.length;

  // 3. 重构并拼装新二进制流
  let outBuffer = Buffer.alloc(buffer.length * 2);
  
  // 复制原文件头部 132 字节（包括文件头和 tag count）
  buffer.copy(outBuffer, 0, 0, 132);

  // 标签数据写入的起始偏移
  let currentDataOffset = 132 + tagCount * 12;

  // 4 字节对齐紧凑写入所有 Tag
  for (let i = 0; i < tagCount; i++) {
    const tag = tags[i];
    
    // 强制当前数据写入偏移对齐到 4 字节边界
    currentDataOffset = (currentDataOffset + 3) & ~3;
    
    // 重写 Tag Table 中的条目
    const tableOffset = 132 + i * 12;
    outBuffer.write(tag.sig, tableOffset, 4, 'ascii');
    outBuffer.writeUInt32BE(currentDataOffset, tableOffset + 4);
    outBuffer.writeUInt32BE(tag.size, tableOffset + 8);
    
    // 拷贝数据内容
    tag.data.copy(outBuffer, currentDataOffset);
    
    currentDataOffset += tag.size;
  }

  // 4. 更新文件头部声明的 Profile Size
  const finalFileSize = currentDataOffset;
  outBuffer.writeUInt32BE(finalFileSize, 0);

  // 截断输出文件
  const finalBuffer = outBuffer.slice(0, finalFileSize);
  fs.writeFileSync(outputPath, finalBuffer);
}
