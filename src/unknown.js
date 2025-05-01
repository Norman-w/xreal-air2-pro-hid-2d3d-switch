

// 全局变量
let selectedDevice = null;
let deviceConnected = false;
let devices = [];
let controlInterfaceId = -1;
let interfaceFeatures = {};
let prefInterfaceMode = 'auto';

// XREAL眼镜的vendorId
const XREAL_VENDOR_ID = 0x3318;

// 记录上次接收到的报告
let lastReport = null;
let lastReportTimestamp = 0;

// 日志函数
function log(message, type = 'info') {
    const logArea = document.getElementById('logArea');
    const now = new Date();
    const timestamp = `[${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} ${now.getMilliseconds().toString().padStart(3, '0')}]`;

    const logLine = document.createElement('div');
    logLine.className = `log-${type}`;
    logLine.textContent = `${timestamp} ${message}`;

    logArea.appendChild(logLine);
    logArea.scrollTop = logArea.scrollHeight;

    // 如果日志太长，清理最老的条目
    while (logArea.children.length > 1000) {
        logArea.removeChild(logArea.firstChild);
    }
}

// 将字节数组转换为字符串
function payloadToStr(payload) {
    return new TextDecoder().decode(new Uint8Array(payload).filter(b => b !== 0));
}

// 十六进制字符串转字节数组
function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
}

// 初始化寄存器显示
function initRegisterDisplay() {
    const registerDisplay = document.getElementById('registerDisplay');
    registerDisplay.innerHTML = '';

    // 创建65个字节位置
    for (let i = 0; i < 65; i++) {
        const byteElement = document.createElement('div');
        byteElement.className = 'register-byte';
        if (importantBytes.includes(i)) {
            byteElement.classList.add('byte-important');
        }
        byteElement.id = `byte-${i}`;

        const addressElement = document.createElement('span');
        addressElement.className = 'register-byte-address';
        addressElement.textContent = `0x${i.toString(16).padStart(2, '0')}`;

        const valueElement = document.createElement('div');
        valueElement.className = 'register-byte-value';
        valueElement.textContent = '--';

        byteElement.appendChild(addressElement);
        byteElement.appendChild(valueElement);

        // 添加点击事件，显示描述
        byteElement.addEventListener('click', () => {
            highlightByte(i);
            showByteDescription(i);
        });

        registerDisplay.appendChild(byteElement);
    }
}

// 高亮显示选中的字节
function highlightByte(index) {
    // 移除所有高亮
    document.querySelectorAll('.register-byte').forEach(el => {
        el.classList.remove('highlight');
    });

    // 添加高亮到选中的字节
    const selectedByte = document.getElementById(`byte-${index}`);
    if (selectedByte) {
        selectedByte.classList.add('highlight');
    }
}

// 显示字节描述
function showByteDescription(index) {
    currentByteIndex = index; // 存储当前查看的字节索引

    const descriptionElement = document.getElementById('registerDescription');
    const description = registerDescriptions[index] || `未知功能 (位置: 0x${index.toString(16).padStart(2, '0')})`;

    let value = '--';
    if (lastReport && index < lastReport.length) {
        value = `0x${lastReport[index].toString(16).padStart(2, '0')} (${lastReport[index]})`;
    }

    descriptionElement.innerHTML = `
                <strong>位置: 0x${index.toString(16).padStart(2, '0')}</strong><br>
                <strong>当前值: ${value}</strong><br>
                <strong>可能的功能:</strong> ${description}
            `;

    // 显示历史值
    displayByteHistory(index);
}

// 显示字节的历史值
function displayByteHistory(byteIndex) {
    const historyDisplay = document.getElementById('historyDisplay');
    historyDisplay.innerHTML = '';

    if (reportHistory.length === 0) {
        historyDisplay.innerHTML = '<div class="history-placeholder">无历史数据</div>';
        return;
    }

    // 添加标题行
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.marginBottom = '5px';

    // 为每条历史记录创建一个项目
    for (let i = 0; i < reportHistory.length; i++) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        if (i > 0 && byteIndex < reportHistory[i].length && byteIndex < reportHistory[i-1].length &&
            reportHistory[i][byteIndex] !== reportHistory[i-1][byteIndex]) {
            historyItem.classList.add('changed');
        }

        // 添加索引标签
        const indexLabel = document.createElement('div');
        indexLabel.className = 'history-label';
        indexLabel.textContent = `记录${i+1}`;

        // 添加值
        const valueSpan = document.createElement('div');
        if (byteIndex < reportHistory[i].length) {
            valueSpan.textContent = reportHistory[i][byteIndex].toString(16).padStart(2, '0');
        } else {
            valueSpan.textContent = '--';
        }

        historyItem.appendChild(indexLabel);
        historyItem.appendChild(valueSpan);
        historyDisplay.appendChild(historyItem);
    }
}

