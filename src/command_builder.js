import {calculateCRC32} from "./utils.js";

/**
 * 构造完整的命令包，与官方库_cmd_build函数兼容
 * @param {Array|Uint8Array} cmdData - 实际命令数据
 * @param {number} msgId - 消息ID，默认为1
 * @param {number} seqNum - 序列号，默认为随机值
 * @return {Uint8Array} - 构造好的完整命令包
 */
function buildCommand(cmdData, msgId = 0x0001, seqNum = null) {
    // 创建64字节的缓冲区(与官方大小一致)
    const buffer = new Uint8Array(64);
    buffer.fill(0);

    // 设置命令头
    buffer[0] = 0xFD;

    // 设置随机序列号(位置7-10)，如果未提供则生成随机值
    if (seqNum === null) {
        seqNum = Math.floor(Math.random() * 0xFFFFFFFF);
    }
    buffer[7] = seqNum & 0xFF;
    buffer[8] = (seqNum >> 8) & 0xFF;
    buffer[9] = (seqNum >> 16) & 0xFF;
    buffer[10] = (seqNum >> 24) & 0xFF;

    // 设置消息ID (位置15-16)
    buffer[15] = msgId & 0xFF;
    buffer[16] = (msgId >> 8) & 0xFF;

    // 基本数据长度(头部长度)
    let length = 0x11;

    // 复制实际命令数据到位置22起
    if (cmdData && cmdData.length > 0) {
        for (let i = 0; i < cmdData.length; i++) {
            buffer[22 + i] = cmdData[i];
        }
        length += cmdData.length;
    }

    // 设置长度字段
    buffer[5] = length & 0xFF;
    buffer[6] = (length >> 8) & 0xFF;

    // 计算CRC
    const crc = calculateCRC32(buffer.slice(5), length);
    buffer[1] = crc & 0xFF;
    buffer[2] = (crc >> 8) & 0xFF;
    buffer[3] = (crc >> 16) & 0xFF;
    buffer[4] = (crc >> 24) & 0xFF;

    return buffer;
}

/**
 * 构造2D模式命令
 * @return {Uint8Array} - 完整的2D模式命令
 */
function build2DCommand() {
    // 2D模式实际命令数据: 01 01 0B
    return buildCommand([0x01, 0x01, 0x0B]);
}

/**
 * 构造3D模式命令
 * @return {Uint8Array} - 完整的3D模式命令
 */
function build3DCommand() {
    // 3D模式实际命令数据: 01 03 B4
    // 根据用户日志分析，此命令可能需要经过特殊处理
    // 注意：从逆向分析发现，可能需要添加特定的消息ID或特定序列结构

    // 创建一个带有完整标准格式的3D命令
    let commandData = buildCommand([0x01, 0x03, 0xB4]);

    // 设置命令类型为控制命令
    commandData[14] = 0x01; // 可能用于标识为控制命令

    // 确保命令ID是正确的，根据逆向工程分析的显示模式设置命令ID
    // 可尝试不同消息ID: 0x0001, 0x0008 或 0x0102
    commandData[15] = 0x01;
    commandData[16] = 0x00;

    // 重新计算CRC校验，因为我们修改了数据
    // 设置长度字段(应当与原长度相同，但为了安全起见重新设置)
    const length = 0x11 + 3; // 基础长度 + 数据长度
    commandData[5] = length & 0xFF;
    commandData[6] = (length >> 8) & 0xFF;

    // 重新计算CRC
    const crc = calculateCRC32(commandData.slice(5), length);
    commandData[1] = crc & 0xFF;
    commandData[2] = (crc >> 8) & 0xFF;
    commandData[3] = (crc >> 16) & 0xFF;
    commandData[4] = (crc >> 24) & 0xFF;

    return commandData;
}

/**
 * 构造使用消息ID 0x0008的3D模式命令
 * 经过测试确认，消息ID 0x0008是控制眼镜显示模式的关键命令
 * 该ID可能与亮度控制共用，但使用不同的值可以切换2D/3D显示模式
 *
 * @param {number} mode - 显示模式值：
 *   - 1 = 2D模式 (1920×1080单屏显示)
 *   - 3 = 3D模式 (3840×1080分离式SBS显示)
 * @return {Uint8Array} - 构造好的模式控制命令
 */
