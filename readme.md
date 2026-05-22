# Windows 11 色彩配置文件 (ICC/ICM) 内部名称修改指南

在 Windows 11 中，系统在加载和显示色彩配置文件（`.icc` 或 `.icm`）时，读取的是文件内部的元数据描述（`desc` 标签），而不是文件系统中的文件名。这导致直接重命名文件后，系统色彩管理中显示的依然是旧名字。

本工具提供了一个轻量级的 Node.js 脚本，直接通过底层二进制读写重构 ICC 文件，帮助您一键修改配置文件的内部显示名称。

---

## 🛠️ 环境准备

本工具基于 Node.js 编写，运行前请确保您的电脑上已安装 Node.js。

- **检查是否安装**：打开命令行终端（CMD 或 PowerShell），输入以下命令检查版本：
  ```bash
  node -v
  ```
- **下载与安装**：如未安装，请前往 [Node.js 官网 (nodejs.org)](https://nodejs.org/) 下载并安装长期支持版 (LTS)。

---

## 🚀 使用方法

### 1. 基础命令语法

在终端中定位到当前工具目录，运行以下格式的命令：

```bash
node modify_icc_name.js <ICC文件路径> <新配置名称>
```

### 2. 详细使用示例

若要将同目录下的 `CSO076D-6500-light.icc` 的内部配置名称修改为 `CSO076D-6500`，请在终端执行：

```bash
node modify_icc_name.js ./CSO076D-6500-light.icc CSO076D-6500
```

### 3. 运行效果与备份机制

当您运行脚本后：
- **安全备份**：脚本会在同目录下自动生成一个 `.bak.icc` 备份文件（如 `CSO076D-6500-light.bak.icc`），用于保护原始数据，防止意外损坏。
- **二进制修改**：脚本会直接对目标 `.icc` 文件的二进制块进行重构，完成修改后终端会输出成功提示：
  ```text
  [备份] 原始文件已备份至: C:\Users\yudon\Downloads\Colorfix-ideapad-S540-13-main\CSO076D-6500-light.bak.icc
  [成功] 已成功将内部配置名称修改为: "CSO076D-6500"
  [成功] 输出路径: C:\Users\yudon\Downloads\Colorfix-ideapad-S540-13-main\CSO076D-6500-light.icc
  ```

---

## 💻 如何在 Windows 11 中加载并应用

修改完成后，请按照以下步骤将新的校色配置应用到您的显示器中：

1. **打开色彩管理**：
   按下快捷键 `Win + R`，输入 `colorcpl` 并回车。
2. **选择显示设备**：
   在 **设备 (Devices)** 下拉菜单中，选中您需要应用校色文件的显示器。
3. **启用自定义设置**：
   勾选 **“使用我对此设备的设置” (Use my settings for this device)**。
4. **添加修改后的文件**：
   - 点击底部的 **添加 (Add...)** 按钮。
   - 点击左下角的 **浏览 (Browse...)** 按钮。
   - 找到并选中您修改好的 [CSO076D-6500-light.icc](file:///C:/Users/yudon/Downloads/Colorfix-ideapad-S540-13-main/CSO076D-6500-light.icc) 文件。
5. **设为默认**：
   此时在配置文件列表中会正确显示新名称 **`CSO076D-6500`**。选中它，点击 **设为默认配置文件 (Set as Default Profile)** 即可。