// 更新寄存器显示
function updateRegisterDisplay(reportData) {
    if (!reportData) return;

    // 添加到历史记录
    addToHistory(reportData);

    // 获取设置状态
    const highlightChanges = document.getElementById('highlightChanges').checked;
    const fadeUnchanged = document.getElementById('fadeUnchanged').checked;

    for (let i = 0; i < Math.min(reportData.length, 65); i++) {
        const byteElement = document.getElementById(`byte-${i}`);
        if (byteElement) {
            const valueElement = byteElement.querySelector('.register-byte-value');
            if (valueElement) {
                // 更新值
                const hexValue = reportData[i].toString(16).padStart(2, '0');
                valueElement.textContent = hexValue;

                // 重置样式
                valueElement.classList.remove('byte-changed', 'byte-unchanged');

                // 比较与上一条记录的变化
                if (highlightChanges && reportHistory.length >= 2) {
                    const previousReport = reportHistory[reportHistory.length - 2];
                    if (i < previousReport.length && reportData[i] !== previousReport[i]) {
                        valueElement.classList.add('byte-changed');
                    }
                }

                // 检查是否长期不变
                if (fadeUnchanged && isUnchangedForLongTime(i)) {
                    valueElement.classList.add('byte-unchanged');
                }
            }
        }
    }
}

// 添加到历史记录，保持最多10条
function addToHistory(reportData) {
    // 复制数组以避免引用问题
    const dataCopy = new Uint8Array(reportData);
    reportHistory.push(dataCopy);

    // 保持最多10条记录
    if (reportHistory.length > 10) {
        reportHistory.shift();
    }

    // 如果当前有选中的字节，更新其历史显示
    if (currentByteIndex !== null) {
        displayByteHistory(currentByteIndex);
    }
}

// 检查字节是否长期不变（10条记录中都相同）
function isUnchangedForLongTime(byteIndex) {
    if (reportHistory.length < 2) return false;

    const latestValue = reportHistory[reportHistory.length - 1][byteIndex];

    // 检查历史记录中该字节是否都相同
    const allSame = reportHistory.every(report =>
        byteIndex < report.length && report[byteIndex] === latestValue
    );

    return allSame && reportHistory.length >= 10;
}

// 清除历史记录
function clearHistory() {
    reportHistory = [];
    log('已清空报告历史记录', 'info');

    // 刷新显示
    if (lastReport) {
        updateRegisterDisplay(lastReport);
    }
}

// 设置亮度
async function setBrightness(level) {
    log(`尝试设置亮度为 ${level}...`, 'info');
    const command = XREAL.buildBrightnessCommand(level, 0x0008);
    log(`亮度命令: ${Array.from(command.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ')}...`, 'info');
    await sendCommandToInterfaces(command);
}