function build3DCommandWithID8(mode = 3) {
    // 确保模式值只能是1(2D模式)或3(3D模式)
    if (mode !== 1 && mode !== 3) {
        console.warn(`警告: 无效的模式值 ${mode}，只支持1(2D)或3(3D)，已自动使用默认值3(3D模式)`);
        mode = 3;
    }

    // 构造基本命令结构
    const buffer = new Uint8Array(64);
    buffer.fill(0);

    // 设置基本字段
    buffer[0] = 0xFD;  // 命令头标识

    // 设置随机序列号
    const seqNum = Math.floor(Math.random() * 0xFFFFFFFF);
    buffer[7] = seqNum & 0xFF;
    buffer[8] = (seqNum >> 8) & 0xFF;
    buffer[9] = (seqNum >> 16) & 0xFF;
    buffer[10] = (seqNum >> 24) & 0xFF;

    // 设置消息ID为0x0008（显示模式控制）
    buffer[15] = 0x08;
    buffer[16] = 0x00;

    // 设置长度字段(0x12表示18字节 = 头部17字节 + 数据1字节)
    buffer[5] = 0x12;
    buffer[6] = 0x00;

    // 设置模式值到位置22
    buffer[22] = mode;

    // 计算CRC校验，确保命令有效
    const crc = calculateCRC32(buffer.slice(5), 0x12);
    buffer[1] = crc & 0xFF;
    buffer[2] = (crc >> 8) & 0xFF;
    buffer[3] = (crc >> 16) & 0xFF;
    buffer[4] = (crc >> 24) & 0xFF;

    return buffer;
}


/**
 * 构造完整的3D模式命令（备用版本）
 * 使用日志中观察到的成功命令格式
 * @return {Uint8Array} - 备用版本的3D模式命令
 */
function buildAlternate3DCommand() {
    // 根据日志中的成功命令格式构建
    // 如用户日志中的：fd af 21 2d c5 14 00 eb 8e 76 72 00 00 00 00 01 00 00 00 00 00 00 01 03 b4 00...
    const buffer = new Uint8Array(64);
    buffer.fill(0);

    // 设置基本字段
    buffer[0] = 0xFD;  // 头部标识

    // 设置随机序列号
    const seqNum = Math.floor(Math.random() * 0xFFFFFFFF);
    buffer[7] = seqNum & 0xFF;
    buffer[8] = (seqNum >> 8) & 0xFF;
    buffer[9] = (seqNum >> 16) & 0xFF;
    buffer[10] = (seqNum >> 24) & 0xFF;

    // 设置长度字段(0x14表示20字节)
    buffer[5] = 0x14;
    buffer[6] = 0x00;

    // 设置消息类型
    buffer[15] = 0x01;
    buffer[16] = 0x00;

    // 设置3D模式数据 (01 03 b4)
    buffer[22] = 0x01;
    buffer[23] = 0x03;
    buffer[24] = 0xB4;

    // 计算CRC
    const crc = calculateCRC32(buffer.slice(5), 0x14);
    buffer[1] = crc & 0xFF;
    buffer[2] = (crc >> 8) & 0xFF;
    buffer[3] = (crc >> 16) & 0xFF;
    buffer[4] = (crc >> 24) & 0xFF;

    return buffer;
}

/**
 * 构造亮度控制命令
 * @param {number} level - 亮度级别(0-8)
 * @param {number} msgId - 消息ID，尝试不同值寻找正确的ID
 * @return {Uint8Array} - 亮度控制命令
 */
function buildBrightnessCommand(level, msgId = 0x0008) {
    // 确保亮度值在0-8范围内
    level = Math.max(0, Math.min(8, Math.floor(level)));

    // 构造基本命令结构，根据逆向分析测试不同消息ID
    const buffer = new Uint8Array(64);
    buffer.fill(0);

    // 设置基本字段
    buffer[0] = 0xFD;

    // 设置随机序列号
    const seqNum = Math.floor(Math.random() * 0xFFFFFFFF);
    buffer[7] = seqNum & 0xFF;
    buffer[8] = (seqNum >> 8) & 0xFF;
    buffer[9] = (seqNum >> 16) & 0xFF;
    buffer[10] = (seqNum >> 24) & 0xFF;

    // 设置消息ID为亮度控制命令ID
    buffer[15] = msgId & 0xFF;
    buffer[16] = (msgId >> 8) & 0xFF;

    // 设置长度字段(0x12表示18字节 = 头部17字节 + 数据1字节)
    buffer[5] = 0x12;
    buffer[6] = 0x00;

    // 设置亮度值
    buffer[22] = level;

    // 计算CRC
    const crc = calculateCRC32(buffer.slice(5), 0x12);
    buffer[1] = crc & 0xFF;
    buffer[2] = (crc >> 8) & 0xFF;
    buffer[3] = (crc >> 16) & 0xFF;
    buffer[4] = (crc >> 24) & 0xFF;

    return buffer;
}

/**
 * 尝试使用不同的消息ID构造亮度命令
 * 根据Hopper反汇编的函数名，尝试不同的ID以寻找正确的命令
 * @param {number} level - 亮度级别
 * @return {Array<Uint8Array>} - 一组不同消息ID的亮度命令
 */
function buildMultiBrightnessCommands(level) {
    // 尝试多个可能的消息ID
    return [
        buildBrightnessCommand(level, 0x0008),  // 常见控制命令ID
        buildBrightnessCommand(level, 0x0002),  // 亮度可能单独使用一个ID
        buildBrightnessCommand(level, 0x0003),  // 从SetLightIntensity函数推测
        buildBrightnessCommand(level, 0x0004)   // 从SetBrightness函数推测
    ];
}

/**
 * 构造高级3D模式命令，支持不同的刷新率和分辨率选项
 * 基于固件中发现的多种显示模式选项：
 * - "1&2D_1080": 1920×1080@60Hz (标准2D模式)
 * - "3&3D_1080": 3840×1080@60Hz (标准3D模式)
 * - "4&3D_1080#72": 3840×1080@72Hz (高刷新率3D模式)
 * - "2&3D_540": 3840×540@120Hz (低分辨率高刷新率3D模式)
 *
 * @param {number} modeType - 显示模式类型:
 *   - 1: 2D模式 (1920×1080@60Hz)
 *   - 3: 标准3D模式 (3840×1080@60Hz)
 *   - 4: 高刷新率3D模式 (3840×1080@72Hz)
 *   - 2: 低分辨率高刷新率3D模式 (3840×540@120Hz)
 * @return {Uint8Array} - 构造好的高级显示模式控制命令
 */
function buildAdvanced3DCommand(modeType = 3) {
    // 验证模式类型
    if (![1, 2, 3, 4].includes(modeType)) {
        console.warn(`警告: 无效的模式类型 ${modeType}，只支持1、2、3、4，已自动使用默认值3`);
        modeType = 3;
    }

    // 构造基本命令结构
    const buffer = new Uint8Array(64);
    buffer.fill(0);

    // 设置基本字段
    buffer[0] = 0xFD;  // 命令头标识

    // 设置随机序列号
    const seqNum = Math.floor(Math.random() * 0xFFFFFFFF);
    buffer[7] = seqNum & 0xFF;
    buffer[8] = (seqNum >> 8) & 0xFF;
    buffer[9] = (seqNum >> 16) & 0xFF;
    buffer[10] = (seqNum >> 24) & 0xFF;

    // 设置消息ID为0x0008（显示模式控制）
    buffer[15] = 0x08;
    buffer[16] = 0x00;

    // 扩展命令长度至24字节（头部17字节 + 数据7字节）以容纳更多参数
    buffer[5] = 0x18; // 24字节
    buffer[6] = 0x00;

    // 设置显示模式类型到位置22
    buffer[22] = modeType;

    // 添加扩展参数
    // 不同的模式类型可能需要不同的附加参数
    switch(modeType) {
        case 1: // 2D模式
            buffer[23] = 0x01; // 可能的2D子模式
            buffer[24] = 0x01; // 分辨率参数1
            buffer[25] = 0x0B; // 分辨率参数2 (从固件字符串中发现)
            break;
        case 3: // 标准3D模式
            buffer[23] = 0x01; // 可能的3D子模式
            buffer[24] = 0x03; // 分辨率参数1
            buffer[25] = 0xB4; // 分辨率参数2 (从固件字符串中发现)
            break;
        case 4: // 高刷新率3D模式 (72Hz)
            buffer[23] = 0x03; // 可能指示刷新率(72Hz)
            buffer[24] = 0x03; // 分辨率参数1
            buffer[25] = 0xB4; // 分辨率参数2
            buffer[26] = 0x48; // 刷新率72Hz (0x48=72)
            break;
        case 2: // 低分辨率高刷新率3D模式
            buffer[23] = 0x04; // 可能指示刷新率(120Hz)
            buffer[24] = 0x02; // 分辨率参数1 (低分辨率)
            buffer[25] = 0x1C; // 分辨率参数2 (猜测值)
            buffer[26] = 0x78; // 刷新率120Hz (0x78=120)
            break;
    }

    // 计算CRC校验，确保命令有效
    const crc = calculateCRC32(buffer.slice(5), 0x18); // 使用24字节长度
    buffer[1] = crc & 0xFF;
    buffer[2] = (crc >> 8) & 0xFF;
    buffer[3] = (crc >> 16) & 0xFF;
    buffer[4] = (crc >> 24) & 0xFF;

    return buffer;
}