// 测试所有亮度命令ID
async function testAllBrightnessIds() {
    const level = 5; // 使用最佳亮度级别
    log(`测试所有可能的亮度命令ID (亮度级别: ${level})...`, 'info');

    const commands = XREAL.buildMultiBrightnessCommands(level);

    // 逐个发送所有亮度命令
    for (let i = 0; i < commands.length; i++) {
        const msgIds = [0x0008, 0x0002, 0x0003, 0x0004];
        log(`尝试消息ID: 0x${msgIds[i].toString(16).padStart(4, '0')}`, 'info');
        await sendCommandToInterfaces(commands[i]);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    log(`所有亮度命令ID测试完成`, 'success');
}

// 模拟Nebula应用程序的模式切换行为
async function simulateNebulaModeSwitching() {
    log("模拟Nebula应用程序的模式切换序列...", 'info');

    try {
        // 步骤1: 可能的预备命令 - 系统准备
        log("步骤1: 发送系统准备命令...", 'info');

        // 发送SDK works命令作为初始化
        const sdkCmd = "SDK works".split('').map(c => c.charCodeAt(0));
        await sendCommandToInterfaces(sdkCmd);
        await new Promise(resolve => setTimeout(resolve, 100));

        // 发送可能的初始化命令，ID 0x0001
        const initCmd = XREAL.buildCommand([0x00], 0x0001);
        await sendCommandToInterfaces(initCmd);
        await new Promise(resolve => setTimeout(resolve, 100));

        // 步骤2: 可能的状态查询
        log("步骤2: 发送状态查询命令...", 'info');
        const statusCmd = XREAL.buildCommand([0x00], 0x0002);
        await sendCommandToInterfaces(statusCmd);
        await new Promise(resolve => setTimeout(resolve, 200));

        // 步骤3: 发送3D模式切换命令，使用模式类型4 (72Hz)
        log("步骤3: 发送3D模式切换命令 (72Hz)...", 'info');
        const mode3DCmd = XREAL.buildAdvanced3DCommand(4); // 72Hz高刷新率
        await sendCommandToInterfaces(mode3DCmd);
        await new Promise(resolve => setTimeout(resolve, 300));

        // 步骤4: 设置适当的亮度
        log("步骤4: 设置适当的亮度...", 'info');
        const brightnessCmd = XREAL.buildBrightnessCommand(5, 0x0008);
        await sendCommandToInterfaces(brightnessCmd);
        await new Promise(resolve => setTimeout(resolve, 200));

        // 步骤5: 发送显示更新/确认命令
        log("步骤5: 发送显示更新/确认命令...", 'info');
        const confirmCmd = XREAL.buildCommand([0x01, 0x00], 0x0003);
        await sendCommandToInterfaces(confirmCmd);
        await new Promise(resolve => setTimeout(resolve, 100));

        // 步骤6: 发送可能的通知/事件命令
        log("步骤6: 发送最终通知命令...", 'info');
        const notifyCmd = XREAL.buildCommand([0x03, 0x01], 0x0004);
        await sendCommandToInterfaces(notifyCmd);

        log("模拟Nebula应用程序的模式切换序列完成", 'success');
    } catch (error) {
        log(`模拟Nebula应用程序的模式切换序列失败: ${error.message}`, 'error');
    }
}

// 测试不同模式值
async function testModeValue(mode) {
    log(`测试模式值=${mode} (位置22)...`, 'info');
    const command = XREAL.buildCustomDisplayCommand({ mode: mode });
    log(`模式值=${mode}的命令: ${Array.from(command.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ')}...`, 'info');
    await sendCommandToInterfaces(command);
}

// 测试不同子模式值
async function testSubModeValue(subMode) {
    log(`测试子模式值=${subMode} (位置23)...`, 'info');
    const command = XREAL.buildCustomDisplayCommand({ mode: 3, subMode: subMode });
    log(`子模式值=${subMode}的命令: ${Array.from(command.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ')}...`, 'info');
    await sendCommandToInterfaces(command);
}

// 测试不同刷新率值
async function testRefreshRate(rate) {
    log(`测试刷新率=${rate}Hz...`, 'info');
    // 将十进制Hz值转换为十六进制
    const rateHex = rate & 0xFF;
    const command = XREAL.buildCustomDisplayCommand({
        mode: 3,
        subMode: 3,
        refresh: rateHex
    });
    log(`刷新率=${rate}Hz (0x${rateHex.toString(16).padStart(2, '0')})的命令: ${Array.from(command.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ')}...`, 'info');
    await sendCommandToInterfaces(command);
}

// 测试不同参数组合
async function testParameterCombo(options) {
    log(`测试参数组合: ${JSON.stringify(options)}...`, 'info');
    const command = XREAL.buildCustomDisplayCommand(options);
    log(`参数组合命令: ${Array.from(command.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ')}...`, 'info');
    await sendCommandToInterfaces(command);
}

// 测试不同消息ID
async function testMessageId(msgId) {
    log(`测试消息ID=0x${msgId.toString(16).padStart(4, '0')}...`, 'info');
    const command = XREAL.buildCustomDisplayCommand({
        msgId: msgId,
        mode: 3  // 3D模式
    });
    log(`消息ID=0x${msgId.toString(16).padStart(4, '0')}的命令: ${Array.from(command.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ')}...`, 'info');
    await sendCommandToInterfaces(command);
}

// 测试不同分辨率参数
async function testResolutionParams(param1, param2) {
    log(`测试分辨率参数=${param1},${param2}...`, 'info');
    const command = XREAL.buildCustomDisplayCommand({
        mode: 3,
        param1: param1,
        param2: param2
    });
    log(`分辨率参数=${param1},${param2}的命令: ${Array.from(command.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ')}...`, 'info');
    await sendCommandToInterfaces(command);
}

// 使用高级命令切换到72Hz高刷新率3D模式
async function switchTo3D72Hz() {
    log("尝试切换到72Hz高刷新率3D模式...", 'info');
    const command = XREAL.buildAdvanced3DCommand(4); // 传入4表示72Hz高刷新率3D模式
    log(`72Hz高刷新率3D模式命令: ${Array.from(command.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ')}...`, 'info');
    await sendCommandToInterfaces(command);

    // 自动设置最佳亮度
    await setOptimalBrightnessFor3D(5); // 对于高刷新率，可能需要略高的亮度
}

// 使用高级命令切换到120Hz低分辨率高刷新率3D模式
async function switchTo3D120Hz() {
    log("尝试切换到120Hz低分辨率高刷新率3D模式...", 'info');

    // 使用120Hz低分辨率3D模式的最佳参数组合
    // 模式=2，子模式=4，刷新率=120Hz (0x78)
    const command = XREAL.buildCustomDisplayCommand({
        msgId: 0x0008,
        mode: 2,  // 低分辨率3D模式
        subMode: 4, // 测试发现子模式=4效果最好
        param1: 2,  // 低分辨率参数
        param2: 0x1C, // 显示参数
        refresh: 0x78, // 120Hz刷新率
        length: 0x18  // 24字节
    });

    log(`120Hz低分辨率3D模式命令: ${Array.from(command.slice(0, 30)).map(b => b.toString(16).padStart(2, '0')).join(' ')}...`, 'info');
    await sendCommandToInterfaces(command);

    // 自动设置最佳亮度
    await setOptimalBrightnessFor3D(5); // 经测试亮度5级效果最佳
}