/**
 * 构建自定义显示模式命令
 * 允许完全自定义所有参数以测试不同组合
 *
 * @param {Object} options - 命令选项
 * @param {number} options.msgId - 消息ID (如0x0008)
 * @param {number} options.mode - 主要模式值 (位置22的值)
 * @param {number} options.subMode - 子模式/附加参数1 (位置23的值)
 * @param {number} options.param1 - 分辨率参数1 (位置24的值)
 * @param {number} options.param2 - 分辨率参数2 (位置25的值)
 * @param {number} options.refresh - 刷新率参数 (位置26的值)
 * @param {number} options.length - 命令数据长度 (默认0x18=24)
 * @return {Uint8Array} - 构造好的命令
 */
export function buildCustomDisplayCommand(options) {
    const defaults = {
        msgId: 0x0008, //TODO  这个好像也不知道咋回事, 这个设置为0x0004的时候屏幕亮度会变低
        mode: 3,  // 3D模式   TODO  这里并不是之前测试的那样, 1 3 5的时候都是标准模式 4的时候是眼镜在单独的3840*1080的模式(拓展)但是频闪很厉害.要检查这个包实际上发出了什么
        subMode: 1,
        param1: 3,
        param2: 0xB4,
        refresh: 0,
        length: 0x18  // 24字节
    };

    // 合并默认选项和用户提供的选项
    const config = { ...defaults, ...options };

    // 构造基本命令结构
    const buffer = new Uint8Array(64);
    buffer.fill(0);

    // 设置基本字段
    buffer[0] = 0xFD;  // 命令头标识

    // 设置随机序列号
    const seqNum = Math.floor(Math.random() * 0xFFFFFFFF);
    buffer[7] = seqNum & 0xFF;
    buffer[8] = (seqNum >> 8) & 0xFF;
    buffer[9] = (seqNum >> 16) & 0xFF;
    buffer[10] = (seqNum >> 24) & 0xFF;

    // 设置消息ID
    buffer[15] = config.msgId & 0xFF;
    buffer[16] = (config.msgId >> 8) & 0xFF;

    // 设置长度字段
    buffer[5] = config.length & 0xFF;
    buffer[6] = (config.length >> 8) & 0xFF;

    // 设置主要模式参数
    buffer[22] = config.mode;

    // 设置附加参数
    if (config.length > 0x12) {
        buffer[23] = config.subMode;

        if (config.length > 0x13) {
            buffer[24] = config.param1;

            if (config.length > 0x14) {
                buffer[25] = config.param2;

                if (config.length > 0x15) {
                    buffer[26] = config.refresh;
                }
            }
        }
    }

    // 计算CRC校验
    const crc = calculateCRC32(buffer.slice(5), config.length);
    buffer[1] = crc & 0xFF;
    buffer[2] = (crc >> 8) & 0xFF;
    buffer[3] = (crc >> 16) & 0xFF;
    buffer[4] = (crc >> 24) & 0xFF;

    return buffer;
}